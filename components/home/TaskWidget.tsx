"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, CheckCircle2, Circle } from "lucide-react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface Task {
    id: string
    content: string
    status: string
}

interface TaskWidgetProps {
    initialTasks: Task[]
    today: string
}

export function TaskWidget({ initialTasks, today }: TaskWidgetProps) {
    const [tasks, setTasks] = useState(initialTasks)

    const toggleTask = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "COMPLETED" ? "NOT_STARTED" : "COMPLETED"

        // Optimistic update
        setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t))

        try {
            await fetch("/api/planning", {
                method: "PUT",
                body: JSON.stringify({ id, status: newStatus }),
                headers: { "Content-Type": "application/json" },
            })
        } catch (error) {
            console.error("Failed to update task", error)
            // Revert on error
            setTasks(tasks.map(t => t.id === id ? { ...t, status: currentStatus } : t))
        }
    }

    return (
        <Card className="glass border-0 h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-light">
                    <Calendar className="h-5 w-5 text-primary" /> Today's Focus ({today})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                        {tasks.length > 0 ? (
                            tasks.map(task => (
                                <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={() => toggleTask(task.id, task.status)}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 group",
                                        task.status === 'COMPLETED'
                                            ? "bg-green-500/10 hover:bg-green-500/20"
                                            : "bg-white/5 hover:bg-white/10"
                                    )}
                                >
                                    <div className="relative">
                                        <AnimatePresence mode="wait">
                                            {task.status === 'COMPLETED' ? (
                                                <motion.div
                                                    key="checked"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                >
                                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    key="unchecked"
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    exit={{ scale: 0 }}
                                                >
                                                    <Circle className="h-5 w-5 text-zinc-500 group-hover:text-primary transition-colors" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <span className={cn(
                                        "transition-all duration-300 font-medium",
                                        task.status === 'COMPLETED' ? "line-through text-white/50" : "text-white"
                                    )}>
                                        {task.content}
                                    </span>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm text-muted-foreground"
                            >
                                No tasks for today. <Link href="/planning" className="text-primary hover:underline">Plan your week</Link>.
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    )
}
