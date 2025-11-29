import { Task } from "./KanbanBoard"
import { Trash, CheckCircle2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface MobileTaskItemProps {
    task: Task
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
    onUpdateDay: (id: string, day: string) => void
}

export function MobileTaskItem({ task, onDelete, onStatusChange, onUpdateDay }: MobileTaskItemProps) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
            <button
                onClick={() => onStatusChange(task.id, task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED')}
                className={cn(
                    "h-5 w-5 rounded-full border flex items-center justify-center transition-all shrink-0",
                    task.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-black' : 'border-zinc-500 hover:border-white'
                )}
            >
                {task.status === 'COMPLETED' && <CheckCircle2 className="h-3 w-3" />}
            </button>

            <span className={cn(
                "flex-1 text-sm transition-colors",
                task.status === 'COMPLETED' ? 'text-muted-foreground line-through' : 'text-white'
            )}>
                {task.content}
            </span>

            <div className="flex items-center gap-1">
                <Select value={task.day} onValueChange={(val) => onUpdateDay(task.id, val)}>
                    <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent hover:bg-white/10 focus:ring-0">
                        <Calendar className="h-4 w-4 text-zinc-400" />
                    </SelectTrigger>
                    <SelectContent>
                        {days.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <button
                    onClick={() => onDelete(task.id)}
                    className="text-zinc-500 hover:text-red-400 p-2 hover:bg-white/10 rounded-full"
                >
                    <Trash className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}
