"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { MuscleGroup } from "@/lib/muscle-mapping"

interface MuscleMapProps {
  heatMap: Record<MuscleGroup, number>
  className?: string
}

export function MuscleMap({ heatMap, className }: MuscleMapProps) {
  const ms = (group: MuscleGroup) => {
    const intensity = heatMap[group] || 0
    return {
      fill: intensity > 0
        ? `rgba(16, 185, 129, ${Math.max(0.38, 0.22 + intensity * 0.78)})`
        : "rgba(100, 116, 139, 0.16)",
      stroke: intensity > 0
        ? `rgba(52, 211, 153, ${Math.max(0.6, 0.38 + intensity * 0.62)})`
        : "rgba(100, 116, 139, 0.28)",
      strokeWidth: intensity > 0 ? 0.7 : 0.4,
    }
  }

  const neutral = {
    fill: "rgba(148, 163, 184, 0.13)",
    stroke: "rgba(148, 163, 184, 0.22)",
    strokeWidth: 0.5,
  }

  return (
    <div className={cn("relative flex items-center justify-center gap-4", className)}>

      {/* ════════════════════════ FRONT VIEW ════════════════════════ */}
      <div className="relative flex flex-col items-center gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">Front</span>
        <svg viewBox="0 0 100 215" className="w-28 h-60">

          {/* ── Body outline silhouette ── */}
          {/* Head */}
          <ellipse cx="50" cy="10" rx="9" ry="10" {...neutral} />
          {/* Neck */}
          <path d="M46,19 L54,19 L54,25 L46,25 Z" {...neutral} />
          {/* Torso */}
          <path d="M22,28 Q50,24 78,28 L74,88 Q62,94 50,94 Q38,94 26,88 Z" {...neutral} />
          {/* Left upper arm */}
          <path d="M22,30 Q14,38 13,68 L21,68 Q22,38 26,30 Z" {...neutral} />
          {/* Right upper arm */}
          <path d="M78,30 Q86,38 87,68 L79,68 Q78,38 74,30 Z" {...neutral} />
          {/* Left forearm */}
          <path d="M13,68 Q11,82 12,97 L19,96 Q19,82 21,68 Z" {...neutral} />
          {/* Right forearm */}
          <path d="M87,68 Q89,82 88,97 L81,96 Q81,82 79,68 Z" {...neutral} />
          {/* Left thigh */}
          <path d="M26,94 Q22,114 24,148 L38,148 Q37,114 36,94 Z" {...neutral} />
          {/* Right thigh */}
          <path d="M74,94 Q78,114 76,148 L62,148 Q63,114 64,94 Z" {...neutral} />
          {/* Left lower leg */}
          <path d="M24,150 Q22,170 25,200 L38,198 Q36,170 38,150 Z" {...neutral} />
          {/* Right lower leg */}
          <path d="M76,150 Q78,170 75,200 L62,198 Q64,170 62,150 Z" {...neutral} />

          {/* ── Traps (front visible) ── */}
          <motion.path d="M46,22 Q36,25 22,30 L26,35 Q38,30 48,27 Z" {...ms("back")} initial={false} />
          <motion.path d="M54,22 Q64,25 78,30 L74,35 Q62,30 52,27 Z" {...ms("back")} initial={false} />

          {/* ── Deltoids (anterior + lateral) ── */}
          <motion.path d="M22,28 Q15,32 13,46 Q15,52 19,54 L21,46 Q19,40 24,32 Z" {...ms("shoulders")} initial={false} />
          <motion.path d="M78,28 Q85,32 87,46 Q85,52 81,54 L79,46 Q81,40 76,32 Z" {...ms("shoulders")} initial={false} />

          {/* ── Pectoralis Major ── */}
          {/* Left pec */}
          <motion.path d="M26,32 Q28,28 50,27 L50,46 Q40,52 30,50 Q24,46 26,32 Z" {...ms("chest")} initial={false} />
          {/* Right pec */}
          <motion.path d="M74,32 Q72,28 50,27 L50,46 Q60,52 70,50 Q76,46 74,32 Z" {...ms("chest")} initial={false} />
          {/* Pec separation line */}
          <line x1="50" y1="27" x2="50" y2="46" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" />

          {/* ── Biceps ── */}
          <motion.path d="M13,44 Q11,56 13,70 L20,68 Q19,56 20,46 Z" {...ms("biceps")} initial={false} />
          <motion.path d="M87,44 Q89,56 87,70 L80,68 Q81,56 80,46 Z" {...ms("biceps")} initial={false} />

          {/* ── Brachialis (side of upper arm) ── */}
          <motion.path d="M20,46 Q21,58 21,68 L16,68 Q15,58 16,46 Z" {...ms("biceps")} initial={false} />
          <motion.path d="M80,46 Q79,58 79,68 L84,68 Q85,58 84,46 Z" {...ms("biceps")} initial={false} />

          {/* ── Forearms ── */}
          <motion.path d="M11,68 Q9,82 10,97 L17,96 Q17,82 19,68 Z" {...ms("forearms")} initial={false} />
          <motion.path d="M89,68 Q91,82 90,97 L83,96 Q83,82 81,68 Z" {...ms("forearms")} initial={false} />

          {/* ── Serratus Anterior ── */}
          <motion.path d="M27,50 Q24,53 23,57 Q26,56 29,53 Z" {...ms("abs")} initial={false} />
          <motion.path d="M27,56 Q23,60 24,65 Q27,62 30,59 Z" {...ms("abs")} initial={false} />
          <motion.path d="M73,50 Q76,53 77,57 Q74,56 71,53 Z" {...ms("abs")} initial={false} />
          <motion.path d="M73,56 Q77,60 76,65 Q73,62 70,59 Z" {...ms("abs")} initial={false} />

          {/* ── Rectus Abdominis (6 sections) ── */}
          <motion.rect x="38" y="50" width="11" height="8" rx="1.5" {...ms("abs")} initial={false} />
          <motion.rect x="51" y="50" width="11" height="8" rx="1.5" {...ms("abs")} initial={false} />
          <motion.rect x="38" y="60" width="11" height="8" rx="1.5" {...ms("abs")} initial={false} />
          <motion.rect x="51" y="60" width="11" height="8" rx="1.5" {...ms("abs")} initial={false} />
          <motion.rect x="39" y="70" width="10" height="8" rx="1.5" {...ms("abs")} initial={false} />
          <motion.rect x="51" y="70" width="10" height="8" rx="1.5" {...ms("abs")} initial={false} />
          {/* Linea alba */}
          <line x1="50" y1="50" x2="50" y2="78" stroke="rgba(0,0,0,0.1)" strokeWidth="0.6" />

          {/* ── External Obliques ── */}
          <motion.path d="M29,56 Q26,68 28,82 L36,82 Q33,70 33,58 Z" {...ms("abs")} initial={false} />
          <motion.path d="M71,56 Q74,68 72,82 L64,82 Q67,70 67,58 Z" {...ms("abs")} initial={false} />

          {/* ── Hip Flexors / Lower abs ── */}
          <motion.path d="M36,82 Q38,89 42,93 L50,93 L50,82 Z" {...ms("abs")} initial={false} />
          <motion.path d="M64,82 Q62,89 58,93 L50,93 L50,82 Z" {...ms("abs")} initial={false} />

          {/* ── Quads ── */}
          {/* Vastus lateralis (outer) */}
          <motion.path d="M28,96 Q24,118 26,144 L34,142 Q32,120 32,96 Z" {...ms("quads")} initial={false} />
          <motion.path d="M72,96 Q76,118 74,144 L66,142 Q68,120 68,96 Z" {...ms("quads")} initial={false} />
          {/* Rectus femoris (center) */}
          <motion.path d="M33,96 Q32,118 33,144 L43,142 Q42,118 40,96 Z" {...ms("quads")} initial={false} />
          <motion.path d="M67,96 Q68,118 67,144 L57,142 Q58,118 60,96 Z" {...ms("quads")} initial={false} />
          {/* Vastus medialis (teardrop) */}
          <motion.path d="M37,132 Q35,142 40,148 Q44,148 46,142 Q44,136 40,132 Z" {...ms("quads")} initial={false} />
          <motion.path d="M63,132 Q65,142 60,148 Q56,148 54,142 Q56,136 60,132 Z" {...ms("quads")} initial={false} />

          {/* ── Tibialis Anterior (shin) ── */}
          <motion.path d="M27,152 Q25,170 27,194 L32,192 Q31,170 32,152 Z" {...ms("calves")} initial={false} />
          <motion.path d="M73,152 Q75,170 73,194 L68,192 Q69,170 68,152 Z" {...ms("calves")} initial={false} />

          {/* ── Calves visible from front ── */}
          <motion.path d="M32,152 Q38,155 37,180 L32,178 Q31,160 32,152 Z" {...ms("calves")} initial={false} />
          <motion.path d="M68,152 Q62,155 63,180 L68,178 Q69,160 68,152 Z" {...ms("calves")} initial={false} />

        </svg>
      </div>

      {/* ════════════════════════ BACK VIEW ════════════════════════ */}
      <div className="relative flex flex-col items-center gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50">Back</span>
        <svg viewBox="0 0 100 215" className="w-28 h-60">

          {/* ── Body outline silhouette ── */}
          <ellipse cx="50" cy="10" rx="9" ry="10" {...neutral} />
          <path d="M46,19 L54,19 L54,25 L46,25 Z" {...neutral} />
          <path d="M22,28 Q50,24 78,28 L74,88 Q62,94 50,94 Q38,94 26,88 Z" {...neutral} />
          <path d="M22,30 Q14,38 13,68 L21,68 Q22,38 26,30 Z" {...neutral} />
          <path d="M78,30 Q86,38 87,68 L79,68 Q78,38 74,30 Z" {...neutral} />
          <path d="M13,68 Q11,82 12,97 L19,96 Q19,82 21,68 Z" {...neutral} />
          <path d="M87,68 Q89,82 88,97 L81,96 Q81,82 79,68 Z" {...neutral} />
          <path d="M26,94 Q22,114 24,148 L38,148 Q37,114 36,94 Z" {...neutral} />
          <path d="M74,94 Q78,114 76,148 L62,148 Q63,114 64,94 Z" {...neutral} />
          <path d="M24,150 Q22,170 25,200 L38,198 Q36,170 38,150 Z" {...neutral} />
          <path d="M76,150 Q78,170 75,200 L62,198 Q64,170 62,150 Z" {...neutral} />

          {/* ── Trapezius (upper) ── */}
          <motion.path d="M46,21 Q36,24 22,30 L26,36 Q38,31 50,29 Q62,31 74,36 L78,30 Q64,24 54,21 Z" {...ms("back")} initial={false} />

          {/* ── Trapezius (mid — diamond toward lower) ── */}
          <motion.path d="M26,36 Q38,40 50,38 Q62,40 74,36 L70,55 Q60,61 50,59 Q40,61 30,55 Z" {...ms("back")} initial={false} />

          {/* ── Rear Deltoids ── */}
          <motion.path d="M22,28 Q15,32 13,46 Q15,52 19,54 L21,46 Q19,40 24,32 Z" {...ms("shoulders")} initial={false} />
          <motion.path d="M78,28 Q85,32 87,46 Q85,52 81,54 L79,46 Q81,40 76,32 Z" {...ms("shoulders")} initial={false} />

          {/* ── Infraspinatus / Teres Major ── */}
          <motion.path d="M26,40 Q22,46 22,54 Q28,57 38,55 L40,46 Q33,43 26,40 Z" {...ms("back")} initial={false} />
          <motion.path d="M74,40 Q78,46 78,54 Q72,57 62,55 L60,46 Q67,43 74,40 Z" {...ms("back")} initial={false} />

          {/* ── Latissimus Dorsi ── */}
          <motion.path d="M22,46 Q18,58 22,74 Q28,82 38,84 L40,62 Q31,60 26,54 Q23,50 22,46 Z" {...ms("back")} initial={false} />
          <motion.path d="M78,46 Q82,58 78,74 Q72,82 62,84 L60,62 Q69,60 74,54 Q77,50 78,46 Z" {...ms("back")} initial={false} />

          {/* ── Triceps ── */}
          <motion.path d="M13,44 Q11,58 12,70 L20,68 Q19,56 20,46 Z" {...ms("triceps")} initial={false} />
          <motion.path d="M87,44 Q89,58 88,70 L80,68 Q81,56 80,46 Z" {...ms("triceps")} initial={false} />

          {/* ── Forearms (back) ── */}
          <motion.path d="M11,68 Q9,82 10,97 L17,96 Q17,82 19,68 Z" {...ms("forearms")} initial={false} />
          <motion.path d="M89,68 Q91,82 90,97 L83,96 Q83,82 81,68 Z" {...ms("forearms")} initial={false} />

          {/* ── Erector Spinae (twin columns) ── */}
          <motion.path d="M44,48 Q43,66 44,84 L48,84 Q48,66 48,48 Z" {...ms("back")} initial={false} />
          <motion.path d="M56,48 Q57,66 56,84 L52,84 Q52,66 52,48 Z" {...ms("back")} initial={false} />

          {/* ── Gluteus Medius ── */}
          <motion.path d="M28,90 Q24,96 27,104 L36,102 Q33,96 32,90 Z" {...ms("glutes")} initial={false} />
          <motion.path d="M72,90 Q76,96 73,104 L64,102 Q67,96 68,90 Z" {...ms("glutes")} initial={false} />

          {/* ── Gluteus Maximus ── */}
          <motion.path d="M28,92 Q34,97 50,96 L50,114 Q35,115 27,108 Q24,101 28,92 Z" {...ms("glutes")} initial={false} />
          <motion.path d="M72,92 Q66,97 50,96 L50,114 Q65,115 73,108 Q76,101 72,92 Z" {...ms("glutes")} initial={false} />

          {/* ── Hamstrings ── */}
          {/* Biceps femoris (outer) */}
          <motion.path d="M27,116 Q23,134 26,152 L33,150 Q31,134 32,116 Z" {...ms("hamstrings")} initial={false} />
          <motion.path d="M73,116 Q77,134 74,152 L67,150 Q69,134 68,116 Z" {...ms("hamstrings")} initial={false} />
          {/* Semimembranosus/Semitendinosus (inner) */}
          <motion.path d="M34,116 Q38,134 38,152 L46,150 Q45,134 42,116 Z" {...ms("hamstrings")} initial={false} />
          <motion.path d="M66,116 Q62,134 62,152 L54,150 Q55,134 58,116 Z" {...ms("hamstrings")} initial={false} />

          {/* ── Gastrocnemius (medial + lateral heads) ── */}
          {/* Medial heads */}
          <motion.path d="M36,156 Q40,166 40,184 L46,182 Q45,166 42,156 Z" {...ms("calves")} initial={false} />
          <motion.path d="M64,156 Q60,166 60,184 L54,182 Q55,166 58,156 Z" {...ms("calves")} initial={false} />
          {/* Lateral heads */}
          <motion.path d="M30,156 Q27,166 29,182 L35,181 Q34,166 34,156 Z" {...ms("calves")} initial={false} />
          <motion.path d="M70,156 Q73,166 71,182 L65,181 Q66,166 66,156 Z" {...ms("calves")} initial={false} />

        </svg>
      </div>

    </div>
  )
}
