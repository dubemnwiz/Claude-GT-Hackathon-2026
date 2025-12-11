"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react"

interface GameProps {
    level: number
    onLevelComplete: (score: number) => void
}

type GameState = "MENU" | "PLAYING" | "WICKET" | "WON" | "LOST"
type ShotType = "NONE" | "STRAIGHT" | "OFF" | "LEG"

export function StickCricket({ level, onLevelComplete }: GameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [score, setScore] = useState(0)
    const [wickets, setWickets] = useState(0)
    const [overs, setOvers] = useState(0)
    const [balls, setBalls] = useState(0)
    const [target, setTarget] = useState(0)
    const [gameState, setGameState] = useState<GameState>("MENU")
    const [message, setMessage] = useState("")

    // Game Constants
    const TOTAL_OVERS = 5
    const WICKET_limit = 10

    // Game State Mutable Refs
    const ball = useRef({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, active: false, bowled: false, hit: false })
    const batter = useRef({ swing: 0, shotType: "NONE" as ShotType, timing: 0 })
    const game = useRef({
        frame: 0,
        lastTime: 0,
        bowlerTimer: 0,
        runsScoredThisBall: 0,
        animationId: 0
    })

    const resetMatch = useCallback(() => {
        setScore(0)
        setWickets(0)
        setOvers(0)
        setBalls(0)
        setGameState("MENU")
        ball.current = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, active: false, bowled: false, hit: false }
        if (game.current.animationId) cancelAnimationFrame(game.current.animationId)
    }, [])

    useEffect(() => {
        setTarget(40 + (level * 10))
        resetMatch()
        return () => {
            if (game.current.animationId) cancelAnimationFrame(game.current.animationId)
        }
    }, [level, resetMatch])

    const processDeliveryOutcome = useCallback((runs = 0) => {
        // Reset Ball
        ball.current.active = false
        ball.current.bowled = false
        ball.current.hit = false
        game.current.bowlerTimer = performance.now() + 2000

        setBalls(prevBalls => {
            const nextBalls = prevBalls + 1
            if (nextBalls >= 6) {
                setOvers(prev => prev + 1)
                return 0
            }
            return nextBalls
        })

        if (runs === 0 && !ball.current.hit) {
            setWickets(prev => prev + 1)
            setMessage("WICKET!")
            setTimeout(() => setMessage(""), 1500)
        } else {
            setScore(prev => prev + runs)
            setMessage(`${runs} RUNS!`)
            setTimeout(() => setMessage(""), 1000)
        }
    }, [])

    // Check win/loss conditions in a separate effect to avoid updates during loop
    useEffect(() => {
        if (gameState !== "PLAYING") return

        if (score >= target) {
            setGameState("WON")
            onLevelComplete(score)
        } else if (wickets >= WICKET_limit || overs >= TOTAL_OVERS) {
            setGameState("LOST")
        }
    }, [score, wickets, overs, target, gameState, onLevelComplete, WICKET_limit, TOTAL_OVERS])


    const hitBall = (shot: ShotType, timing: number) => {
        ball.current.hit = true
        ball.current.vz = 0.05

        let power = 15;
        if (timing < 0.1) power = 25;

        if (shot === "STRAIGHT") {
            ball.current.vy = -power
            ball.current.vx = (Math.random() - 0.5) * 2
        } else if (shot === "OFF") {
            ball.current.vx = power
            ball.current.vy = -power * 0.5
        } else if (shot === "LEG") {
            ball.current.vx = -power
            ball.current.vy = -power * 0.5
        }

        let runs = 0
        if (power > 20) runs = 6
        else if (power > 12) runs = 4
        else runs = Math.random() > 0.5 ? 2 : 1

        game.current.runsScoredThisBall = runs
    }

    const handleInput = useCallback((shot: ShotType) => {
        if (gameState !== "PLAYING") return
        if (batter.current.shotType !== "NONE") return

        batter.current.shotType = shot
        batter.current.swing = 1

        if (ball.current.active && !ball.current.hit && ball.current.z > 0.8 && ball.current.z < 1.1) {
            const timing = Math.abs(1.0 - ball.current.z);
            hitBall(shot, timing)
        }
    }, [gameState])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return
            switch (e.key) {
                case "ArrowLeft": handleInput("LEG"); break;
                case "ArrowRight": handleInput("OFF"); break;
                case "ArrowUp": handleInput("STRAIGHT"); break;
                case "w": handleInput("STRAIGHT"); break;
                case "a": handleInput("LEG"); break;
                case "d": handleInput("OFF"); break;
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [gameState, handleInput])

    // Main Game Loop Effect
    useEffect(() => {
        if (gameState !== "PLAYING") return

        const loop = (time: number) => {
            const ctx = canvasRef.current?.getContext("2d")
            if (!ctx || !canvasRef.current) return

            const width = canvasRef.current.width
            const height = canvasRef.current.height

            // Clear
            ctx.fillStyle = "#4ade80"
            ctx.fillRect(0, 0, width, height)

            // Draw Pitch
            ctx.fillStyle = "#eab308"
            ctx.fillRect(width / 2 - 40, height / 2 - 100, 80, height / 2 + 100)

            // Draw Crease
            ctx.strokeStyle = "white"
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(width / 2 - 60, height - 100)
            ctx.lineTo(width / 2 + 60, height - 100)
            ctx.stroke()

            // --- UPDATE LOGIC ---
            if (!ball.current.active && !ball.current.bowled && time > game.current.bowlerTimer) {
                ball.current.active = true
                ball.current.bowled = true
                ball.current.x = width / 2
                ball.current.y = height / 2 - 100
                ball.current.z = 0

                ball.current.vy = 6
                const swing = (Math.random() - 0.5) * 2
                ball.current.vx = swing
            }

            if (ball.current.active) {
                if (!ball.current.hit) {
                    ball.current.z += 0.02
                    ball.current.x += ball.current.vx
                    ball.current.y += ball.current.vy * (ball.current.z * 0.5 + 0.5)

                    if (ball.current.z > 1.2) {
                        processDeliveryOutcome(0)
                    }
                } else {
                    ball.current.x += ball.current.vx
                    ball.current.y += ball.current.vy

                    if (ball.current.x < 0 || ball.current.x > width || ball.current.y < 0) {
                        processDeliveryOutcome(game.current.runsScoredThisBall)
                    }
                }
            }

            if (batter.current.swing > 0) {
                batter.current.swing += 0.1
                if (batter.current.swing > 2) {
                    batter.current.swing = 0
                    batter.current.shotType = "NONE"
                }
            }

            // --- DRAWING ---
            ctx.fillStyle = "white"
            ctx.fillRect(width / 2 - 10, height - 120, 5, 40)
            ctx.fillRect(width / 2, height - 120, 5, 40)
            ctx.fillRect(width / 2 + 10, height - 120, 5, 40)

            ctx.strokeStyle = "black"
            ctx.lineWidth = 3
            const bx = width / 2 - 30;
            const by = height - 100;

            ctx.beginPath(); ctx.arc(bx, by - 50, 10, 0, Math.PI * 2); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(bx, by - 40); ctx.lineTo(bx, by); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - 10, by + 20); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 10, by + 20); ctx.stroke()

            const swingAngle = batter.current.swing > 0 ? (Math.PI / 2) - batter.current.swing * 2 : Math.PI / 4
            const handX = bx + 20 * Math.cos(swingAngle)
            const handY = by - 30 + 20 * Math.sin(swingAngle)

            ctx.beginPath(); ctx.moveTo(bx, by - 30); ctx.lineTo(handX, handY); ctx.stroke()
            ctx.strokeStyle = "#854d0e"
            ctx.lineWidth = 6
            ctx.beginPath()
            ctx.moveTo(handX, handY)
            const batEndX = handX + 40 * Math.cos(swingAngle + 0.5)
            const batEndY = handY + 40 * Math.sin(swingAngle + 0.5)
            ctx.lineTo(batEndX, batEndY)
            ctx.stroke()

            if (ball.current.active) {
                let scale = 1;
                if (!ball.current.hit) scale = 0.5 + (ball.current.z * 0.5)
                else scale = 1.0 - (Math.abs(ball.current.y) / 1000)

                if (scale < 0.1) scale = 0.1

                ctx.fillStyle = "#ef4444"
                ctx.beginPath()
                ctx.arc(ball.current.x, ball.current.y, 6 * scale, 0, Math.PI * 2)
                ctx.fill()
            }

            game.current.animationId = requestAnimationFrame(loop)
        }

        game.current.animationId = requestAnimationFrame(loop)
        return () => cancelAnimationFrame(game.current.animationId)

    }, [gameState, processDeliveryOutcome])

    const startGame = () => {
        setGameState("PLAYING")
        game.current.bowlerTimer = performance.now() + 2000
    }

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative">
                {/* Scoreboard */}
                <div className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-md text-white p-4 flex justify-between items-center z-10">
                    <div>
                        <div className="text-sm text-zinc-400">Target</div>
                        <div className="text-xl font-bold">{target}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold">{score} / {wickets}</div>
                        <div className="text-sm text-zinc-400">{overs}.{balls} Overs</div>
                    </div>
                    <div>
                        <div className="text-sm text-zinc-400">Level</div>
                        <div className="text-xl font-bold">{level}</div>
                    </div>
                </div>

                {/* Game Overlay Messages */}
                {message && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            className="text-6xl font-black text-white drop-shadow-lg stroke-black"
                        >
                            {message}
                        </motion.div>
                    </div>
                )}

                {/* START MENU */}
                {gameState === "MENU" && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30 space-y-4">
                        <h2 className="text-4xl font-bold text-white mb-4">Match {level}: vs England</h2>
                        <div className="flex gap-4 text-white text-sm">
                            <div className="flex flex-col items-center"><ArrowLeft className="mb-1" /> Leg Side</div>
                            <div className="flex flex-col items-center"><ArrowUp className="mb-1" /> Straight</div>
                            <div className="flex flex-col items-center"><ArrowRight className="mb-1" /> Off Side</div>
                        </div>
                        <Button onClick={startGame} size="lg" className="text-lg px-8">Start Match</Button>
                    </div>
                )}

                {/* GAME OVER SCREENS */}
                {gameState === "WON" && (
                    <div className="absolute inset-0 bg-green-900/90 flex flex-col items-center justify-center z-30">
                        <h2 className="text-4xl font-bold text-white mb-4">YOU WON!</h2>
                        <p className="text-white mb-6">Target chased successfully.</p>
                        <Button onClick={() => window.location.reload()} variant="secondary">Next Match</Button>
                    </div>
                )}

                {gameState === "LOST" && (
                    <div className="absolute inset-0 bg-red-900/90 flex flex-col items-center justify-center z-30">
                        <h2 className="text-4xl font-bold text-white mb-4">YOU LOST</h2>
                        <p className="text-white mb-6">Better luck next time.</p>
                        <Button onClick={resetMatch} variant="secondary"><RotateCcw className="mr-2 h-4 w-4" /> Try Again</Button>
                    </div>
                )}


                <canvas
                    ref={canvasRef}
                    width={400}
                    height={600}
                    className="bg-green-500 cursor-none"
                    style={{ maxHeight: '70vh' }}
                />
            </div>

            <div className="mt-4 text-sm text-muted-foreground">
                Use Arrow Keys to Bat
            </div>
        </div>
    )
}
