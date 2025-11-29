"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Task } from "./KanbanBoard"
import { Trash, CheckCircle2, GripVertical } from "lucide-react"

interface MobileTaskItemProps {
    task: Task
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
}

export function MobileTaskItem({ task, onDelete, onStatusChange }: MobileTaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id, data: { type: "Task", task } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 touch-none">
            {/* Drag Handle */}
            <div {...attributes} {...listeners} className="text-zinc-600 cursor-grab active:cursor-grabbing p-1">
                <GripVertical className="h-4 w-4" />
            </div>

            <button
                onClick={() => onStatusChange(task.id, task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED')}
                className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${task.status === 'COMPLETED'
                        ? 'bg-green-500 border-green-500 text-black'
                        : 'border-zinc-500 hover:border-white'
                    }`}
            >
                {task.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
            </button>

            <span className={`flex-1 text-sm ${task.status === 'COMPLETED' ? 'text-muted-foreground line-through' : 'text-white'}`}>
                {task.content}
            </span>

            <button
                onClick={() => onDelete(task.id)}
                className="text-zinc-500 hover:text-red-400 p-2 hover:bg-white/10 rounded-full"
            >
                <Trash className="h-4 w-4" />
            </button>
        </div>
    )
}
