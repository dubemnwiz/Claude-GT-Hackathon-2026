"use client"

import { useState, useEffect } from "react"
import { format, parseISO, isValid } from "date-fns"
import { Calendar, Clock, ExternalLink } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface CalEvent {
    id:       string
    summary:  string | null | undefined
    start:    string | null | undefined
    end:      string | null | undefined
    isAllDay: boolean
}

function formatEventTime(start: string | null | undefined, isAllDay: boolean): string {
    if (!start) return ""
    if (isAllDay) return "All day"
    try {
        const d = parseISO(start)
        if (!isValid(d)) return ""
        return format(d, "h:mm a")
    } catch {
        return ""
    }
}

// Maps hour-of-day to a subtle color accent
function accentForHour(start: string | null | undefined, isAllDay: boolean): string {
    if (isAllDay || !start) return "bg-primary/40"
    try {
        const hour = parseISO(start).getHours()
        if (hour < 9)  return "bg-violet-400"
        if (hour < 12) return "bg-sky-400"
        if (hour < 17) return "bg-emerald-400"
        return "bg-amber-400"
    } catch {
        return "bg-primary/40"
    }
}

export function GoogleCalendarWidget() {
    const [events,    setEvents]    = useState<CalEvent[]>([])
    const [connected, setConnected] = useState<boolean | null>(null) // null = loading
    const [error,     setError]     = useState(false)

    useEffect(() => {
        const s = new Date()
        s.setHours(0,0,0,0)
        const e = new Date()
        e.setHours(23,59,59,999)

        fetch(`/api/calendar/today?timeMin=${s.toISOString()}&timeMax=${e.toISOString()}`)
            .then(r => r.json())
            .then(data => {
                setConnected(data.connected ?? false)
                setEvents(data.events ?? [])
            })
            .catch(() => setError(true))
    }, [])

    const today = format(new Date(), "EEEE, MMM d")

    return (
        <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-md p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold leading-none">Today</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{today}</p>
                    </div>
                </div>
                <a
                    href="https://calendar.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/60"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>

            {/* Body */}
            <AnimatePresence mode="wait">
                {/* Loading */}
                {connected === null && !error && (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="space-y-2">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="h-9 rounded-lg bg-muted/40 animate-pulse" />
                        ))}
                    </motion.div>
                )}

                {/* Not connected */}
                {connected === false && !error && (
                    <motion.div key="disconnected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center py-3 text-center gap-1.5">
                        <Calendar className="h-7 w-7 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">Sign in with Google to see your calendar here.</p>
                    </motion.div>
                )}

                {/* Error */}
                {error && (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="text-xs text-muted-foreground text-center py-3">
                        Could not load events
                    </motion.div>
                )}

                {/* No events */}
                {connected === true && !error && events.length === 0 && (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-col items-center py-3 text-center gap-1.5">
                        <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                        <p className="text-xs text-muted-foreground">Nothing scheduled — enjoy the free day.</p>
                    </motion.div>
                )}

                {/* Events list */}
                {connected === true && !error && events.length > 0 && (
                    <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="space-y-1.5">
                        {events.map((ev, i) => {
                            const time   = formatEventTime(ev.start, ev.isAllDay)
                            const accent = accentForHour(ev.start, ev.isAllDay)
                            return (
                                <motion.div
                                    key={ev.id ?? i}
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className={cn(
                                        "flex items-center gap-2.5 px-2.5 py-2 rounded-xl",
                                        "bg-muted/30 hover:bg-muted/50 transition-colors"
                                    )}
                                >
                                    <span className={cn("w-1 h-6 rounded-full shrink-0", accent)} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold truncate text-foreground">{ev.summary ?? "Untitled event"}</p>
                                        {time && <p className="text-[10px] text-foreground/70 dark:text-muted-foreground font-medium">{time}</p>}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
