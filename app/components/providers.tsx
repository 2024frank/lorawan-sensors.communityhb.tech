"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }));
  const [ready, setReady] = useState(Boolean(process.env.NEXT_PUBLIC_API_BASE) || process.env.NEXT_PUBLIC_ENABLE_MOCKS === "false");
  useEffect(() => {
    if (ready) return;
    import("@/mocks/browser").then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" })).then(() => setReady(true));
  }, [ready]);
  if (!ready) return <div className="min-h-screen bg-paper p-6" role="status" aria-busy="true"><span className="sr-only">Loading…</span><div className="mx-auto max-w-7xl animate-pulse motion-reduce:animate-none"><div className="h-10 w-44 rounded-full bg-field"/><div className="mt-24 grid gap-4 md:grid-cols-3"><div className="h-36 rounded-[1.25rem] bg-field"/><div className="h-36 rounded-[1.25rem] bg-field"/><div className="h-36 rounded-[1.25rem] bg-field"/></div></div></div>;
  return <QueryClientProvider client={client}>{children}<Toaster position="top-right" toastOptions={{ style: { borderRadius: 16, border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--font-figtree), ui-sans-serif, sans-serif", fontSize: 15 } }} /></QueryClientProvider>;
}
