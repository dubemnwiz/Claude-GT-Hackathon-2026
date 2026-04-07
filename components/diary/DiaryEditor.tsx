"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Cloud, CloudOff, Check } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const MOODS = [
    { value: "GOOD", emoji: "😊", label: "Good",  active: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30", ring: "ring-2 ring-emerald-400/50" },
    { value: "MID",  emoji: "😐", label: "Okay",  active: "bg-amber-400 text-white shadow-lg shadow-amber-400/30",   ring: "ring-2 ring-amber-300/50" },
    { value: "BAD",  emoji: "😞", label: "Rough", active: "bg-rose-500 text-white shadow-lg shadow-rose-500/30",     ring: "ring-2 ring-rose-400/50" },
]

type SaveStatus = "idle" | "saving" | "saved" | "error"

export function DiaryEditor({ date }: { date: string }) {
    const router = useRouter()
    const [content, setContent] = useState("")
    const [rating, setRating] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
    const isFirstLoad = useRef(true)

    const debouncedContent = useDebounce(content, 1200)
    const debouncedRating = useDebounce(rating, 400)

    // Load existing entry
    useEffect(() => {
        const fetchEntry = async () => {
            try {
                const res = await fetch(`/api/diary?date=${date}`)
                if (res.ok) {
                    const data = await res.json()
                    setContent(data.content || "")
                    setRating(data.rating || null)
                }
            } finally {
                setIsLoading(false)
            }
        }
        fetchEntry()
    }, [date])

    // Auto-save when content or rating changes (skip the initial load)
    useEffect(() => {
        if (isFirstLoad.current) {
            isFirstLoad.current = false
            return
        }
        if (isLoading) return

        const save = async () => {
            setSaveStatus("saving")
            try {
                const res = await fetch("/api/diary", {
                    method: "POST",
                    body: JSON.stringify({ date, content: debouncedContent, rating: debouncedRating }),
                    headers: { "Content-Type": "application/json" },
                })
                setSaveStatus(res.ok ? "saved" : "error")
                if (res.ok) {
                    setTimeout(() => setSaveStatus("idle"), 2500)
                }
            } catch {
                setSaveStatus("error")
            }
        }

        save()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedContent, debouncedRating])

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4">
                <div className="h-12 rounded-2xl bg-muted/50 animate-pulse" />
                <div className="h-[300px] md:h-[520px] rounded-2xl bg-muted/50 animate-pulse" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={() => router.push("/diary")}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-xl hover:bg-muted/60"
                >
                    <ArrowLeft className="h-4 w-4" />
                    All Entries
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Mood picker */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium hidden sm:block">How was your day?</span>
                    <div className="flex items-center gap-1.5">
                        {MOODS.map(mood => (
                            <motion.button
                                key={mood.value}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => {
                                    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
                                        window.navigator.vibrate(10);
                                    }
                                    setRating(prev => prev === mood.value ? null : mood.value);
                                }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200",
                                    rating === mood.value
                                        ? `${mood.active} ${mood.ring}`
                                        : "bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                )}
                            >
                                <span className="text-base leading-none">{mood.emoji}</span>
                                <span>{mood.label}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Save status */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={saveStatus}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium",
                            saveStatus === "saving" && "bg-muted/50 text-muted-foreground",
                            saveStatus === "saved"  && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                            saveStatus === "error"  && "bg-rose-500/10 text-rose-500",
                            saveStatus === "idle"   && "opacity-0 pointer-events-none",
                        )}
                    >
                        {saveStatus === "saving" && <><Cloud className="h-3.5 w-3.5 animate-pulse" /> Saving…</>}
                        {saveStatus === "saved"  && <><Check className="h-3.5 w-3.5" /> Saved</>}
                        {saveStatus === "error"  && <><CloudOff className="h-3.5 w-3.5" /> Error</>}
                        {saveStatus === "idle"   && <span />}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Writing area */}
            <div
                className={cn(
                    "relative rounded-2xl border border-border/30 overflow-hidden",
                    "bg-card/60 backdrop-blur-md",
                    "min-h-[300px] md:min-h-[520px]",
                )}
            >
                {/* Lined paper lines */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: "repeating-linear-gradient(transparent, transparent 31px, hsl(var(--border) / 0.5) 31px, hsl(var(--border) / 0.5) 32px)",
                        backgroundPosition: "0 56px",
                    }}
                />

                <textarea
                    className={cn(
                        "relative w-full min-h-[300px] md:min-h-[520px] resize-none outline-none bg-transparent",
                        "text-base leading-8 text-foreground placeholder:text-muted-foreground/40",
                        "px-4 md:px-8 pt-6 pb-8",
                        "font-[inherit]",
                    )}
                    placeholder="What's on your mind…"
                    value={content}
                    onChange={e => {
                        setContent(e.target.value)
                        setSaveStatus("idle")
                    }}
                    // Only auto-focus on desktop — on iOS it immediately pops the keyboard
                    // which collapses the toolbar before the user can rate their day
                    autoFocus={typeof window !== "undefined" && window.innerWidth >= 640}
                />
            </div>

            <p className="text-xs text-muted-foreground text-center">
                Changes are saved automatically
            </p>
        </div>
    )
}
