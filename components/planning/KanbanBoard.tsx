"use client"

import { useState, useEffect } from "react"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, FileDown, Eraser, ChevronLeft, ChevronRight, ChevronsRight, CalendarDays } from "lucide-react"
import { TaskItem } from "./TaskItem"
import { KanbanCard } from "./KanbanCard"
import { KanbanColumn } from "./KanbanColumn"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { cn } from "@/lib/utils"
import { signIn } from "next-auth/react"

export interface GCalEvent {
    id: string
    title: string
    day: string
    start: string | null
    end: string | null
    isAllDay: boolean
    timeLabel: string | null
}

export interface Task {
    id: string
    content: string
    status: string
    day: string
    priority: string
    weekOf?: string | null
    notes?: string
}

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export const PRIORITY_CONFIG: Record<Priority, { label: string; badgeClass: string; dotClass: string }> = {
    HIGH: {
        label: 'High',
        badgeClass: 'bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/20 dark:border-red-500/30',
        dotClass: 'bg-red-500',
    },
    MEDIUM: {
        label: 'Med',
        badgeClass: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/30',
        dotClass: 'bg-amber-500',
    },
    LOW: {
        label: 'Low',
        badgeClass: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30',
        dotClass: 'bg-blue-500',
    },
}

function getThisWeekMonday(): Date {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    return monday
}

function formatWeekOfKey(monday: Date): string {
    const y = monday.getFullYear()
    const m = String(monday.getMonth() + 1).padStart(2, '0')
    const d = String(monday.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function getWeekDates(mondayDate: Date): Record<string, string> {
    const result: Record<string, string> = {}
    DAYS.forEach((day, i) => {
        const date = new Date(mondayDate)
        date.setDate(mondayDate.getDate() + i)
        result[day] = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })
    return result
}

function formatWeekRange(monday: Date): string {
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const start = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const end = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${start} – ${end}`
}

function getTodayDayName(): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return dayNames[new Date().getDay()]
}

function shiftWeek(monday: Date, delta: number): Date {
    const next = new Date(monday)
    next.setDate(monday.getDate() + delta * 7)
    return next
}

export function KanbanBoard() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState("")
    const [selectedDay, setSelectedDay] = useState(getTodayDayName)
    const [selectedPriority, setSelectedPriority] = useState<Priority>('MEDIUM')
    const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(getThisWeekMonday)
    const [error, setError] = useState("")
    const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([])
    const [gcalConnected, setGcalConnected] = useState<boolean | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [activeId, setActiveId] = useState<string | null>(null)

    const weekDates = getWeekDates(currentWeekMonday)
    const todayDay = getTodayDayName()
    const thisWeekMonday = getThisWeekMonday()
    const isCurrentWeek = formatWeekOfKey(currentWeekMonday) === formatWeekOfKey(thisWeekMonday)

    // Completion stats
    const completedCount = tasks.filter(t => t.status === 'COMPLETED').length
    const totalCount = tasks.length
    const completionPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    // Roll-over: incomplete tasks on past days of the current week
    const todayIndex = DAYS.indexOf(todayDay)
    const pastDays = isCurrentWeek ? DAYS.slice(0, todayIndex) : []
    const rolloverTasks_list = tasks.filter(t => pastDays.includes(t.day) && t.status !== 'COMPLETED')

    const fetchTasks = async () => {
        try {
            const weekOf = formatWeekOfKey(currentWeekMonday)
            const res = await fetch(`/api/planning?weekOf=${weekOf}`)
            if (res.ok) setTasks(await res.json())
            else if (res.status === 401) setError("Please login to see tasks")
        } catch (error) {
            console.error("Failed to fetch tasks", error)
            setError("Failed to load tasks")
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [currentWeekMonday]) // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch Google Calendar events for the current week
    useEffect(() => {
        const weekOf = formatWeekOfKey(currentWeekMonday)
        fetch(`/api/planning/gcal?weekOf=${weekOf}`)
            .then(r => r.json())
            .then(data => {
                setGcalConnected(data.connected ?? false)
                setGcalEvents(data.events ?? [])
            })
            .catch(() => setGcalConnected(false))
    }, [currentWeekMonday])

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTask) return
        setError("")
        try {
            const weekOf = formatWeekOfKey(currentWeekMonday)
            const res = await fetch("/api/planning", {
                method: "POST",
                body: JSON.stringify({ content: newTask, status: "NOT_STARTED", day: selectedDay, priority: selectedPriority, weekOf }),
                headers: { "Content-Type": "application/json" },
            })
            if (res.ok) {
                const createdTask = await res.json()
                setNewTask("")
                fetchTasks()

                // Sync to Google Calendar (fire and forget)
                const weekOf = formatWeekOfKey(currentWeekMonday)
                fetch("/api/planning/sync", {
                    method: "POST",
                    body: JSON.stringify({ taskId: createdTask.id, day: selectedDay, content: newTask, weekOf }),
                    headers: { "Content-Type": "application/json" }
                }).catch(() => {})
            } else {
                if (res.status === 401) setError("Please login to add tasks")
                else setError("Failed to add task")
            }
        } catch (error) {
            console.error("Failed to add task", error)
            setError("Failed to add task")
        }
    }

    const updateTaskDay = async (id: string, day: string) => {
        const previousTasks = [...tasks]
        const taskContent = tasks.find(t => t.id === id)?.content || "Task"
        setTasks(tasks.map(t => t.id === id ? { ...t, day } : t))

        try {
            const weekOf = formatWeekOfKey(currentWeekMonday)
            const res = await fetch("/api/planning", {
                method: "PUT",
                body: JSON.stringify({ id, day, weekOf }),
                headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) throw new Error("Failed to update")

            fetch("/api/planning/sync", {
                method: "POST",
                body: JSON.stringify({ taskId: id, day, content: taskContent, weekOf }),
                headers: { "Content-Type": "application/json" }
            }).catch(() => {})
        } catch (error) {
            console.error("Failed to update task day", error)
            setTasks(previousTasks)
        }
    }

    const updateTaskStatus = async (id: string, status: string) => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(10); // Subtle haptic tap
        }
        setTasks(tasks.map(t => t.id === id ? { ...t, status } : t))
        try {
            await fetch("/api/planning", {
                method: "PUT",
                body: JSON.stringify({ id, status }),
                headers: { "Content-Type": "application/json" },
            })
        } catch (error) {
            console.error("Failed to update task status", error)
            fetchTasks()
        }
    }

    const updateTaskPriority = async (id: string, priority: string) => {
        if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(10); // Subtle haptic tap
        }
        setTasks(tasks.map(t => t.id === id ? { ...t, priority } : t))
        try {
            await fetch("/api/planning", {
                method: "PUT",
                body: JSON.stringify({ id, priority }),
                headers: { "Content-Type": "application/json" },
            })
        } catch (error) {
            console.error("Failed to update task priority", error)
            fetchTasks()
        }
    }

    const updateTaskNotes = async (id: string, notes: string) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, notes } : t))
        try {
            await fetch("/api/planning", {
                method: "PUT",
                body: JSON.stringify({ id, notes }),
                headers: { "Content-Type": "application/json" },
            })
        } catch (error) {
            console.error("Failed to update task notes", error)
            fetchTasks()
        }
    }

    const deleteTask = async (id: string) => {
        try {
            const res = await fetch(`/api/planning?id=${id}`, { method: "DELETE" })
            if (res.ok) fetchTasks()
            else setError("Failed to delete task")
        } catch (error) {
            console.error("Failed to delete task", error)
            setError("Failed to delete task")
        }
    }

    const clearWeek = async () => {
        if (!confirm("Are you sure you want to delete all tasks for this week?")) return
        try {
            const weekOf = formatWeekOfKey(currentWeekMonday)
            const res = await fetch(`/api/planning?all=true&weekOf=${weekOf}`, { method: "DELETE" })
            if (res.ok) fetchTasks()
            else setError("Failed to clear week")
        } catch (error) {
            console.error("Failed to clear week", error)
            setError("Failed to clear week")
        }
    }

    const rolloverTasks = async () => {
        if (rolloverTasks_list.length === 0) return
        if (!confirm(`Move ${rolloverTasks_list.length} incomplete task(s) from past days to ${todayDay}?`)) return
        try {
            await Promise.all(rolloverTasks_list.map(task =>
                fetch("/api/planning", {
                    method: "PUT",
                    body: JSON.stringify({ id: task.id, day: todayDay }),
                    headers: { "Content-Type": "application/json" },
                })
            ))
            fetchTasks()
        } catch (error) {
            console.error("Failed to roll over tasks", error)
            setError("Failed to roll over tasks")
        }
    }

    const exportPDF = async () => {
        setIsExporting(true)
        const element = document.getElementById('kanban-board')
        if (!element) return

        try {
            const canvas = await html2canvas(element)
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('l', 'mm', 'a4')
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const pdfHeight = pdf.internal.pageSize.getHeight()
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
            pdf.save("weekly-plan.pdf")
        } catch (error) {
            console.error("Failed to export PDF", error)
            setError("Failed to export PDF")
        } finally {
            setIsExporting(false)
        }
    }

    const cyclePriority = () => {
        const order: Priority[] = ['HIGH', 'MEDIUM', 'LOW']
        const next = order[(order.indexOf(selectedPriority) + 1) % order.length]
        setSelectedPriority(next)
    }

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string
        let targetDay = overId

        if (!DAYS.includes(overId)) {
            const overTask = tasks.find(t => t.id === overId)
            if (overTask) targetDay = overTask.day
        }

        if (DAYS.includes(targetDay)) {
            const task = tasks.find(t => t.id === activeId)
            if (task && task.day !== targetDay) {
                setTasks(tasks.map(t => t.id === activeId ? { ...t, day: targetDay } : t))
                updateTaskDay(activeId, targetDay)
            } else if (task && task.day === targetDay && activeId !== overId) {
                const oldIndex = tasks.findIndex(t => t.id === activeId)
                const newIndex = tasks.findIndex(t => t.id === overId)
                setTasks((items) => arrayMove(items, oldIndex, newIndex))
            }
        }

        setActiveId(null)
    }

    return (
        <div className="space-y-4 h-full flex flex-col w-full pb-6 min-h-0">

            {/* Header controls */}
            <div className="space-y-3 shrink-0">
                {/* Week Navigation */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekMonday(d => shiftWeek(d, -1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium px-2 min-w-[190px] text-center">
                            {formatWeekRange(currentWeekMonday)}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekMonday(d => shiftWeek(d, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                    {!isCurrentWeek && (
                        <Button variant="outline" size="sm" onClick={() => setCurrentWeekMonday(getThisWeekMonday())}>
                            This Week
                        </Button>
                    )}
                </div>

                {/* Weekly Progress Bar */}
                {totalCount > 0 && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Weekly Progress</span>
                            <span>{completedCount} / {totalCount} tasks complete</span>
                        </div>
                        <div className="h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${completionPct}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Add Task Row */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <form onSubmit={addTask} className="flex gap-2 w-full md:w-auto items-center">
                        <button
                            type="button"
                            onClick={cyclePriority}
                            title="Click to change priority"
                            className={cn(
                                "h-10 px-2.5 rounded-md text-xs border font-medium whitespace-nowrap transition-colors",
                                PRIORITY_CONFIG[selectedPriority].badgeClass
                            )}
                        >
                            {selectedPriority === 'HIGH' ? '↑ High' : selectedPriority === 'MEDIUM' ? '– Med' : '↓ Low'}
                        </button>
                        <Select value={selectedDay} onValueChange={setSelectedDay}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DAYS.map(day => (
                                    <SelectItem key={day} value={day}>
                                        {day} · {weekDates[day]}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Add a new task..."
                            value={newTask}
                            onChange={(e) => setNewTask(e.target.value)}
                            className="flex-1 md:w-[260px]"
                        />
                        <Button type="submit"><Plus className="h-4 w-4" /></Button>
                    </form>

                    <div className="flex gap-2 w-full md:w-auto justify-end flex-wrap">
                        {isCurrentWeek && rolloverTasks_list.length > 0 && (
                            <Button variant="outline" size="sm" onClick={rolloverTasks} title="Move incomplete past tasks to today">
                                <ChevronsRight className="h-4 w-4 mr-1.5" />
                                Roll Over ({rolloverTasks_list.length})
                            </Button>
                        )}
                        <Button variant="outline" onClick={clearWeek} title="Clear Week">
                            <Eraser className="h-4 w-4 mr-2" /> <span className="hidden md:inline">Clear Week</span>
                        </Button>
                        <Button variant="outline" onClick={exportPDF} disabled={isExporting} title="Export PDF">
                            <FileDown className="h-4 w-4 mr-2" /> <span className="hidden md:inline">{isExporting ? "Exporting..." : "Export PDF"}</span>
                        </Button>
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                {/* Google Calendar connection banner */}
                {gcalConnected === false && (
                    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-sky-500/5 border border-sky-500/20 text-sm">
                        <CalendarDays className="h-4 w-4 text-sky-400 shrink-0" />
                        <span className="text-muted-foreground text-xs flex-1">
                            Connect Google Calendar to sync tasks and see your events here.
                        </span>
                        <button
                            onClick={() => signIn("google", { callbackUrl: "/planning" })}
                            className="text-xs text-sky-400 font-semibold hover:text-sky-300 transition-colors whitespace-nowrap"
                        >
                            Connect →
                        </button>
                    </div>
                )}
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {/* Desktop: Horizontal 7-column Kanban grid */}
                <div className="hidden md:block flex-1 min-h-0 overflow-x-auto overflow-y-auto pb-4">
                    <div id="kanban-board" className="grid grid-cols-7 gap-3 min-w-[980px] h-full">
                        {DAYS.map(day => {
                            const dayTasks = tasks.filter(t => t.day === day)
                            const isToday = isCurrentWeek && day === todayDay
                            return (
                                <KanbanColumn
                                    key={day}
                                    day={day}
                                    dateLabel={weekDates[day]}
                                    isToday={isToday}
                                    tasks={dayTasks}
                                    events={gcalEvents.filter(e => e.day === day)}
                                    onDelete={deleteTask}
                                    onStatusChange={updateTaskStatus}
                                    onPriorityChange={updateTaskPriority}
                                    onNotesChange={updateTaskNotes}
                                />
                            )
                        })}
                    </div>
                </div>

                {/* Mobile: Vertical accordion list */}
                <div className="md:hidden space-y-6 scroll-contained pb-8">
                    {DAYS.map(day => {
                        const dayTasks = tasks.filter(t => t.day === day)
                        const isToday = isCurrentWeek && day === todayDay
                        return (
                            <div key={day} className="space-y-2">
                                <div className={cn(
                                    "flex items-center gap-2 pb-1 border-b",
                                    isToday ? "border-primary/30" : "border-black/5 dark:border-white/10"
                                )}>
                                    <span className={cn(
                                        "font-semibold text-base",
                                        isToday ? "text-primary" : "text-primary/80"
                                    )}>{day}</span>
                                    <span className="text-xs text-muted-foreground">{weekDates[day]}</span>
                                    {isToday && (
                                        <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Today</span>
                                    )}
                                </div>
                                {/* GCal events for this day (mobile) */}
                                {gcalEvents.filter(e => e.day === day).map(event => (
                                    <div key={event.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/8 border border-sky-500/20">
                                        <CalendarDays className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                                        <span className="text-xs text-sky-300 flex-1 truncate">{event.title}</span>
                                        {event.timeLabel && (
                                            <span className="text-[10px] text-sky-400/60 shrink-0">{event.timeLabel}</span>
                                        )}
                                    </div>
                                ))}

                                {dayTasks.length === 0 && gcalEvents.filter(e => e.day === day).length === 0 && (
                                    <p className="text-xs text-muted-foreground italic pl-2">No tasks</p>
                                )}
                                {dayTasks.map(task => (
                                    <TaskItem
                                        key={task.id}
                                        task={task}
                                        weekDateLabels={weekDates}
                                        onDelete={deleteTask}
                                        onStatusChange={updateTaskStatus}
                                        onPriorityChange={updateTaskPriority}
                                        onUpdateDay={updateTaskDay}
                                    />
                                ))}
                            </div>
                        )
                    })}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <KanbanCard
                            task={tasks.find(t => t.id === activeId)!}
                            onDelete={() => { }}
                            onStatusChange={() => { }}
                            onPriorityChange={() => { }}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
