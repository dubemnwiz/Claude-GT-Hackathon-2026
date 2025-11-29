import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Task } from "./KanbanBoard"
import { Trash, CheckCircle2, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileTaskItemProps {
    task: Task
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
    isOrganizing: boolean
}

export function MobileTaskItem({ task, onDelete, onStatusChange, isOrganizing }: MobileTaskItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id, data: { type: "Task", task }, disabled: !isOrganizing })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className={cn(
            "flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 touch-none select-none transition-all",
            isOrganizing ? "pl-2" : ""
        )}>
            {/* Drag Handle - Only visible in Organize Mode */}
            {isOrganizing && (
                <div {...attributes} {...listeners} className="text-zinc-400 cursor-grab active:cursor-grabbing p-2 hover:bg-white/10 rounded-md touch-none">
                    <GripVertical className="h-6 w-6" />
                </div>
            )}

            <button
                onClick={() => !isOrganizing && onStatusChange(task.id, task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED')}
                disabled={isOrganizing}
                className={cn(
                    "h-5 w-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                    task.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-black' : 'border-zinc-500 hover:border-white',
                    isOrganizing && "opacity-30 scale-90"
                )}
            >
                {task.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
            </button>

            <span className={cn(
                "flex-1 text-sm transition-colors",
                task.status === 'COMPLETED' ? 'text-muted-foreground line-through' : 'text-white',
                isOrganizing && "text-zinc-400"
            )}>
                {task.content}
            </span>

            {!isOrganizing && (
                <button
                    onClick={() => onDelete(task.id)}
                    className="text-zinc-500 hover:text-red-400 p-2 hover:bg-white/10 rounded-full"
                >
                    <Trash className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}
