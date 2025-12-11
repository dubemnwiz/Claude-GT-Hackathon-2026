"use client"

import { useEffect, useState } from "react"
import { StickCricket } from "@/components/game/StickCricket"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function GamePage() {
    const [progress, setProgress] = useState<{ level: number, highScore: number } | null>(null)

    useEffect(() => {
        const fetchProgress = async () => {
            try {
                const res = await fetch("/api/game/progress")
                if (res.ok) {
                    const data = await res.json()
                    setProgress(data)
                }
            } catch (error) {
                console.error("Failed to load progress", error)
            }
        }
        fetchProgress()
    }, [])

    const handleLevelComplete = async (score: number) => {
        if (!progress) return

        try {
            await fetch("/api/game/progress", {
                method: "POST",
                body: JSON.stringify({
                    level: progress.level + 1,
                    score: score // Logic inside API handles 'highScore' validation
                }),
                headers: { "Content-Type": "application/json" }
            })
            // Refetch or update local state
            setProgress(prev => prev ? { ...prev, level: prev.level + 1, highScore: Math.max(prev.highScore, score) } : null)
        } catch (error) {
            console.error("Failed to save progress", error)
        }
    }

    if (!progress) {
        return <div className="flex items-center justify-center p-20">Loading...</div>
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Stick Cricket</h2>
                <div className="text-sm text-zinc-400">
                    High Score: <span className="text-white font-bold">{progress.highScore}</span>
                </div>
            </div>

            <div className="flex justify-center">
                <StickCricket level={progress.level} onLevelComplete={handleLevelComplete} />
            </div>
        </div>
    )
}
