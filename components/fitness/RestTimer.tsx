"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Timer, X, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

interface RestTimerProps {
  duration?: number // in seconds
  onComplete?: () => void
  onClose: () => void
}

export function RestTimer({ duration = 60, onComplete, onClose }: RestTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [isActive, setIsActive] = useState(true)
  const [muted, setMuted] = useState(false)

  const playSound = useCallback(() => {
    if (muted) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = "sine"
      osc.frequency.setValueAtTime(880, ctx.currentTime) // A5 note
      
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch (e) {
      console.warn("Audio Context failed", e)
    }
  }, [muted])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      playSound()
      if (navigator.vibrate) navigator.vibrate([100, 50, 100])
      onComplete?.()
      setIsActive(false)
    }
    return () => clearInterval(timer)
  }, [isActive, timeLeft, onComplete, playSound])

  const progress = (timeLeft / duration) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-card/90 backdrop-blur-xl border border-border/40 shadow-2xl rounded-2xl p-3 flex items-center gap-4 min-w-[240px]">
        {/* Progress Ring */}
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="text-muted/20"
            />
            <motion.circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="126"
              animate={{ strokeDashoffset: 126 - (126 * progress) / 100 }}
              className="text-primary"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Timer className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* Time & Controls */}
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Rest Timer</p>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-xl font-mono font-bold tabular-nums", timeLeft === 0 && "text-primary animate-pulse")}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => setMuted(!muted)}
            className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={() => setTimeLeft(duration)}
            className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
