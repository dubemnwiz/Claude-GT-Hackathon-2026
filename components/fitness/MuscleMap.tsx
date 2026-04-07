"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { MuscleGroup } from "@/lib/muscle-mapping"

interface MuscleMapProps {
  heatMap: Record<MuscleGroup, number> // 0 to 1
  className?: string
}

export function MuscleMap({ heatMap, className }: MuscleMapProps) {
  const getMuscleStyle = (group: MuscleGroup) => {
    const intensity = heatMap[group] || 0
    return {
      fill: intensity > 0
        ? `rgba(16, 185, 129, ${Math.max(0.35, 0.2 + intensity * 0.8)})`
        : "rgba(156, 163, 175, 0.12)",
      stroke: intensity > 0
        ? `rgba(16, 185, 129, ${Math.max(0.5, 0.4 + intensity * 0.6)})`
        : "rgba(156, 163, 175, 0.25)",
      transition: { duration: 0.5 }
    }
  }

  return (
    <div className={cn("relative flex items-center justify-center gap-8", className)}>
      {/* Front View */}
      <div className="relative w-32 h-64">
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-50">Front</span>
        <svg viewBox="0 0 100 200" className="w-full h-full">
          {/* Head & Neck */}
          <path d="M45,5 Q50,0 55,5 L55,15 Q50,18 45,15 Z" fill="rgba(156, 163, 175, 0.2)" />
          
          {/* Chest */}
          <motion.path 
            d="M30,25 Q50,20 70,25 L70,45 Q50,55 30,45 Z" 
            {...getMuscleStyle("chest" as MuscleGroup)}
            initial={false}
          />
          
          {/* Abs */}
          <motion.path 
            d="M35,50 Q50,48 65,50 L62,85 Q50,88 38,85 Z" 
            {...getMuscleStyle("abs" as MuscleGroup)}
            initial={false}
          />
          
          {/* Shoulders (Front) */}
          <motion.path d="M22,25 Q30,20 35,28 L32,35 Q25,32 22,25 Z" {...getMuscleStyle("shoulders" as MuscleGroup)} />
          <motion.path d="M78,25 Q70,20 65,28 L68,35 Q75,32 78,25 Z" {...getMuscleStyle("shoulders" as MuscleGroup)} />
          
          {/* Arms (Biceps) */}
          <motion.path d="M23,38 Q25,55 28,70 L18,70 Q15,55 18,38 Z" {...getMuscleStyle("biceps" as MuscleGroup)} />
          <motion.path d="M77,38 Q75,55 72,70 L82,70 Q85,55 82,38 Z" {...getMuscleStyle("biceps" as MuscleGroup)} />
          
          {/* Quads */}
          <motion.path d="M35,95 Q48,93 48,140 L30,135 Q30,95 35,95 Z" {...getMuscleStyle("quads" as MuscleGroup)} />
          <motion.path d="M65,95 Q52,93 52,140 L70,135 Q70,95 65,95 Z" {...getMuscleStyle("quads" as MuscleGroup)} />
          
          {/* Calves (Front - subtle) */}
          <motion.path d="M32,145 Q45,145 45,185 L35,185 Z" {...getMuscleStyle("calves" as MuscleGroup)} />
          <motion.path d="M68,145 Q55,145 55,185 L65,185 Z" {...getMuscleStyle("calves" as MuscleGroup)} />
        </svg>
      </div>

      {/* Back View */}
      <div className="relative w-32 h-64">
        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground opacity-50">Back</span>
        <svg viewBox="0 0 100 200" className="w-full h-full">
          {/* Back (Upper) */}
          <motion.path 
            d="M25,25 Q50,15 75,25 L70,60 Q50,70 30,60 Z" 
            {...getMuscleStyle("back" as MuscleGroup)}
            initial={false}
          />
          
          {/* Triceps */}
          <motion.path d="M20,30 Q15,50 15,70 L25,70 Q25,50 25,30 Z" {...getMuscleStyle("triceps" as MuscleGroup)} />
          <motion.path d="M80,30 Q85,50 85,70 L75,70 Q75,50 75,30 Z" {...getMuscleStyle("triceps" as MuscleGroup)} />
          
          {/* Glutes */}
          <motion.path d="M35,88 Q50,85 65,88 L68,110 Q50,120 32,110 Z" {...getMuscleStyle("glutes" as MuscleGroup)} />
          
          {/* Hamstrings */}
          <motion.path d="M35,115 Q48,115 48,155 L32,155 Z" {...getMuscleStyle("hamstrings" as MuscleGroup)} />
          <motion.path d="M65,115 Q52,115 52,155 L68,155 Z" {...getMuscleStyle("hamstrings" as MuscleGroup)} />
          
          {/* Calves (Back) */}
          <motion.path d="M32,160 Q45,160 45,195 L35,195 Z" {...getMuscleStyle("calves" as MuscleGroup)} />
          <motion.path d="M68,160 Q55,160 55,195 L65,195 Z" {...getMuscleStyle("calves" as MuscleGroup)} />
        </svg>
      </div>
    </div>
  )
}
