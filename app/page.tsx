
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, PenLine, Plus, Scale, StickyNote } from "lucide-react"
import { Clock } from "@/components/Clock"
import { Greeting } from "@/components/Greeting"
import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { TaskWidget } from "@/components/home/TaskWidget"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const today = format(new Date(), "EEEE") // e.g., "Monday"
  const todaysTasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      day: today
    }
  })

  return (
    <div className="relative min-h-full flex flex-col justify-center py-8 overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-violet-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full space-y-12">
        {/* Hero Section */}
        <div className="space-y-4 text-center md:text-left">
          <Greeting name={session.user?.name} />
          <Clock />
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/diary" className="group">
            <div className="glass-card h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 p-4 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                <PenLine className="h-6 w-6" />
              </div>
              <span className="font-medium text-sm">New Entry</span>
            </div>
          </Link>

          <Link href="/fitness" className="group">
            <div className="glass-card h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 p-4 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
              <div className="p-3 rounded-full bg-pink-500/10 text-pink-400 group-hover:bg-pink-500 group-hover:text-white transition-colors duration-300">
                <Scale className="h-6 w-6" />
              </div>
              <span className="font-medium text-sm">Log Weight</span>
            </div>
          </Link>

          <Link href="/planning" className="group">
            <div className="glass-card h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 p-4 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                <Plus className="h-6 w-6" />
              </div>
              <span className="font-medium text-sm">Add Task</span>
            </div>
          </Link>

          <Link href="/dashboard" className="group">
            <div className="glass-card h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 p-4 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1">
              <div className="p-3 rounded-full bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors duration-300">
                <StickyNote className="h-6 w-6" />
              </div>
              <span className="font-medium text-sm">Quick Note</span>
            </div>
          </Link>
        </div>

        {/* Widgets Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="glass border-0 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-light">
                <Activity className="h-5 w-5 text-primary" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                No recent activity to show.
              </div>
            </CardContent>
          </Card>

          <TaskWidget initialTasks={todaysTasks} today={today} />
        </div>
      </div>
    </div>
  )
}
