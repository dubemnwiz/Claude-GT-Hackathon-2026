"use client"

import { useDraggable } from "@dnd-kit/core"
import { Task } from "./KanbanBoard"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KanbanCardProps {
    task: Task
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
}

const statusColors: Record<string, string> = {
    "NOT_STARTED": "bg-card border-l-4 border-l-red-500 border-y border-r border-white/5 hover:border-r-red-500/50 hover:border-y-red-500/50",
    "IN_PROGRESS": "bg-card border-l-4 border-l-yellow-500 border-y border-r border-white/5 hover:border-r-yellow-500/50 hover:border-y-yellow-500/50",
    "COMPLETED": "bg-card border-l-4 border-l-green-500 border-y border-r border-white/5 hover:border-r-green-500/50 hover:border-y-green-500/50",
}

export function KanbanCard({ task, onDelete, onStatusChange }: KanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: task.id,
    })

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="group relative">
            <Card className={cn("cursor-grab active:cursor-grabbing transition-all", statusColors[task.status])}>
                <CardContent className="p-3 pr-8 space-y-2">
                    <p className="text-sm font-medium">{task.content}</p>
                    <Select
                        defaultValue={task.status}
                        onValueChange={(val) => onStatusChange(task.id, val)}
                    >
                        <SelectTrigger className="h-6 text-[10px] w-fit px-2 bg-transparent border-0 focus:ring-0">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Done</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete(task.id)
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Trash className="h-3 w-3 text-red-500" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
