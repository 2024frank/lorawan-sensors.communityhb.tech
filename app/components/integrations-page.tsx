"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowRight, Check, CheckCircle2, Cloud, Gauge, Plus, PlugZap, Send, Server, Trash2, Webhook, X } from "lucide-react";
import { toast } from "sonner";
import { api, type IntegrationAuth, type IntegrationInput, type IntegrationType } from "@/lib/api";
import { cn, relativeTime } from "@/lib/utils";
import { Badge, Button, Card, CardContent, CardHeader, EmptyState, Input, Label, PageHeader, Select, Skeleton } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/kit";

/*
 * What the backend actually does today: it delivers webhooks only. About every 45 seconds it
 * sends the newest reading from each of the organization's sensors to each webhook, once,
 * with no retries, signed with HMAC-SHA256 when signing is on. The other destinations are
 * listed so people know what's planned, but they can't be chosen yet.
 */
const catalog: { type: IntegrationType; name: string; body: string; icon: React.ReactNode; endpoint: string; available: boolean }[] = [
  { type: "webhook", name: "HTTPS webhook", body: "Send each new reading as JSON to an address you choose.", icon: <Webhook size={20}/>, endpoint: "https://api.example.com/lorawan/events", available: true },
  { type: "mqtt", name: "MQTT broker", body: "Not available yet.", icon: <Server size={20}/>, endpoint: "mqtts://broker.example.com:8883", available: false },
  { type: "aws_iot", name: "AWS IoT Core", body: "Not available yet.", icon: <Cloud size={20}/>, endpoint: "https://xxxxxxxxxxxx-ats.iot.us-east-1.amazonaws.com", available: false },
  { type: "azure_event_grid", name: "Azure Event Grid", body: "Not available yet.", icon: <Cloud size={20}/>, endpoint: "https://example.eastus-1.eventgrid.azure.net/api/events", available: false },
  { type: "thingsboard", name: "ThingsBoard", body: "Not available yet.", icon: <Gauge size={20}/>, endpoint: "https://thingsboard.example.com/api/v1/token/telemetry", available: false },
  { type: "datadog", name: "Datadog", body: "Not available yet.", icon: <Activity size={20}/>, endpoint: "https://api.datadoghq.com/api/v2/series", available: false },
];
// Only the authentication methods the delivery code sends.
const authLabels: Partial<Record<IntegrationAuth, string>> = { hmac: "Signing secret (HMAC)", bearer: "Bearer token", api_key: "API key header", basic: "Username and password", none: "No authentication" };
const SAMPLE = `{
  "event": "uplink.received",
  "time": "2026-11-16T14:05:00.000Z",
  "device": { "eui": "24e124707e041853", "name": "Library air" },
  "measurements": { "temperature": 22.4, "co2": 612 },
  "rssi": -78,
  "snr": 9.1
}`;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label>{children}{hint && <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">{hint}</p>}</div>;
}
function Modal({ children, step, onClose }: { children: React.ReactNode; step: number; onClose: () => void }) {
  useEffect(() => {
    const close = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  const title = step === 1 ? "Choose where to send readings" : step === 2 ? "Address and sign-in details" : "Check and turn it on";
  return <div className="fixed inset-0 z-50 grid place-items-center p-4">
    <button className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_42%,transparent)]" aria-label="Close" onClick={onClose}/>
    <Card role="dialog" aria-modal="true" aria-label={title} className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-auto rounded-[1.5rem] shadow-[0_28px_48px_-28px_rgb(18_58_41/.35)]">
      <CardHeader className="sticky top-0 z-10 border-b border-line bg-paper">
        <div className="min-w-0"><h2 className="text-[1.25rem]">{title}</h2><p className="mt-1 text-[0.9375rem] text-muted">Step {step} of 3</p></div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}><X/></Button>
      </CardHeader>
      <CardContent className="pt-5 sm:pt-6">{children}</CardContent>
    </Card>
  </div>;
}
function Metric({ label, value, foot, icon }: { label: string; value: string | number; foot: string; icon: React.ReactNode }) {
  return <Card className="p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><p className="text-[0.9375rem] font-semibold text-ink">{label}</p><span className="grid size-10 shrink-0 place-items-center rounded-full bg-field text-pine [&_svg]:size-[1.125rem]" aria-hidden="true">{icon}</span></div>
    <p className="mt-3 text-[2rem] leading-tight font-semibold tracking-[-0.025em] text-pine tabular-nums">{value}</p>
    <p className="mt-1.5 text-[0.875rem] text-muted">{foot}</p>
  </Card>;
}

const initial: IntegrationInput = { name: "", type: "webhook", endpoint: "", authType: "hmac", events: ["uplink.received"], signingEnabled: true, retryPolicy: "standard", secret: "", username: "", headerName: "X-API-Key", clientId: "", clientSecret: "", tokenUrl: "" };

export function IntegrationsPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["integrations"], queryFn: api.integrations });
  const [open, setOpen] = useState(false); const [step, setStep] = useState(1); const [tested, setTested] = useState(false); const [draft, setDraft] = useState<IntegrationInput>(initial);
  const selected = catalog.find(v => v.type === draft.type)!;
  const test = useMutation({ mutationFn: () => api.testIntegration(draft), onSuccess: r => { setTested(true); toast.success(`Your endpoint answered in ${r.latencyMs} ms`); }, onError: (e: Error) => toast.error(e.message) });
  const create = useMutation({ mutationFn: () => api.createIntegration(draft), onSuccess: () => { qc.invalidateQueries({ queryKey: ["integrations"] }); setOpen(false); setStep(1); setDraft(initial); setTested(false); toast.success("Integration turned on"); } });
  const remove = useMutation({ mutationFn: api.deleteIntegration, onSuccess: () => { qc.invalidateQueries({ queryKey: ["integrations"] }); toast.success("Integration removed"); } });
  const testById = useMutation({ mutationFn: api.testIntegrationById, onSuccess: r => toast.success(`Test event delivered in ${r.latencyMs} ms`), onError: (e: Error) => toast.error(e.message) });
  const choose = (type: IntegrationType) => { const item = catalog.find(v => v.type === type)!; if (!item.available) return; setDraft({ ...draft, type, endpoint: item.endpoint, authType: "hmac" }); setTested(false); setStep(2); };
  const items = query.data?.items ?? [];
  const healthy = items.filter(i => i.status === "healthy").length;

  return <>
    <PageHeader title="Integrations" description="Send your sensors' readings to another system, such as a dashboard, a data store or a research project, as they arrive." action={<Button onClick={() => { setOpen(true); setStep(1); }}><Plus size={18} aria-hidden="true"/>Add an integration</Button>}/>
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Metric label="Integrations" value={items.length} foot={items.length ? `${healthy} delivering normally` : "None added yet"} icon={<PlugZap/>}/>
      <Metric label="Delivered today" value={items.reduce((n, i) => n + i.deliveries24h, 0).toLocaleString()} foot="Across all integrations" icon={<Send/>}/>
      <Metric label="Delivery success" value={items.length ? `${(items.reduce((n, i) => n + i.successRate, 0) / items.length).toFixed(1)}%` : "—"} foot={items.length ? "Average across integrations" : "Nothing sent yet"} icon={<CheckCircle2/>}/>
    </div>
    <Card>
      <CardHeader><div className="min-w-0"><h2 className="text-[1.1875rem]">Your integrations</h2><p className="mt-1 text-[0.9375rem] text-muted">Secrets you enter stay on the server and are never sent back to the browser.</p></div></CardHeader>
      <CardContent className="space-y-3">{query.isLoading ? <Skeleton className="h-52"/> : !items.length ? <EmptyState icon={<PlugZap/>} title="No integrations yet" body="Add one to send each new reading to a system you choose." action={<Button variant="secondary" onClick={() => { setOpen(true); setStep(1); }}>Add an integration</Button>}/> : items.map(item => { const meta = catalog.find(v => v.type === item.type); return <div key={item.id} className="grid grid-cols-1 gap-4 rounded-[1rem] border border-line p-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-field text-pine" aria-hidden="true">{meta?.icon}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{item.name}</p>{item.status === "healthy" ? <StatusBadge status="active" label="Delivering" size="sm"/> : <StatusBadge status="warning" label="Some deliveries failing" size="sm"/>}<Badge>{meta?.name}</Badge></div>
            <p className="mt-1 truncate font-mono text-[0.8125rem] text-muted">{item.endpoint}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted"><span>{item.deliveries24h.toLocaleString()} sent today</span><span>{item.successRate}% delivered</span><span>Last sent {relativeTime(item.lastDeliveryAt)}</span>{authLabels[item.authType] && <span>{authLabels[item.authType]}</span>}</div>
          </div>
        </div>
        <div className="flex items-center gap-2"><Button variant="secondary" size="sm" disabled={testById.isPending} onClick={() => testById.mutate(item.id)}><Send size={16} aria-hidden="true"/>{testById.isPending ? "Sending…" : "Send a test"}</Button><Button variant="ghost" size="icon" aria-label={`Remove ${item.name}`} onClick={() => remove.mutate(item.id)}><Trash2/></Button></div>
      </div>; })}</CardContent>
    </Card>
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card><CardHeader><h2 className="text-[1.1875rem]">How delivery works</h2></CardHeader><CardContent className="space-y-4 text-[0.9375rem] leading-relaxed text-ink">
        <p>About every 45 seconds, the newest reading from each of your sensors is sent to each webhook, once. If the endpoint doesn't answer, that delivery is counted as failed and isn't tried again.</p>
        <p>With signing turned on, each request carries an HMAC-SHA256 signature of its body in the <code className="font-mono text-[0.875rem]">X-LoRaWAN-Signature</code> header, made with the secret you entered, so you can check the request came from us.</p>
        <p className="text-muted">Endpoints must be reachable on the public internet. Private and internal addresses are refused.</p>
      </CardContent></Card>
      <Card className="overflow-hidden"><CardHeader><div className="min-w-0"><h2 className="text-[1.1875rem]">What a delivery looks like</h2><p className="mt-1 text-[0.9375rem] text-muted">Each reading arrives as a JSON POST like this one.</p></div></CardHeader><CardContent><pre className="whitespace-pre-wrap break-words rounded-[1rem] bg-field p-4 font-mono text-[0.8125rem] leading-6 text-pine">{SAMPLE}</pre></CardContent></Card>
    </div>
    {open && <Modal step={step} onClose={() => setOpen(false)}>
      {step === 1 && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{catalog.map(item => <button key={item.type} onClick={() => choose(item.type)} disabled={!item.available} className={cn("rounded-[1rem] border border-line p-4 text-left transition-colors", item.available ? "hover:bg-field" : "cursor-not-allowed opacity-60")}>
        <span className="mb-3 grid size-10 place-items-center rounded-full bg-field text-pine" aria-hidden="true">{item.icon}</span>
        <span className="block font-semibold text-ink">{item.name}</span>
        <span className="mt-1 block text-[0.875rem] leading-relaxed text-muted">{item.body}</span>
      </button>)}</div>}
      {step === 2 && <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-[1rem] bg-field p-3.5"><span className="text-pine" aria-hidden="true">{selected.icon}</span><div><p className="font-semibold text-ink">{selected.name}</p><p className="text-[0.875rem] text-muted">{selected.body}</p></div></div>
        <Field label="Integration name"><Input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Science dashboard"/></Field>
        <Field label="Endpoint address" hint="An http(s) address on the public internet."><Input value={draft.endpoint} onChange={e => { setDraft({ ...draft, endpoint: e.target.value }); setTested(false); }} className="font-mono text-[0.875rem]"/></Field>
        <Field label="Authentication"><Select value={draft.authType} onChange={e => { setDraft({ ...draft, authType: e.target.value as IntegrationAuth }); setTested(false); }}>{Object.entries(authLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
        <AuthFields draft={draft} setDraft={setDraft}/>
        <div className="flex flex-col gap-3 rounded-[1rem] border border-line p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-ink">Test the endpoint</p><p className="text-[0.875rem] text-muted">Sends one sample event, so you can see it arrive.</p></div><Button variant="secondary" size="sm" disabled={!draft.endpoint || test.isPending} onClick={() => test.mutate()}>{tested ? <><Check size={16} aria-hidden="true"/>It answered</> : test.isPending ? "Testing…" : "Send a test"}</Button></div>
        <div className="flex justify-between pt-2"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button disabled={!draft.name || !draft.endpoint || !tested} onClick={() => setStep(3)}>Continue<ArrowRight size={18} aria-hidden="true"/></Button></div>
      </div>}
      {step === 3 && <div className="space-y-5">
        <div className="rounded-[1rem] bg-field p-4 text-[0.9375rem] leading-relaxed"><p className="font-semibold text-pine">What gets sent</p><p className="mt-1 text-muted">Each new reading from your sensors, as in the sample on the Integrations page.</p></div>
        <Field label="Signing" hint="Adds an X-LoRaWAN-Signature header your endpoint can check. It uses the secret you entered."><Select value={draft.signingEnabled ? "on" : "off"} onChange={e => setDraft({ ...draft, signingEnabled: e.target.value === "on" })}><option value="on">Sign each request</option><option value="off">Don't sign</option></Select></Field>
        <div className="flex justify-between pt-2"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><Button disabled={create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Turning on…" : "Turn it on"}</Button></div>
      </div>}
    </Modal>}
  </>;
}

function AuthFields({ draft, setDraft }: { draft: IntegrationInput; setDraft: (value: IntegrationInput) => void }) {
  if (draft.authType === "none") return null;
  if (draft.authType === "basic") return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Username"><Input value={draft.username} onChange={e => setDraft({ ...draft, username: e.target.value })}/></Field><Field label="Password"><Input type="password" autoComplete="new-password" value={draft.secret} onChange={e => setDraft({ ...draft, secret: e.target.value })}/></Field></div>;
  if (draft.authType === "api_key") return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Header name"><Input value={draft.headerName} onChange={e => setDraft({ ...draft, headerName: e.target.value })}/></Field><Field label="API key"><Input type="password" autoComplete="new-password" value={draft.secret} onChange={e => setDraft({ ...draft, secret: e.target.value })}/></Field></div>;
  return <Field label={draft.authType === "hmac" ? "Signing secret" : "Bearer token"}><Input type="password" autoComplete="new-password" value={draft.secret} onChange={e => setDraft({ ...draft, secret: e.target.value })} placeholder="Kept on the server"/></Field>;
}
