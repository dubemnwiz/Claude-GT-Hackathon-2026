
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Clock } from "@/components/Clock"
import { Greeting } from "@/components/Greeting"
import { FocusWidget } from "@/components/home/FocusWidget"
import { WeatherWidget } from "@/components/home/WeatherWidget"
import { DailyQuote } from "@/components/home/DailyQuote"
import { CountdownWidget } from "@/components/home/CountdownWidget"

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="flex flex-col gap-5 py-6">

      {/* ── Hero Card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex gap-4 items-start">
            <div className="w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl bg-primary/10 text-2xl">
              🧭
            </div>
            <div className="space-y-1">
              <Greeting name={session.user?.name} />
              <Clock />
            </div>
          </div>
          <div className="shrink-0">
            <WeatherWidget />
          </div>
        </div>
      </div>

      {/* ── Quote of the Day ──────────────────────────────────────── */}
      <DailyQuote />

      {/* ── Focus + Countdowns ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FocusWidget />
        <CountdownWidget />
      </div>
    </div>
  )
}
