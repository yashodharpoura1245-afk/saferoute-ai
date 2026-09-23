"use client";

import { useRouter } from "next/navigation";

export default function SignInPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-[#171717] text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <button onClick={() => router.push("/")} className="mb-10 self-start text-sm text-slate-400 hover:text-white">← Back to SafeRoute</button>
        <div className="rounded-3xl border border-white/10 bg-[#212121] p-8 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Account</p>
          <h1 className="mt-2 text-4xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-slate-400">Welcome back to SafeRoute.</p>
          <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Email" className="h-12 w-full rounded-xl border border-white/10 bg-[#2a2a2a] px-4 outline-none focus:border-emerald-400" />
            <input type="password" placeholder="Password" className="h-12 w-full rounded-xl border border-white/10 bg-[#2a2a2a] px-4 outline-none focus:border-emerald-400" />
            <button className="h-12 w-full rounded-xl bg-[#10a37f] font-semibold text-[#10a37f]">Sign in</button>
          </form>
          <button onClick={() => router.push("/signup")} className="mt-5 text-sm text-slate-400 hover:text-white">New here? Create an account →</button>
        </div>
      </div>
    </main>
  );
}
