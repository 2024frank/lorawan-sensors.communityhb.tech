export type SensorStatus = "online" | "offline" | "never" | "disabled";

export type SensorHealth = {
  status: SensorStatus;
  expectedIntervalMinutes: number;
  offlineAfterMinutes: number;
  missedUplinks: number | null;
};

const DEFAULT_INTERVAL_MINUTES = 60;

export function intervalMinutes(value: unknown, fallback = DEFAULT_INTERVAL_MINUTES): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.min(1440, Math.round(parsed)));
}

export function offlineAfterMinutes(expectedIntervalMinutes: unknown): number {
  // The reporting interval is the health deadline. If a new uplink has not
  // arrived before that interval elapses, the sensor is offline.
  return intervalMinutes(expectedIntervalMinutes);
}

export function sensorHealth(
  lastSeenAt: string | null | undefined,
  expectedIntervalMinutes: unknown,
  enabled = true,
  now = Date.now(),
): SensorHealth {
  const expected = intervalMinutes(expectedIntervalMinutes);
  const offlineAfter = offlineAfterMinutes(expected);
  if (!enabled) {
    return { status: "disabled", expectedIntervalMinutes: expected, offlineAfterMinutes: offlineAfter, missedUplinks: null };
  }
  if (!lastSeenAt) {
    return { status: "never", expectedIntervalMinutes: expected, offlineAfterMinutes: offlineAfter, missedUplinks: null };
  }
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) {
    return { status: "never", expectedIntervalMinutes: expected, offlineAfterMinutes: offlineAfter, missedUplinks: null };
  }
  const ageMinutes = Math.max(0, (now - seen) / 60_000);
  return {
    status: ageMinutes < offlineAfter ? "online" : "offline",
    expectedIntervalMinutes: expected,
    offlineAfterMinutes: offlineAfter,
    missedUplinks: Math.max(0, Math.floor(ageMinutes / expected)),
  };
}

export function cadenceConfirmation(
  rows: Array<{ time?: string; data?: unknown }>,
  requestedAt: string,
  requestedMinutes: number,
): { confirmedAt: string; matchingIntervals: number } | null {
  const requestedMs = new Date(requestedAt).getTime();
  const expectedMs = intervalMinutes(requestedMinutes) * 60_000;
  if (!Number.isFinite(requestedMs)) return null;

  const timestamps = [...new Set(rows
    .map(row => ({ iso: row.time ?? "", ms: new Date(row.time ?? "").getTime() }))
    .filter(row => Number.isFinite(row.ms) && row.ms >= requestedMs)
    .sort((a, b) => a.ms - b.ms)
    .map(row => `${row.ms}|${row.iso}`))]
    .map(value => {
      const separator = value.indexOf("|");
      return { ms: Number(value.slice(0, separator)), iso: value.slice(separator + 1) };
    })
    .slice(-24);

  // Three matching gaps (four telemetry uplinks) are enough to confirm the
  // physical cadence when a vendor decoder does not expose its config report.
  // Short alarm/event uplinks are ignored; they are not evidence either way.
  const minimumGap = Math.max(1_000, expectedMs * 0.7);
  const maximumGap = expectedMs * 1.3 + 5_000;
  let matchingIntervals = 0;
  let confirmedAt = "";
  for (let index = 1; index < timestamps.length; index++) {
    const gap = timestamps[index].ms - timestamps[index - 1].ms;
    if (gap >= minimumGap && gap <= maximumGap) {
      matchingIntervals += 1;
      confirmedAt = timestamps[index].iso;
    }
  }
  return matchingIntervals >= 3 ? { confirmedAt, matchingIntervals } : null;
}
