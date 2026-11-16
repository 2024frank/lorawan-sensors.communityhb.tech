"use client";

import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
// The console schools sign in to. Set NEXT_PUBLIC_APP_URL when building, like NEXT_PUBLIC_API_BASE.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://your-app-domain";

type Org = { id: string; name: string; createdAt: string; users: number };
type Me = { email: string; name: string; platformAdmin?: boolean };
type Operator = { id: string; name: string; email: string; builtIn?: boolean };

// Where the operator's sign-in is kept in the browser. Before the product was
// renamed these keys started with "fieldline_"; moveLegacyKeys() moves a saved
// sign-in to the new keys once, so the rename doesn't sign anyone out.
const TOKEN_KEY = "lorawan_operator_token";
const ME_KEY = "lorawan_operator_me";
const LEGACY_KEYS: [string, string][] = [["fieldline_operator_token", TOKEN_KEY], ["fieldline_operator_me", ME_KEY]];

function moveLegacyKeys() {
  try {
    for (const [old, key] of LEGACY_KEYS) {
      const value = localStorage.getItem(old);
      if (value === null) continue;
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
      localStorage.removeItem(old);
    }
  } catch {
    // Storage is full or blocked: nothing to move.
  }
}

function tempPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return "Welcome-" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function req(path: string, token: string | null, init: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: string }).error || `HTTP ${r.status}`);
  return data;
}

const card = "rounded-[1.25rem] border border-line bg-paper p-6";
const input = "h-12 w-full rounded-[0.75rem] border border-[var(--control-border)] bg-paper px-4 text-base text-ink outline-none focus:border-leaf focus:ring-3 focus:ring-[color-mix(in_srgb,var(--leaf)_22%,transparent)]";
const label = "mb-2 block text-[0.875rem] font-semibold text-ink";
const btn = "inline-flex min-h-12 items-center justify-center rounded-full bg-lime px-6 text-base font-semibold text-on-lime transition-colors hover:bg-lime-deep disabled:opacity-45";
const btnGhost = "inline-flex min-h-10 items-center rounded-full border border-[color-mix(in_srgb,var(--pine)_22%,transparent)] bg-paper px-4 text-[0.9375rem] font-semibold text-pine transition-colors hover:bg-field disabled:opacity-45";

function Header({ me, onLogout }: { me: Me | null; onLogout: () => void }) {
  return (
    <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <img src="/icon-lorawan.svg" alt="" width={36} height={36} className="size-9 shrink-0"/>
        <div className="font-brand leading-none">
          <p className="text-[1.1875rem] font-bold tracking-[-0.01em] text-pine">LoRaWAN <span className="text-leaf">Operator</span></p>
          <p className="mt-1 text-[0.8125rem] font-bold text-leaf">by Community Hub</p>
        </div>
      </div>
      {me && <div className="flex items-center gap-3 text-[0.9375rem] text-muted">{me.email}<button className={btnGhost} onClick={onLogout}>Sign out</button></div>}
    </header>
  );
}

function Login({ onToken }: { onToken: (t: string, me: Me) => void }) {
  const [email, setEmail] = useState("you@example.com");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const d = await req("/auth/login", null, { method: "POST", body: JSON.stringify({ email, password }) }) as { token: string; user: Me & { mustChangePassword?: boolean } };
      if (!d.user.platformAdmin) throw new Error("This console is for platform operators only.");
      if (d.user.mustChangePassword) throw new Error(`First set your own password in the main app: ${APP_URL}`);
      onToken(d.token, d.user);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className={`${card} mx-auto mt-16 max-w-sm`}>
      <h1 className="mb-1 text-[1.75rem] leading-tight tracking-[-0.026em]">Operator sign in</h1>
      <p className="mb-6 text-[0.9375rem] text-muted">For the people who set up organizations and their accounts.</p>
      <label className={label}>Email</label>
      <input className={input} value={email} onChange={e => setEmail(e.target.value)} autoComplete="username"/>
      <label className={`${label} mt-4`}>Password</label>
      <input className={input} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/>
      {err && <p role="alert" className="mt-4 rounded-[0.75rem] bg-danger-soft p-3 text-[0.9375rem] text-danger">{err}</p>}
      <button className={`${btn} mt-5 w-full`} disabled={busy || !password}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

function Result({ r, onClose }: { r: { title: string; email: string; tempPassword?: string; emailSent?: boolean; emailError?: string }; onClose: () => void }) {
  return (
    <div className="mt-4 rounded-[1rem] bg-success-soft p-5 text-[0.9375rem]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-pine">{r.title}</p>
          <p className="mt-2 text-muted">Login: <span className="font-mono">{r.email}</span></p>
          {r.tempPassword && <p className="text-muted">Temporary password: <span className="font-mono font-bold">{r.tempPassword}</span></p>}
          <p className="mt-2 text-xs text-muted">
            {r.emailSent ? "✓ Welcome email delivered — they have everything they need." :
              r.emailError ? `Email failed (${r.emailError}) — hand them the login above yourself.` :
              "No email sent — hand them the login above yourself."}
          </p>
        </div>
        <button className={btnGhost} onClick={onClose}>Dismiss</button>
      </div>
    </div>
  );
}

export default function OperatorConsole() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [err, setErr] = useState("");
  // create-org form
  const [org, setOrg] = useState({ name: "", adminName: "", adminEmail: "", sendEmail: true });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ title: string; email: string; tempPassword: string; emailSent?: boolean; emailError?: string } | null>(null);
  // add-user form (per org)
  const [userOrg, setUserOrg] = useState<string | null>(null);
  const [nu, setNu] = useState({ name: "", email: "", role: "viewer", sendEmail: true });
  // operators
  const [ops, setOps] = useState<Operator[]>([]);
  const [no, setNo] = useState({ name: "", email: "", sendEmail: true });

  const loadOrgs = useCallback(async (t: string) => {
    try {
      setOrgs(((await req("/orgs", t)) as { items: Org[] }).items);
      setOps(((await req("/operators", t)) as { items: Operator[] }).items);
      setErr("");
    }
    catch (e) { setErr((e as Error).message); }
  }, []);

  useEffect(() => {
    moveLegacyKeys();
    const t = localStorage.getItem(TOKEN_KEY);
    const m = localStorage.getItem(ME_KEY);
    if (t && m) { setToken(t); setMe(JSON.parse(m)); loadOrgs(t); }
    setReady(true);
  }, [loadOrgs]);

  function onToken(t: string, m: Me) {
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(ME_KEY, JSON.stringify(m));
    setToken(t); setMe(m); loadOrgs(t);
  }
  function logout() { for (const key of [TOKEN_KEY, ME_KEY, ...LEGACY_KEYS.map(([old]) => old)]) localStorage.removeItem(key); setToken(null); setMe(null); }

  async function createOrg(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const d = await req("/orgs", token, { method: "POST", body: JSON.stringify({ orgName: org.name, adminName: org.adminName, adminEmail: org.adminEmail, sendEmail: org.sendEmail }) }) as { org: { name: string }; admin: { email: string }; tempPassword: string; sensorTypesCloned?: number; emailSent?: boolean; emailError?: string };
      setResult({ title: `${d.org.name} is set up${d.sensorTypesCloned ? ` with ${d.sensorTypesCloned} sensor types` : ""}`, email: d.admin.email, tempPassword: d.tempPassword, emailSent: d.emailSent, emailError: d.emailError });
      setOrg({ name: "", adminName: "", adminEmail: "", sendEmail: true });
      await loadOrgs(token!);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function addOperator(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const d = await req("/operators", token, { method: "POST", body: JSON.stringify(no) }) as { email: string; tempPassword?: string; emailSent?: boolean; emailError?: string };
      setResult({ title: `${no.name || d.email} can now onboard schools`, email: d.email, tempPassword: d.tempPassword, emailSent: d.emailSent, emailError: d.emailError });
      setNo({ name: "", email: "", sendEmail: true });
      await loadOrgs(token!);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function removeOperator(id: string) {
    setBusy(true); setErr("");
    try { await req(`/operators/${id}`, token, { method: "DELETE" }); await loadOrgs(token!); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  async function addUser(e: React.FormEvent, orgId: string, orgName: string) {
    e.preventDefault(); setBusy(true); setErr("");
    const pass = tempPassword();
    try {
      const d = await req("/users", token, { method: "POST", body: JSON.stringify({ name: nu.name, email: nu.email, role: nu.role, password: pass, orgId, sendEmail: nu.sendEmail }) }) as { email: string; emailSent?: boolean; emailError?: string };
      setResult({ title: `${nu.name} added to ${orgName} (${nu.role})`, email: d.email, tempPassword: pass, emailSent: d.emailSent, emailError: d.emailError });
      setNu({ name: "", email: "", role: "viewer", sendEmail: true }); setUserOrg(null);
      await loadOrgs(token!);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  if (!ready) return null;
  return (
    <main className="mx-auto max-w-3xl px-5 py-8">
      <Header me={me} onLogout={logout}/>
      {!token || !me ? <Login onToken={onToken}/> : (
        <>
          {err && <p role="alert" className="mb-4 rounded-[0.75rem] bg-danger-soft p-3.5 text-[0.9375rem] text-danger">{err}</p>}
          {result && <Result r={result} onClose={() => setResult(null)}/>}

          <section className={`${card} mt-6`}>
            <h2 className="text-lg font-semibold">Onboard a new organization</h2>
            <p className="mt-1 text-[0.9375rem] text-muted">This creates their private workspace, copies in your sensor types and sets up their first admin, who chooses a new password at first sign-in.</p>
            <form onSubmit={createOrg} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div><label className={label}>Organization name</label><input className={input} required value={org.name} onChange={e => setOrg({ ...org, name: e.target.value })} placeholder="Kenyon College"/></div>
              <div><label className={label}>Admin name</label><input className={input} required value={org.adminName} onChange={e => setOrg({ ...org, adminName: e.target.value })} placeholder="Jane Smith"/></div>
              <div className="sm:col-span-2"><label className={label}>Admin email</label><input className={input} type="email" required value={org.adminEmail} onChange={e => setOrg({ ...org, adminEmail: e.target.value })} placeholder="sensors@kenyon.edu"/></div>
              <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
                <input type="checkbox" checked={org.sendEmail} onChange={e => setOrg({ ...org, sendEmail: e.target.checked })} className="h-4 w-4 accent-[#467d58]"/>
                Send them the welcome email (login + temporary password)
              </label>
              <div className="sm:col-span-2"><button className={btn} disabled={busy}>{busy ? "Creating…" : "Create organization"}</button></div>
            </form>
          </section>

          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Organizations</h2>
            <div className="space-y-3">
              {orgs.map(o => (
                <div key={o.id} className={card}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{o.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{o.users} user{o.users === 1 ? "" : "s"} · since {new Date(o.createdAt).toLocaleDateString()}</p>
                    </div>
                    <button className={btnGhost} onClick={() => setUserOrg(userOrg === o.id ? null : o.id)}>{userOrg === o.id ? "Cancel" : "Add user"}</button>
                  </div>
                  {userOrg === o.id && (
                    <form onSubmit={e => addUser(e, o.id, o.name)} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
                      <div><label className={label}>Name</label><input className={input} required value={nu.name} onChange={e => setNu({ ...nu, name: e.target.value })}/></div>
                      <div><label className={label}>Email</label><input className={input} type="email" required value={nu.email} onChange={e => setNu({ ...nu, email: e.target.value })}/></div>
                      <div><label className={label}>Role</label>
                        <select className={input} value={nu.role} onChange={e => setNu({ ...nu, role: e.target.value })}>
                          <option value="admin">admin</option><option value="manager">manager</option><option value="viewer">viewer</option>
                        </select>
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted sm:col-span-2">
                        <input type="checkbox" checked={nu.sendEmail} onChange={e => setNu({ ...nu, sendEmail: e.target.checked })} className="h-4 w-4 accent-[#467d58]"/>
                        Email them their login
                      </label>
                      <div className="sm:col-span-1 sm:text-right"><button className={btn} disabled={busy}>{busy ? "Adding…" : "Add user"}</button></div>
                    </form>
                  )}
                </div>
              ))}
              {!orgs.length && <p className="text-sm text-muted">No organizations yet.</p>}
            </div>
          </section>

          <section className={`${card} mt-6`}>
            <h2 className="text-lg font-semibold">Platform operators</h2>
            <p className="mt-1 text-sm text-muted">Operators can onboard schools and manage this console. Give this only to people you fully trust.</p>
            <div className="mt-4 space-y-2">
              {ops.map(o => (
                <div key={o.id} className="flex items-center justify-between rounded-[0.75rem] border border-line px-4 py-3">
                  <div>
                    <span className="text-sm font-medium">{o.name}</span>
                    <span className="ml-2 text-xs text-muted">{o.email}</span>
                    {o.builtIn && <span className="ml-2 rounded-full bg-field px-2 py-0.5 text-xs font-semibold text-muted">built-in</span>}
                  </div>
                  {!o.builtIn && me && o.email !== me.email && <button className={btnGhost} disabled={busy} onClick={() => removeOperator(o.id)}>Remove</button>}
                </div>
              ))}
            </div>
            <form onSubmit={addOperator} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
              <div><label className={label}>Name</label><input className={input} required value={no.name} onChange={e => setNo({ ...no, name: e.target.value })} placeholder="Trusted teammate"/></div>
              <div><label className={label}>Email</label><input className={input} type="email" required value={no.email} onChange={e => setNo({ ...no, email: e.target.value })}/></div>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={no.sendEmail} onChange={e => setNo({ ...no, sendEmail: e.target.checked })} className="h-4 w-4 accent-[#467d58]"/>
                Email them the console invite
              </label>
              <div className="sm:text-right"><button className={btn} disabled={busy}>{busy ? "Adding…" : "Make operator"}</button></div>
            </form>
          </section>

          <p className="mt-10 text-center text-[0.875rem] text-muted">The console schools use: <a className="link" href={APP_URL}>{APP_URL.replace("https://", "")}</a></p>
        </>
      )}
    </main>
  );
}
