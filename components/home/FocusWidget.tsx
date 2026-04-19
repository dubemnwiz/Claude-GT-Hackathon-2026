"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { format, isValid } from "date-fns"
import { CalendarDays, ArrowRight } from "lucide-react"

interface CalendarEvent {
    id: string
    summary: string
    start: string
    end: string
    isAllDay: boolean
}

function accentForHour(start: string, isAllDay: boolean): string {
    if (isAllDay) return "bg-primary"
    try {
        const hour = new Date(start).getHours()
        if (hour < 9) return "bg-primary/70"
        if (hour < 12) return "bg-primary"
        if (hour < 17) return "bg-primary/80"
        return "bg-primary/60"
    } catch {
        return "bg-primary"
    }
}

function accentTextForHour(start: string, isAllDay: boolean): string {
    if (isAllDay) return "text-primary"
    try {
        const hour = new Date(start).getHours()
        if (hour < 9) return "text-muted-foreground"
        if (hour < 12) return "text-primary"
        if (hour < 17) return "text-foreground"
        return "text-muted-foreground"
    } catch {
        return "text-primary"
    }
}

function formatTime(start: string, isAllDay: boolean): string {
    if (isAllDay) return "All day"
    try {
        const d = new Date(start)
        if (!isValid(d)) return ""
        return format(d, "h:mm a")
    } catch {
        return ""
    }
}

export function FocusWidget() {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [gcalConnected, setGcalConnected] = useState<boolean | null>(null)
    const [dateLabel, setDateLabel] = useState("")

    useEffect(() => {
        const localDate = new Date()
        setDateLabel(format(localDate, "EEEE, MMM d"))

        const fetchCal = async () => {
            try {
                const start = new Date(localDate)
                start.setHours(0, 0, 0, 0)
                const end = new Date(localDate)
                end.setHours(23, 59, 59, 999)
                const evRes = await fetch(
                    `/api/calendar/today?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`
                )
                if (evRes.ok) {
                    const data = await evRes.json()
                    setGcalConnected(data.connected ?? false)
                    setEvents(data.events ?? [])
                }
            } catch {
                /* fail silently */
            } finally {
                setLoading(false)
            }
        }
        fetchCal()
    }, [])

    const scheduleItems = [...events].sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1
        if (!a.isAllDay && b.isAllDay) return 1
        return new Date(a.start).getTime() - new Date(b.start).getTime()
    })

    return (
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-base font-bold tracking-tight leading-none">{dateLabel}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                        {loading ? "Loading…" : "Google Calendar"}
                    </p>
                </div>
            </div>

            {gcalConnected !== false && (
                <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Schedule
                    </p>

                    {loading ? (
                        <div className="space-y-2">
                            <div className="h-10 rounded-xl bg-muted/40 animate-pulse" />
                        </div>
                    ) : scheduleItems.length > 0 ? (
                        <div className="space-y-1.5">
                            {scheduleItems.map((item, i) => {
                                const accent = accentForHour(item.start, item.isAllDay)
                                const accentText = accentTextForHour(item.start, item.isAllDay)
                                const timeLabel = formatTime(item.start, item.isAllDay)
                                return (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -6 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors bg-muted/30 hover:bg-muted/50"
                                    >
                                        <span className={cn("w-0.5 h-7 rounded-full shrink-0", accent)} />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold truncate leading-snug text-foreground">
                                                {item.summary ?? "Untitled"}
                                            </p>
                                            {timeLabel && (
                                                <p className={cn("text-[10px] font-medium mt-0.5", accentText)}>
                                                    {timeLabel}
                                                </p>
                                            )}
                                        </div>
                                        <CalendarDays className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                                    </motion.div>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground px-1">Nothing scheduled today.</p>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
                <Link
                    href="/correspondent"
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                    Field Coach <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                    href="/nutrimap"
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                    NutriMap <ArrowRight className="h-3 w-3" />
                </Link>
            </div>
        </div>
    )
}
