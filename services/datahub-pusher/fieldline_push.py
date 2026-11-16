"""
LoRaWAN console -> Community Hub Data Hub uploader.

The file, service, log prefix and FIELDLINE_STORE setting keep the product's old
name so the server running this needs no changes.

Contract: docs.communityhub.cloud/guides/sources/fieldline-lorawan
  POST <CH_UPLOAD_URL>
  headers: org-token (per organization), device-token (per sensor)
  body:    CSV, first column Timestamp, RFC3339 UTC, one row per minute

Design notes that come straight from the spec, so they are not negotiable:
  - Rows go oldest to most recent, within a file and across files.
  - Wait for a success response before sending the next file for that device;
    on failure resend the SAME file after five minutes. Each file is
    all-or-nothing, so a partial write can never happen.
  - Data Hub stores one value per variable per minute. We truncate seconds and
    collapse duplicates within a minute, LAST value wins, rather than leaving
    it to row order.
  - Ordering is tracked per device, so devices upload independently.
  - Replaying already-sent rows is safe (repeat writes nothing, still 200), so
    an ambiguous timeout costs nothing and we simply resend.

Reads readings directly from the datastore SQLite (mounted read-only) because
its HTTP API caps at 2000 rows newest-first, which is the wrong shape for a
chronological backfill. Device tokens come from the backend's JSON store.
"""
import csv, io, json, os, sqlite3, time
import urllib.request, urllib.error
from datetime import datetime, timezone

UPLOAD_URL = os.environ.get("CH_UPLOAD_URL", "").strip()
ORG_TOKEN  = os.environ.get("CH_ORG_TOKEN", "").strip()
READINGS_DB = os.environ.get("READINGS_DB", "/readings/readings.db")
STORE_PATH  = os.environ.get("FIELDLINE_STORE", "/backend/fieldline.json")
CURSOR_PATH = os.environ.get("CURSOR_PATH", "/data/fieldline-cursors.json")
MAX_ROWS    = int(os.environ.get("CH_MAX_ROWS", "10000"))   # spec limit per file
MAX_COLS    = int(os.environ.get("CH_MAX_COLS", "500"))
INTERVAL    = int(os.environ.get("CH_INTERVAL", "60"))
RETRY_AFTER = int(os.environ.get("CH_RETRY_AFTER", "300"))  # spec: five minutes
STALL_AFTER = int(os.environ.get("CH_STALL_AFTER", "3600"))  # warn loudly after an hour stuck

def log(*a): print("[fieldline-push]", *a, flush=True)

def load_json(path, default):
    try:
        with open(path) as f: return json.load(f)
    except Exception: return default

def save_cursors(c):
    tmp = CURSOR_PATH + ".tmp"
    with open(tmp, "w") as f: json.dump(c, f, indent=1)
    os.replace(tmp, CURSOR_PATH)

def device_tokens() -> dict:
    """devEui -> deviceToken, from the backend's store (single source of truth)."""
    store = load_json(STORE_PATH, {})
    return {t["devEui"].lower(): t["token"] for t in (store.get("deviceTokens") or [])}

def minute_utc(ts: str) -> str:
    """Any stored timestamp -> RFC3339 UTC truncated to the minute."""
    s = ts.replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
    dt = dt.astimezone(timezone.utc).replace(second=0, microsecond=0)
    return dt.strftime("%Y-%m-%dT%H:%M:00+00:00")

def fetch_rows(eui: str, cursor: str, limit: int):
    """Chronological rows strictly after the cursor."""
    con = sqlite3.connect(f"file:{READINGS_DB}?mode=ro", uri=True)
    try:
        return con.execute(
            "SELECT ts, data FROM readings "
            "WHERE dev_eui=? AND ts > ? AND data IS NOT NULL AND data <> '' AND data <> '{}' "
            "ORDER BY ts ASC LIMIT ?",
            (eui, cursor, limit),
        ).fetchall()
    finally:
        con.close()

# Device-info and config-echo fields. Sensors emit these once at boot or in reply
# to a downlink, never as ongoing telemetry. Sending them as CSV columns makes
# Data Hub create variables that are permanently empty (the AM308 showed 17
# variables of which 7 could never have data). Identity belongs in the metadata
# endpoint, not the measurement feed.
NON_TELEMETRY = {
    "sn", "ipso_version", "hardware_version", "firmware_version", "tsl_version",
    "lorawan_class", "device_status", "protocol_version", "power_status",
    "oem_id", "product_sn", "device_type", "reset_event",
    # downlink acknowledgements echoed back by Milesight decoders
    "reboot", "report_status", "report_interval", "reporting_type",
    "clear_current_cumulative", "alarm_report_counts", "alarm_report_interval",
    "buzzer_status", "current_alarm_config", "temperature_alarm_config",
}

def build_csv(rows):
    """-> (csv_text, columns, raw_max_ts, minute_count). Last value in a minute wins."""
    by_minute, raw_max = {}, ""
    for ts, blob in rows:
        try: data = json.loads(blob)
        except Exception: continue
        if not isinstance(data, dict) or not data: continue
        m = minute_utc(ts)
        slot = by_minute.setdefault(m, {})
        for k, v in data.items():
            if v is None or k in NON_TELEMETRY: continue
            slot[k] = v          # later row in the same minute overwrites
        raw_max = max(raw_max, ts)
    if not by_minute:
        return None, [], raw_max, 0
    cols = sorted({k for v in by_minute.values() for k in v})[:MAX_COLS]
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(["Timestamp"] + cols)
    for m in sorted(by_minute):                      # oldest to most recent
        vals = by_minute[m]
        w.writerow([m] + ["" if vals.get(c) is None else vals.get(c, "") for c in cols])
    return buf.getvalue(), cols, raw_max, len(by_minute)

# Transient on their side: worth retrying immediately rather than parking the
# device for the full backoff. A single 502 once left a sensor with no data in
# Data Hub for hours, which is the failure this exists to prevent.
TRANSIENT = {0, 429, 500, 502, 503, 504}

def _post_once(device_token: str, body: str):
    req = urllib.request.Request(
        UPLOAD_URL, data=body.encode("utf-8"), method="POST",
        headers={"Content-Type": "text/csv",
                 "org-token": ORG_TOKEN,
                 "device-token": device_token})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read(800).decode(errors="replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read(800).decode(errors="replace")
    except Exception as ex:
        return 0, str(ex)

def post(device_token: str, body: str, attempts: int = 3):
    """Send, retrying transient errors with a short escalating pause."""
    delay = 5
    status, text = 0, ""
    for i in range(1, attempts + 1):
        status, text = _post_once(device_token, body)
        if status not in TRANSIENT:
            return status, text
        if i < attempts:
            log(f"  transient HTTP {status}, retry {i}/{attempts - 1} in {delay}s")
            time.sleep(delay)
            delay *= 3
    return status, text

def pass_once(cursors: dict):
    tokens = device_tokens()
    if not tokens:
        log("no device tokens in the backend store yet"); return
    now = time.time()
    for eui, dtoken in tokens.items():
        state = cursors.setdefault(eui, {"ts": "", "retryAt": 0})
        if now < state.get("retryAt", 0):
            continue                                  # honouring the five-minute backoff
        rows = fetch_rows(eui, state["ts"], MAX_ROWS)
        if not rows:
            continue
        body, cols, raw_max, minutes = build_csv(rows)
        if not body:
            state["ts"] = raw_max or state["ts"]; save_cursors(cursors); continue
        status, text = post(dtoken, body)
        if status == 200:
            state["ts"] = raw_max
            state["retryAt"] = 0
            state["fails"] = 0
            state["lastOkAt"] = now
            save_cursors(cursors)
            # Log what the server says it actually STORED. A 200 with rowsRecorded=0
            # on a non-replay would be a silent failure, so surface it rather than
            # trusting the status code alone.
            try:
                j = json.loads(text)
                recd, recv, skip = j.get("rowsRecorded"), j.get("rowsReceived"), j.get("rowsSkipped")
                latest = j.get("latestTimestamp")
            except Exception:
                recd = recv = skip = latest = None
            log(f"{eui}: sent {minutes} minute-rows, {len(cols)} cols -> 200 "
                f"received={recv} recorded={recd} skipped={skip} latest={latest}")
            # A success where nothing was stored and nothing was skipped means the
            # rows went nowhere. Say so plainly rather than trusting the 200.
            if recv and not recd and not skip:
                log(f"WARNING {eui}: {recv} rows accepted but neither recorded nor "
                    f"skipped, and latest={latest}. Data may not be landing.")
        else:
            # Any failure: keep the cursor, resend the identical file after five minutes.
            state["retryAt"] = now + RETRY_AFTER
            state["fails"] = state.get("fails", 0) + 1
            save_cursors(cursors)
            log(f"{eui}: {minutes} rows -> HTTP {status}: {text.strip()[:200]} (retry in {RETRY_AFTER}s)")
            # Loud, greppable line when a sensor has been unable to deliver for a
            # long stretch. This is what tells us a device is stranded instead of
            # us noticing it visually in Data Hub days later.
            stalled_for = now - state.get("lastOkAt", now)
            if state["fails"] >= 3 or stalled_for > STALL_AFTER:
                log(f"STALLED {eui}: {state['fails']} consecutive failures, "
                    f"{stalled_for/60:.0f} min since last success, {minutes} rows waiting")

if __name__ == "__main__":
    if not UPLOAD_URL or not ORG_TOKEN:
        log("CH_UPLOAD_URL / CH_ORG_TOKEN not set; idling")
    log(f"start; url={UPLOAD_URL or 'UNSET'} interval={INTERVAL}s max_rows={MAX_ROWS}")
    cursors = load_json(CURSOR_PATH, {})
    while True:
        try:
            if UPLOAD_URL and ORG_TOKEN:
                pass_once(cursors)
        except Exception as ex:
            log("pass error:", ex)
        time.sleep(INTERVAL)
