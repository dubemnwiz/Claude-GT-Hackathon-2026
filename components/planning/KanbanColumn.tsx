"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Task, GCalEvent } from "./KanbanBoard"
import { KanbanCard } from "./KanbanCard"
import { cn } from "@/lib/utils"
import { CalendarDays } from "lucide-react"

interface KanbanColumnProps {
    day: string
    dateLabel?: string
    isToday?: boolean
    tasks: Task[]
    events?: GCalEvent[]
    onDelete: (id: string) => void
    onStatusChange: (id: string, status: string) => void
    onPriorityChange: (id: string, priority: string) => void
    onNotesChange: (id: string, notes: string) => void
}

export function KanbanColumn({ day, dateLabel, isToday, tasks, events = [], onDelete, onStatusChange, onPriorityChange, onNotesChange }: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({ id: day })

    return (
        <div className={cn(
            "flex flex-col rounded-xl p-2 transition-colors",
            isToday
                ? "bg-primary/5 ring-1 ring-primary/20"
                : "bg-white/[0.02] ring-1 ring-white/5"
        )}>
            {/* Column header */}
            <div className={cn(
                "pb-2 mb-2 border-b flex flex-col gap-0.5",
                isToday ? "border-primary/30" : "border-white/10"
            )}>
                <div className="flex items-center justify-between">
                    <span className={cn(
                        "font-semibold text-sm leading-tight",
                        isToday ? "text-primary" : "text-primary/80"
                    )}>
                        {day}
                    </span>
                    {isToday && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium leading-none">
                            Today
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    {dateLabel && (
                        <span className="text-xs text-muted-foreground">{dateLabel}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground/70 ml-auto">
                        {tasks.length > 0 ? `${tasks.length} task${tasks.length === 1 ? '' : 's'}` : ''}
                        {events.length > 0 && (
                            <span className="ml-1 text-sky-400/60">{events.length} event{events.length === 1 ? '' : 's'}</span>
                        )}
                    </span>
                </div>
            </div>

            {/* GCal events (read-only) */}
            {events.length > 0 && (
                <div className="space-y-1 mb-2 pb-2 border-b border-sky-500/15">
                    {events.map(event => (
                        <div
                            key={event.id}
                            title={event.title}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-sky-500/8 border border-sky-500/15"
                        >
                            <CalendarDays className="h-3 w-3 text-sky-400 shrink-0" />
                            <span className="text-[11px] text-sky-300 truncate flex-1 leading-none">
                                {event.title}
                            </span>
                            {event.timeLabel && (
                                <span className="text-[10px] text-sky-400/50 shrink-0">{event.timeLabel}</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Droppable task area */}
            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 space-y-2 min-h-[120px] rounded-lg transition-colors",
                    tasks.length === 0 && "flex items-center justify-center"
                )}
            >
                <SortableContext
                    id={day}
                    items={tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.length === 0 && (
                        <p className="text-[11px] text-muted-foreground/50 text-center select-none">
                            Drop tasks here
                        </p>
                    )}
                    {tasks.map(task => (
                        <KanbanCard
                            key={task.id}
                            task={task}
                            onDelete={onDelete}
                            onStatusChange={onStatusChange}
                            onPriorityChange={onPriorityChange}
                            onNotesChange={onNotesChange}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    )
}
