"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const SafeRouteMap = dynamic(() => import("./components/SafeRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#212121] text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

type FloodZone = {
  name: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  source_file: string;
};

type RouteRisk = {
  route_id: string;
  risk_score: number;
  risk_level: string;
  flood_zone_count: number;
  nearby_flood_zones: FloodZone[];
};

type Route = {
  id: string;
  distance_km: number;
  duration_min: number;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
  risk?: RouteRisk;
};

type Weather = {
  temperature: number | null;
  rain: number | null;
  precipitation: number | null;
  weather_code: number | null;
  source: string;
};

type HistoryItem = {
  origin: string;
  destination: string;
  timestamp: string;
  routeCount: number;
};

type Theme = "dark" | "light";

const routeColors: Record<string, string> = {
  "route-1": "#22c55e",
  "route-2": "#f59e0b",
  "route-3": "#ef4444",
  "route-4": "#8b5cf6",
};

function getWeatherCondition(code: number | null) {
  if (code === null) return "Unavailable";
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([80, 81, 82].includes(code)) return "Showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

function riskMeta(level: string) {
  if (level === "High") {
    return {
      label: "Higher risk",
      text: "text-red-300",
      bg: "bg-red-500/15",
      ring: "border-red-400/30",
      dot: "bg-red-400",
    };
  }
  if (level === "Moderate") {
    return {
      label: "Moderate risk",
      text: "text-amber-300",
      bg: "bg-amber-500/15",
      ring: "border-amber-400/30",
      dot: "bg-amber-400",
    };
  }
  return {
    label: "Lower risk",
    text: "text-slate-200",
    bg: "bg-white/[0.06]",
    ring: "border-white/30/30",
    dot: "bg-slate-300",
  };
}

function icon(name: "gear" | "moon" | "sun" | "user" | "clock" | "chevron") {
  const common = "h-4 w-4";
  if (name === "gear") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
        <path d="M12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z" />
        <path d="m19.4 15 .1.1 1.5 1.2-1.8 3-1.8-.7a7.7 7.7 0 0 1-1.6.9l-.3 1.9h-3.5l-.3-1.9a7.8 7.8 0 0 1-1.7-.9l-1.8.7-1.8-3 1.5-1.2A7.7 7.7 0 0 1 7.7 12c0-.4 0-.7.1-1.1L6.3 9.7l1.8-3 1.8.7c.5-.4 1.1-.7 1.7-.9L11.9 4h3.5l.3 1.9c.6.2 1.2.5 1.7.9l1.8-.7 1.8 3-1.5 1.2c.1.4.1.7.1 1.1s0 .7-.1 1.1Z" />
      </svg>
    );
  }
  if (name === "moon") return <span className="text-lg leading-none">☾</span>;
  if (name === "sun") return <span className="text-lg leading-none">☀</span>;
  if (name === "clock") return <span className="text-base leading-none">◷</span>;
  if (name === "chevron") return <span className="text-base leading-none">›</span>;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={common}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c.8-3.2 3.1-4.9 6.5-4.9s5.7 1.7 6.5 4.9" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("dark");
  const [origin, setOrigin] = useState("Whitefield, Bengaluru");
  const [destination, setDestination] = useState("Church Street, Bengaluru");
  const [stops, setStops] = useState<string[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [agentExplanation, setAgentExplanation] = useState("");
  const [agentSelectedRouteId, setAgentSelectedRouteId] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("saferoute-theme") as Theme | null;
    const savedHistory = localStorage.getItem("saferoute-history");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        // Ignore corrupt local history.
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("saferoute-theme", theme);
  }, [theme]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/weather?latitude=12.9716&longitude=77.5946")
      .then((response) => response.json())
      .then(setWeather)
      .catch(() => setWeather(null));
  }, []);

  const saveHistory = (routeCount: number) => {
    const item: HistoryItem = {
      origin,
      destination,
      timestamp: new Date().toLocaleString(),
      routeCount,
    };
    const updated = [
      item,
      ...history.filter((x) => !(x.origin === origin && x.destination === destination)),
    ].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("saferoute-history", JSON.stringify(updated));
  };

  const findRoutes = async () => {
    setError("");
    if (!origin.trim() || !destination.trim()) {
      setError("Enter both starting point and destination.");
      return;
    }
    setLoading(true);
    setSelectedRouteId(null);
    setAgentExplanation("");
    setAgentSelectedRouteId(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/agent/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, stops: stops.filter((stop) => stop.trim()) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to analyze routes.");
      const receivedRoutes: Route[] = data.routes || [];
      setAgentExplanation(data.agent?.explanation ?? "");
      setAgentSelectedRouteId(data.agent?.selected_route_id ?? null);
      setRoutes(receivedRoutes);
      // Do not auto-open the detail panel. The user must click a route.
      setSelectedRouteId(null);
      saveHistory(receivedRoutes.length);
    } catch (err) {
      setRoutes([]);
      setSelectedRouteId(null);
      setAgentExplanation("");
      setAgentSelectedRouteId(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const setThemeAndClose = (next: Theme) => {
    setTheme(next);
    setAccountOpen(false);
  };

  const appClass = theme === "dark" ? "bg-[#171717] text-white" : "bg-[#f4f6f5] text-slate-900";
  const headerClass = theme === "dark" ? "border-white/[0.08] bg-[#171717]/90" : "border-slate-200 bg-white/90";
  const panelClass = theme === "dark" ? "border-white/[0.08] bg-[#1c1c1c]" : "border-slate-200 bg-white";
  const inputClass = theme === "dark" ? "border-white/[0.08] bg-[#2f2f2f] text-white placeholder:text-slate-500" : "border-slate-200 bg-white text-slate-900";

  return (
    <main className={`min-h-screen ${appClass}`}>
      <header className={`sticky top-0 z-[3000] border-b backdrop-blur-xl ${headerClass}`}>
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between px-6">
          <button onClick={() => router.push("/")} className="flex items-center gap-3 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2f2f2f] border border-white/[0.08] text-white shadow-none">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.1">
                <path d="M7 16c2.5-8 9-10 13-9-1 5-4 9-9 9-1.7 0-3-.4-4-.9Z" fill="currentColor" />
                <path d="M5 20c2.1-4.8 5.2-7.8 10.5-10.4" stroke="#0a0d0e" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-[22px] font-semibold tracking-tight">SafeRoute</div>
              <div className="text-xs text-slate-400">Safer journeys, smarter routes</div>
            </div>
          </button>

          <nav className="hidden items-center gap-9 text-sm md:flex">
            <button className={`relative py-2 font-semibold transition ${theme === "dark" ? "text-white" : "text-slate-900"} after:absolute after:inset-x-0 after:-bottom-1 after:mx-auto after:h-0.5 after:w-8 after:rounded-full ${theme === "dark" ? "after:bg-white/60" : "after:bg-slate-900/60"}`}>Home</button>
            <button onClick={() => window.location.href = "/about"} className={`transition ${theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-950"}`}>About</button>
            <button onClick={() => router.push("/builders")} className={`transition ${theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-700 hover:text-slate-950"}`}>Builders</button>
          </nav>

          <div className="relative flex items-center gap-3">
            <button
              aria-label="Toggle theme"
              onClick={() => setThemeAndClose(theme === "dark" ? "light" : "dark")}
              className={`flex h-11 w-11 items-center justify-center rounded-full border ${theme === "dark" ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-white"}`}
            >
              {theme === "dark" ? icon("moon") : icon("sun")}
            </button>

            <button
              aria-label="Account menu"
              onClick={() => setAccountOpen((open) => !open)}
              className={`flex h-11 items-center gap-2 rounded-full border px-2 ${theme === "dark" ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-white"}`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-200">{icon("user")}</span>
              <span className="pr-1 text-slate-400">⌄</span>
            </button>

            {accountOpen && (
              <div className={`absolute right-0 top-14 w-64 rounded-2xl border p-2 shadow-2xl ${panelClass}`}>
                <button onClick={() => router.push("/signin")} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-white/5">
                  <span className="flex items-center gap-3">{icon("user")} Sign in</span><span>›</span>
                </button>
                <button onClick={() => router.push("/signup")} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-white/5">
                  <span className="flex items-center gap-3">{icon("user")} Sign up</span><span>›</span>
                </button>
                <button onClick={() => setHistoryOpen(true)} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-white/5">
                  <span className="flex items-center gap-3">{icon("clock")} History</span><span>›</span>
                </button>
                <div className="my-2 h-px bg-white/10" />
                <button onClick={() => setThemeAndClose("light")} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-white/5">
                  <span className="flex items-center gap-3">{icon("sun")} Light mode</span>{theme === "light" ? <span className="text-slate-300">●</span> : <span className="text-slate-500">○</span>}
                </button>
                <button onClick={() => setThemeAndClose("dark")} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm hover:bg-white/5">
                  <span className="flex items-center gap-3">{icon("moon")} Dark mode</span>{theme === "dark" ? <span className="text-slate-300">●</span> : <span className="text-slate-500">○</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-5 py-5">
        <div className="grid min-h-[calc(100vh-116px)] gap-3 lg:grid-cols-[400px_minmax(0,1fr)]">
          {/* LEFT PANEL */}
          <aside className={`flex min-h-0 flex-col border-r ${theme === "dark" ? "border-white/[0.08] bg-[#1c1c1c]" : "border-slate-200 bg-white"}`}>
            <div className={`border-b p-5 ${theme === "dark" ? "border-white/[0.08]" : "border-slate-200"}`}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-[26px] font-semibold tracking-tight">Plan your journey</div>
                  <div className="mt-1 text-sm text-slate-400">Driving routes ranked by safety exposure.</div>
                </div>
                <button className="text-xl text-slate-500 hover:text-white">•••</button>
              </div>

              <div className="space-y-3">
                <div className="relative flex gap-3">
                  <div className="flex w-5 justify-center"><span className="mt-3 h-3 w-3 rounded-full border-2 border-white/30" /></div>
                  <input value={origin} onChange={(e) => setOrigin(e.target.value)} className={`h-12 w-full rounded-xl border px-4 text-sm outline-none focus:border-white/30 ${inputClass}`} placeholder="Starting point" />
                </div>
                {stops.map((stop, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex w-5 justify-center"><span className="mt-3 h-3 w-3 rounded-full border-2 border-slate-500" /></div>
                    <div className="relative w-full">
                      <input value={stop} onChange={(e) => setStops((all) => all.map((item, i) => i === index ? e.target.value : item))} className={`h-12 w-full rounded-xl border px-4 pr-10 text-sm outline-none focus:border-white/30 ${inputClass}`} placeholder={`Stop ${index + 1}`} />
                      <button onClick={() => setStops((all) => all.filter((_, i) => i !== index))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400">×</button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-3">
                  <div className="flex w-5 justify-center"><span className="mt-3 h-3 w-3 rounded-full border-2 border-red-400" /></div>
                  <input value={destination} onChange={(e) => setDestination(e.target.value)} className={`h-12 w-full rounded-xl border px-4 text-sm outline-none focus:border-white/30 ${inputClass}`} placeholder="Destination" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <button onClick={() => setStops((all) => [...all, ""])} className="text-sm font-medium text-slate-300 hover:text-white">+ Add stop</button>
                <button onClick={() => { const old = origin; setOrigin(destination); setDestination(old); }} className="text-slate-500 hover:text-white" aria-label="Swap route">⇅</button>
              </div>

              <button onClick={findRoutes} disabled={loading} className={`mt-4 h-12 w-full rounded-xl text-sm font-semibold shadow-none transition disabled:cursor-not-allowed disabled:opacity-60 ${theme === "dark" ? "bg-[#2f2f2f] text-white hover:bg-[#3a3a3a]" : "bg-slate-200 text-slate-900 hover:bg-slate-300"}`}>
                {loading ? "Analyzing routes…" : "Find Safe Routes  →"}
              </button>
              {error && <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
            </div>

            <div className={`border-b p-5 ${theme === "dark" ? "border-white/[0.08]" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Live weather</div>
                  <div className="mt-1 text-lg font-semibold">Bengaluru</div>
                </div>
                <span className={`flex items-center gap-2 text-xs font-semibold ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}><span className={`h-2 w-2 rounded-full ${theme === "dark" ? "bg-slate-300" : "bg-slate-500"}`} /> LIVE</span>
              </div>
              {weather && (
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className={`rounded-xl p-3 ${theme === "dark" ? "bg-white/[0.03]" : "bg-slate-100"}`}><div className="text-xs text-slate-500">Temperature</div><div className="mt-1 font-semibold">{weather.temperature ?? "--"}°C</div></div>
                  <div className={`rounded-xl p-3 ${theme === "dark" ? "bg-white/[0.03]" : "bg-slate-100"}`}><div className="text-xs text-slate-500">Rain</div><div className="mt-1 font-semibold">{weather.rain ?? 0} mm</div></div>
                  <div className={`rounded-xl p-3 ${theme === "dark" ? "bg-white/[0.03]" : "bg-slate-100"}`}><div className="text-xs text-slate-500">Precipitation</div><div className="mt-1 font-semibold">{weather.precipitation ?? 0} mm</div></div>
                  <div className={`rounded-xl p-3 ${theme === "dark" ? "bg-white/[0.03]" : "bg-slate-100"}`}><div className="text-xs text-slate-500">Condition</div><div className="mt-1 font-semibold">{getWeatherCondition(weather.weather_code)}</div></div>
                </div>
              )}
              {!weather && <div className="mt-4 text-sm text-slate-500">Loading live weather…</div>}
              <div className="mt-3 text-[11px] text-slate-600">Source: {weather?.source ?? "Open-Meteo"}</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold">Routes {routes.length ? `(${routes.length})` : ""}</div>
                {routes.length > 0 && <div className="text-xs text-slate-500">Click a route line</div>}
              </div>
              {routes.length === 0 ? (
                <div className={`rounded-2xl border border-dashed p-7 text-center text-sm text-slate-500 ${theme === "dark" ? "border-white/[0.08]" : "border-slate-200"}`}>Your routes will appear here.</div>
              ) : (
                <div className="space-y-2.5">
                  {routes.map((route, index) => {
                    const selected = route.id === selectedRouteId;
                    const meta = riskMeta(route.risk?.risk_level ?? "Low");
                    return (
                      <button key={route.id} onClick={() => setSelectedRouteId(route.id)} className={`group w-full rounded-2xl border p-4 text-left transition ${selected ? (theme === "dark" ? "border-white/25 bg-white/[0.05]" : "border-slate-300 bg-slate-50") : (theme === "dark" ? "border-white/[0.08] bg-white/[0.015] hover:bg-white/[0.04]" : "border-slate-200 bg-white hover:bg-slate-50")}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-1.5 h-4 w-4 rounded-full border-2" style={{ borderColor: routeColors[route.id] ?? "#22c55e", backgroundColor: selected ? routeColors[route.id] : "transparent" }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Route {index + 1}</div>
                            <div className="mt-1 flex items-end gap-3"><span className="text-2xl font-semibold">{route.duration_min} min</span><span className="pb-1 text-sm text-slate-400">{route.distance_km} km</span></div>
                            <div className="mt-2 flex items-center justify-between gap-2"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${meta.text} ${meta.bg} ${meta.ring}`}>{meta.label}</span><span className="text-xs text-slate-500">{route.risk?.flood_zone_count ?? 0} flood-prone locations</span></div>
                          </div>
                          <span className="text-2xl leading-none text-slate-500 transition group-hover:translate-x-0.5">›</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* MAP + OVERLAYED ROUTE DETAILS */}
          <section className="relative min-h-[680px] overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#1f1f1f] shadow-2xl">
            <div className="absolute inset-0">
              <SafeRouteMap routes={routes} selectedRouteId={selectedRouteId} routeColors={routeColors} onRouteSelect={setSelectedRouteId} />
            </div>

            <div className="absolute bottom-5 left-5 z-[1000] rounded-full border border-white/[0.08] bg-[#212121]/85 px-3 py-2 text-xs text-slate-300 backdrop-blur">
              <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-red-400" />Flood-prone location
            </div>

            {/* Route details appear only after a route is clicked, sliding up from below. */}
            <aside
              className={`absolute bottom-4 right-4 z-[1200] w-[min(360px,calc(100%-2rem))] rounded-[24px] border border-white/[0.08] bg-[#212121]/96 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-out ${
                selectedRoute
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-[115%] opacity-0"
              }`}
            >
              {selectedRoute && (
                <div className="max-h-[calc(100vh-150px)] overflow-y-auto p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-slate-300" />Route {routes.findIndex((r) => r.id === selectedRoute.id) + 1} <span className="text-slate-300">(Selected)</span></div>
                      <div className="mt-5 text-[38px] font-semibold leading-none tracking-tight">{selectedRoute.duration_min} min</div>
                      <div className="mt-2 text-2xl text-slate-400">{selectedRoute.distance_km} km</div>
                    </div>
                    <button onClick={() => setSelectedRouteId(null)} className="text-2xl leading-none text-slate-500 hover:text-white" aria-label="Close route details">×</button>
                  </div>

                  <div className="mt-6 space-y-4 text-sm">
                    <div className="flex items-center gap-3"><span className="text-blue-400">♦</span><span>{selectedRoute.risk?.flood_zone_count ?? 0} flood-prone locations</span></div>
                    <div className="flex items-center gap-3"><span className="text-slate-300">⌁</span><span>Safer mapped exposure for this route</span></div>
                    <div className="flex items-center gap-3"><span className="text-slate-300">◷</span><span>Typical arrival: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                  </div>

                  <div className="my-6 h-px bg-white/10" />

                  <div className="text-lg font-semibold">Risk breakdown</div>
                  <div className="mt-4 space-y-4 text-sm">
                    {[
                      { label: "Low exposure", value: Math.max(0, 100 - (selectedRoute.risk?.risk_score ?? 0)), color: "bg-slate-300" },
                      { label: "Moderate exposure", value: Math.min(100, Math.round((selectedRoute.risk?.risk_score ?? 0) * 0.25)), color: "bg-amber-400" },
                      { label: "High exposure", value: Math.min(100, Math.round((selectedRoute.risk?.risk_score ?? 0) * 0.08)), color: "bg-red-400" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between"><span className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${row.color}`} />{row.label}</span><span className="font-medium text-slate-300">{row.value}%</span></div>
                    ))}
                  </div>

                  <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Why this route?</div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {agentSelectedRouteId === selectedRoute.id && agentExplanation
  ? agentExplanation
  : `Route ${routes.findIndex((r) => r.id === selectedRoute.id) + 1} has an estimated ${selectedRoute.risk?.risk_level?.toLowerCase() ?? "lower"} exposure based on mapped flood-risk proximity available to the MVP.`}
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </section>
        </div>
      </section>

      {historyOpen && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-white/[0.08] bg-[#212121] p-6 shadow-2xl">
            <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Saved searches</div><h2 className="mt-1 text-2xl font-semibold">History</h2></div><button onClick={() => setHistoryOpen(false)} className="text-2xl text-slate-500 hover:text-white">×</button></div>
            {history.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-white/[0.08] p-8 text-center text-sm text-slate-500">No route history yet.</div> : <div className="mt-6 max-h-[60vh] space-y-2 overflow-y-auto">{history.map((item, index) => <button key={`${item.timestamp}-${index}`} onClick={() => { setOrigin(item.origin); setDestination(item.destination); setHistoryOpen(false); }} className="w-full rounded-2xl border border-white/[0.08] p-4 text-left hover:bg-white/[0.04]"><div className="font-medium">{item.origin} → {item.destination}</div><div className="mt-1 text-xs text-slate-500">{item.timestamp} · {item.routeCount} routes</div></button>)}</div>}
          </div>
        </div>
      )}
    </main>
  );
}
