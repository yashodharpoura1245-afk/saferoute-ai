"use client";

import { useRouter } from "next/navigation";

const builders = [
  ["🎀", "R Charitha", "Team Lead · Additional Developer"],
  ["👤", "P Yashodhar", "Main Developer"],
  ["👤", "D Chinna Madarsa", "Backend Developer"],
  ["🎀", "T Siva Jyoshna", "Web Developer"],
  ["👤", "G Pranith Kumar", "UI/UX Designer"],
  ["🎀", "B Dolika", "Full Stack Developer"],
];

export default function BuildersPage() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-[#171717] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between px-6">
          <button onClick={() => router.push("/")} className="text-lg font-semibold">← SafeRoute</button>
          <button onClick={() => router.push("/")} className="text-sm text-slate-400 hover:text-white">Home</button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">The team behind SafeRoute</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-tight">Builders</h1>
        <p className="mt-4 max-w-2xl text-slate-400">Six people building a safer, risk-aware navigation experience.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builders.map(([emoji, name, role]) => (
            <div key={name} className="rounded-3xl border border-white/10 bg-[#212121] p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-2xl">{emoji}</div>
              <h2 className="mt-6 text-xl font-semibold">{name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{role}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
