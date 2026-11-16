"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { readStored, TOKEN_KEY } from "@/lib/storage";
import { Button, Input, Label } from "@/components/ui/primitives";
import { Brand } from "@/components/brand";

const schema = z.object({ email: z.string().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  useEffect(() => { if (readStored(TOKEN_KEY)) router.replace("/"); }, [router]);
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const login = useMutation({ mutationFn: api.login, onSuccess: ({ token, user }) => { localStorage.setItem(TOKEN_KEY, token); router.replace(user.mustChangePassword ? "/onboarding" : "/"); }, onError: (error: Error) => form.setError("root", { message: error.message }) });
  return <main className="grid min-h-screen gap-3 bg-paper p-3 lg:grid-cols-2">
    <section className="flex flex-col gap-8 rounded-[clamp(1.25rem,2.2vw,1.75rem)] bg-pine-panel p-7 text-white sm:p-10 lg:justify-between lg:p-12">
      <Brand inverse/>
      <div className="max-w-xl">
        <p className="text-[clamp(1.5rem,2.6vw,2.5rem)] leading-[1.15] font-semibold tracking-[-0.022em] text-balance">LoRaWAN makes it easy for schools and campuses to run their own private network of environmental sensors.</p>
        <p className="mt-6 hidden max-w-lg text-[1.125rem] leading-relaxed text-white/80 sm:block">Connect a gateway, add sensors with setup steps written for each model, and watch their readings arrive. You can download the data, reach it through the API or send it on to your own systems.</p>
      </div>
      <p className="hidden max-w-md text-[0.9375rem] leading-relaxed text-white/70 lg:block">Each organization works in its own private space, and only the people its administrator adds can sign in.</p>
    </section>
    <section className="flex items-center justify-center px-2 py-8 sm:px-10 lg:py-12">
      <div className="w-full max-w-[26rem]">
        <h1 className="text-[clamp(1.875rem,3.2vw,2.5rem)] leading-[1.08] tracking-[-0.026em]">Sign in</h1>
        <p className="mt-2.5 text-[1.0625rem] leading-relaxed text-muted">Use the email and password your administrator gave you.</p>
        <form className="mt-8 space-y-5" onSubmit={form.handleSubmit(values => login.mutate(values))} noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? "email-error" : undefined} {...form.register("email")}/>
            {form.formState.errors.email && <p id="email-error" className="mt-1.5 text-[0.875rem] text-danger">{form.formState.errors.email.message}</p>}
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <button type="button" className="link mb-2 text-[0.875rem]" onClick={() => toast.info("Ask your administrator. They can set you up again with a new temporary password.")}>Forgot your password?</button>
            </div>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={form.formState.errors.password ? "password-error" : undefined} {...form.register("password")}/>
            {form.formState.errors.password && <p id="password-error" className="mt-1.5 text-[0.875rem] text-danger">{form.formState.errors.password.message}</p>}
          </div>
          {form.formState.errors.root && <p role="alert" className="rounded-[0.75rem] bg-danger-soft p-3.5 text-[0.9375rem] text-danger">{form.formState.errors.root.message}</p>}
          <Button className="w-full" disabled={login.isPending}>{login.isPending ? "Signing in…" : "Sign in"}<ArrowRight size={18} aria-hidden="true"/></Button>
        </form>
        <p className="mt-6 text-[0.9375rem] leading-relaxed text-muted">The first time you sign in, you'll be asked to choose a new password.</p>
      </div>
    </section>
  </main>;
}
