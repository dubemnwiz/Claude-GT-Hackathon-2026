"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calculator, Scaling, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface PlateCalculatorProps {
  weight: number
  onClose?: () => void
}

const AVAILABLE_PLATES = [45, 25, 10, 5, 2.5]

export function PlateCalculator({ weight }: { weight: number }) {
  const barWeight = 45
  const weightPerSide = (weight - barWeight) / 2
  
  const calculatePlates = (target: number) => {
    let remaining = target
    const result: Record<number, number> = {}
    
    for (const plate of AVAILABLE_PLATES) {
      const count = Math.floor(remaining / plate)
      if (count > 0) {
        result[plate] = count
        remaining -= count * plate
      }
    }
    return result
  }

  const plates = weightPerSide > 0 ? calculatePlates(weightPerSide) : {}
  const hasPlates = Object.keys(plates).length > 0

  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plate Map</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">Per Side (45lb Bar)</span>
      </div>

      {weight < barWeight ? (
        <p className="text-xs text-muted-foreground italic text-center py-2">Weight is less than the bar.</p>
      ) : !hasPlates ? (
        <p className="text-xs text-muted-foreground italic text-center py-2">Empty Bar.</p>
      ) : (
        <div className="flex flex-wrap gap-2 justify-center py-2">
          {Object.entries(plates).sort((a,b) => Number(b[0]) - Number(a[0])).map(([plate, count]) => (
            <div key={plate} className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full border-2 flex items-center justify-center text-[10px] font-bold shadow-sm",
                plate === "45" ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400" :
                plate === "25" ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400" :
                plate === "10" ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400" :
                "bg-muted border-border/40 text-muted-foreground"
              )}>
                {plate}
              </div>
              <span className="text-[10px] font-medium mt-1">× {count}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-1.5 p-2 rounded-lg bg-primary/5 border border-primary/10">
        <Info className="w-3 h-3 text-primary shrink-0" />
        <p className="text-[10px] text-primary/80 leading-tight">Total: {weight} lbs ({weightPerSide} lbs per side)</p>
      </div>
    </div>
  )
}
