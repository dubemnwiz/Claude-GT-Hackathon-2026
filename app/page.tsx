
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, PenLine, Plus, Scale, StickyNote } from "lucide-react"
import { Clock } from "@/components/Clock"
import { Greeting } from "@/components/Greeting"
import { prisma } from "@/lib/prisma"
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns"
import { FocusWidget } from "@/components/home/FocusWidget"
import { WeatherWidget } from "@/components/home/WeatherWidget"
import { DailyQuote } from "@/components/home/DailyQuote"
import { UnifiedActivityFeed, ActivityItem } from "@/components/home/UnifiedActivityFeed"
import { WeeklyRecap, WeeklyRecapData } from "@/components/home/WeeklyRecap"
import { CountdownWidget } from "@/components/home/CountdownWidget"
import { GoogleCalendarWidget } from "@/components/home/GoogleCalendarWidget"

const quickActions = [
  {
    href: "/diary",
    label: "New Entry",
    icon: PenLine,
    gradient: "from-violet-500 to-indigo-500",
    glow: "group-hover:shadow-violet-500/30",
    bg: "bg-violet-500/10 group-hover:bg-violet-500",
    text: "text-violet-600 dark:text-violet-400 group-hover:text-white",
  },
  {
    href: "/fitness",
    label: "Log Weight",
    icon: Scale,
    gradient: "from-pink-500 to-rose-500",
    glow: "group-hover:shadow-pink-500/30",
    bg: "bg-pink-500/10 group-hover:bg-pink-500",
    text: "text-pink-600 dark:text-pink-400 group-hover:text-white",
  },
  {
    href: "/planning",
    label: "Add Task",
    icon: Plus,
    gradient: "from-emerald-500 to-teal-500",
    glow: "group-hover:shadow-emerald-500/30",
    bg: "bg-emerald-500/10 group-hover:bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400 group-hover:text-white",
  },
  {
    href: "/mind-dump",
    label: "Quick Note",
    icon: StickyNote,
    gradient: "from-amber-500 to-orange-500",
    glow: "group-hover:shadow-amber-500/30",
    bg: "bg-amber-500/10 group-hover:bg-amber-500",
    text: "text-amber-600 dark:text-amber-400 group-hover:text-white",
  },
]

export default async function Home() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const today = format(new Date(), "EEEE")
  const userId = session.user.id

  // ── Today's tasks for Focus Widget ────────────────────────────────────────
  const todaysTasks = await prisma.task.findMany({
    where: { userId, day: today },
  })

  // ── Good-day count this month ──────────────────────────────────────────────
  const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const goodDaysThisMonth = await prisma.diaryEntry.count({
    where: { userId, rating: "GOOD", date: { gte: thisMonthStart } },
  })

  // ── Unified activity feed ──────────────────────────────────────────────────
  const [recentTasks, recentDiary, recentWorkouts, recentWeights] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.diaryEntry.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 3,
      select: { id: true, date: true, content: true },
    }),
    prisma.workoutLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 3,
    }),
    prisma.weightLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 3,
    }),
  ])

  const activityItems: ActivityItem[] = [
    ...recentTasks.map(t => ({
      id: `task-${t.id}`,
      type: "task" as const,
      label: t.content,
      sub: "Completed task",
      timestamp: t.updatedAt.toISOString(),
    })),
    // removed diary to keep it private
    ...recentWorkouts.map(w => ({
      id: `workout-${w.id}`,
      type: "workout" as const,
      label: w.workout,
      sub: "Logged workout",
      timestamp: w.date.toISOString(),
    })),
    ...recentWeights.map(w => ({
      id: `weight-${w.id}`,
      type: "weight" as const,
      label: `${w.weight} lbs`,
      sub: "Weight logged",
      timestamp: w.date.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8)

  // ── Weekly recap (last Mon–Sun) ────────────────────────────────────────────
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
  const lastWeekEnd   = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
  const lastWeekOf    = format(lastWeekStart, "yyyy-MM-dd")

  const [lwTasks, lwWorkouts, lwDiary, lwWeightFirst, lwWeightLast] = await Promise.all([
    prisma.task.findMany({
      where: { userId, weekOf: lastWeekOf },
    }),
    prisma.workoutLog.findMany({
      where: { userId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
    }),
    prisma.diaryEntry.findMany({
      where: { userId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
    }),
    prisma.weightLog.findFirst({
      where: { userId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
      orderBy: { date: "asc" },
    }),
    prisma.weightLog.findFirst({
      where: { userId, date: { gte: lastWeekStart, lte: lastWeekEnd } },
      orderBy: { date: "desc" },
    }),
  ])

  const weightDelta =
    lwWeightFirst && lwWeightLast && lwWeightFirst.id !== lwWeightLast.id
      ? +(lwWeightLast.weight - lwWeightFirst.weight).toFixed(1)
      : null

  const weeklyRecap: WeeklyRecapData = {
    weekLabel: `${format(lastWeekStart, "MMM d")} – ${format(lastWeekEnd, "MMM d")}`,
    tasksCompleted: lwTasks.filter(t => t.status === "COMPLETED").length,
    tasksTotal: lwTasks.length,
    workouts: lwWorkouts.length,
    journalEntries: lwDiary.length,
    weightDelta,
  }

  return (
    <div className="flex flex-col gap-5 py-6">

      {/* ── Hero Card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-border/30 bg-card/50 backdrop-blur-xl p-6 md:p-8">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)" }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--accent)), transparent 70%)" }} />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <Greeting name={session.user?.name} />
            <Clock />
            {goodDaysThisMonth > 0 && (
              <p className="text-xs text-emerald-500 font-medium mt-0.5">
                ✦ {goodDaysThisMonth} good day{goodDaysThisMonth === 1 ? "" : "s"} this month
              </p>
            )}
          </div>
          <div className="shrink-0">
            <WeatherWidget />
          </div>
        </div>
      </div>

      {/* ── Quote of the Day ──────────────────────────────────────── */}
      <DailyQuote />

      {/* ── Weekly Recap ──────────────────────────────────────────── */}
      <WeeklyRecap data={weeklyRecap} />

      {/* ── Main Bento Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Left column: quick actions + unified activity feed */}
        <div className="md:col-span-2 flex flex-col gap-5">

          {/* Quick Actions 2×2 */}
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ href, label, icon: Icon, gradient, glow, bg, text }) => (
              <Link key={href} href={href} className="group">
                <div className={`
                    relative overflow-hidden h-28 flex flex-col items-center justify-center gap-2.5
                    rounded-2xl border border-border/30 bg-card/50 backdrop-blur-md
                    transition-all duration-300
                    hover:-translate-y-1 hover:shadow-xl ${glow}
                    hover:border-transparent
                  `}>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${gradient}`} />
                  <div className={`relative p-2.5 rounded-xl transition-all duration-300 ${bg}`}>
                    <Icon className={`h-5 w-5 transition-colors duration-300 ${text}`} />
                  </div>
                  <span className="relative text-sm font-medium text-foreground group-hover:text-white transition-colors duration-300">{label}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Unified Activity Feed */}
          <Card className="flex-1 bg-card/50 backdrop-blur-md border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Activity className="h-4 w-4 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UnifiedActivityFeed items={activityItems} />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Focus Widget + Calendar + Countdowns */}
        <div className="md:col-span-1 flex flex-col gap-5">
          <FocusWidget initialTasks={todaysTasks} today={today} />
          <GoogleCalendarWidget />
          <CountdownWidget />
        </div>
      </div>
    </div>
  )
}
