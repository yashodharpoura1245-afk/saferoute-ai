"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Theme = "dark" | "light";

export default function AboutPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = localStorage.getItem("saferoute-theme") as Theme | null;
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("saferoute-theme", theme);
  }, [theme]);

  const dark = theme === "dark";

  return (
    <main className={`min-h-screen ${dark ? "bg-[#171717] text-white" : "bg-[#f4f6f5] text-slate-900"}`}>
      <header className={`border-b backdrop-blur-xl ${dark ? "border-white/[0.08] bg-[#171717]/90" : "border-slate-200 bg-white/90"}`}>
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-6">
          <button onClick={() => router.push("/")} className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#2f2f2f] text-white">
              <span className="text-xl">⌁</span>
            </div>
            <div>
              <div className="text-[22px] font-semibold tracking-tight">SafeRoute</div>
              <div className={dark ? "text-xs text-slate-400" : "text-xs text-slate-500"}>Safer journeys, smarter routes</div>
            </div>
          </button>

          <nav className="hidden items-center gap-9 text-sm md:flex">
            <button onClick={() => router.push("/")} className={dark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}>Home</button>
            <button className={`relative py-2 font-semibold ${dark ? "text-white after:bg-white/60" : "text-slate-900 after:bg-slate-900/70"} after:absolute after:inset-x-0 after:-bottom-1 after:mx-auto after:h-0.5 after:w-8 after:rounded-full`}>About</button>
            <button onClick={() => router.push("/builders")} className={dark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}>Builders</button>
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(dark ? "light" : "dark")} className={`flex h-11 w-11 items-center justify-center rounded-full border ${dark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-white"}`} aria-label="Toggle theme">
              {dark ? "☾" : "☀"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className={`rounded-3xl border p-8 md:p-12 ${dark ? "border-white/[0.08] bg-[#1c1c1c]" : "border-slate-200 bg-white"}`}>
          <div className={dark ? "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" : "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"}>About SafeRoute</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Safer journeys, smarter routes.</h1>
          <p className={`mt-6 max-w-2xl text-base leading-7 ${dark ? "text-slate-300" : "text-slate-600"}`}>
            SafeRoute compares real driving routes using route geometry, weather and mapped flood-risk exposure. The goal is to help people understand route risk, not simply chase the fastest ETA.
          </p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Real routes", "Driving routes from live route geometry."],
              ["Weather-aware", "Current weather information from the backend."],
              ["Risk exposure", "Mapped flood-risk proximity for route comparison."],
            ].map(([title, body]) => (
              <div key={title} className={`rounded-2xl border p-5 ${dark ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-slate-50"}`}>
                <div className="font-semibold">{title}</div>
                <div className={`mt-2 text-sm leading-6 ${dark ? "text-slate-400" : "text-slate-600"}`}>{body}</div>
              </div>
            ))}
          </div>

          <button onClick={() => router.push("/")} className={`mt-10 rounded-xl px-5 py-3 text-sm font-semibold ${dark ? "bg-[#2f2f2f] text-white hover:bg-[#3a3a3a]" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
            Back to route planner →
          </button>
        </div>
      </section>
    </main>
  );
}
