"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Task } from "./KanbanBoard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash, GripVertical, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface KanbanCardProps {
    task: Task
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
}

export function KanbanCard({ task, onDelete, onStatusChange }: KanbanCardProps) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: "Task",
            task,
        },
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-30 bg-secondary/50 p-4 rounded-lg border-2 border-primary/20 h-[100px]"
            />
        )
    }

    return (
        <div ref={setNodeRef} style={style} className="group relative">
            <Card className={cn(
                "bg-secondary/30 border-white/5 backdrop-blur-sm hover:bg-secondary/50 transition-colors",
                task.status === 'COMPLETED' && "opacity-60"
            )}>
                <CardContent className="p-3 flex items-start gap-3">
                    <div
                        {...attributes}
                        {...listeners}
                        className="mt-1 text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="h-4 w-4" />
                    </div>

                    <div className="flex-1 space-y-2">
                        <p className={cn(
                            "text-sm font-medium leading-none pt-1",
                            task.status === 'COMPLETED' && "line-through text-muted-foreground"
                        )}>
                            {task.content}
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onStatusChange(task.id, task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED')}
                                className={cn(
                                    "text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1",
                                    task.status === 'COMPLETED'
                                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                                        : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                                )}
                            >
                                <CheckCircle2 className="h-3 w-3" />
                                {task.status === 'COMPLETED' ? 'Completed' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDelete(task.id)}
                    >
                        <Trash className="h-3 w-3" />
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
