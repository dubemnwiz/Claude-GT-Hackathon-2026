"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Book, Dumbbell, Scale, ChevronRight, LogOut, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"

interface MobileActionDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileActionDrawer({ isOpen, onClose }: MobileActionDrawerProps) {
  const router = useRouter()
  const [noteText, setNoteText] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const actions = [
    {
      id: "diary",
      label: "Quick Diary Note",
      description: "Capture your thoughts instantly",
      icon: Book,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      href: "/diary"
    },
    {
      id: "workout",
      label: "Start Workout",
      description: "Hit the gym and track sets",
      icon: Dumbbell,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      href: "/fitness?tab=Workouts"
    },
    {
      id: "weight",
      label: "Log Weight",
      description: "Update your latest stats",
      icon: Scale,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
      href: "/fitness?tab=Weight"
    }
  ]

  const handleAction = (href: string) => {
    onClose()
    router.push(href)
  }

  const handleSaveNote = async () => {
    const content = noteText.trim()
    if (!content || saving) return
    setSaving(true)
    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        body: JSON.stringify({ content, date: new Date().toISOString() }),
        headers: { "Content-Type": "application/json" }
      })
      if (res.ok) {
        setNoteText("")
        setSaved(true)
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50)
        setTimeout(() => {
          setSaved(false)
          onClose()
        }, 1200)
      }
    } catch (err) {
      console.error("Quick note failed", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-card border-t border-border/40 rounded-t-[2.5rem] shadow-2xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}
          >
            <div className="p-6 space-y-5">
              {/* Grab Handle */}
              <div className="w-12 h-1.5 bg-muted/60 rounded-full mx-auto" />

              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Quick Actions</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action.href)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/40 transition-all group"
                  >
                    <div className={cn("p-3 rounded-xl transition-colors", action.bg)}>
                      <action.icon className={cn("w-5 h-5", action.color)} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-foreground text-sm">{action.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{action.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>

              {/* Quick Mind Dump */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-primary rounded-full" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70">Instant Mind Dump</span>
                </div>
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={textareaRef}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="What's on your mind?"
                    rows={2}
                    className="flex-1 bg-muted/20 border border-border/40 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/40"
                  />
                  <button
                    onClick={handleSaveNote}
                    disabled={!noteText.trim() || saving}
                    className={cn(
                      "flex items-center justify-center w-11 h-11 rounded-2xl transition-all shrink-0",
                      saved
                        ? "bg-emerald-500 text-white"
                        : "bg-primary text-primary-foreground disabled:opacity-40"
                    )}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {saved && (
                  <p className="text-xs text-emerald-500 font-medium pl-1">Saved to diary ✓</p>
                )}
              </div>

              {/* Settings row — theme + logout */}
              <div className="flex items-center justify-between pt-2 border-t border-border/20">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Theme</span>
                  <ThemeSwitcher />
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
