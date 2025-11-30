"use client"

import { useState, useEffect } from "react"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash, FileDown, Eraser, CheckCircle2, Calendar } from "lucide-react"
import { TaskItem } from "./TaskItem"
import { KanbanCard } from "./KanbanCard"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

export interface Task {
    id: string
    content: string
    status: string
    day: string
}

export function KanbanBoard() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [newTask, setNewTask] = useState("")
    const [selectedDay, setSelectedDay] = useState("Monday")

    const [error, setError] = useState("")

    const fetchTasks = async () => {
        try {
            const res = await fetch("/api/planning")
            if (res.ok) setTasks(await res.json())
            else if (res.status === 401) setError("Please login to see tasks")
        } catch (error) {
            console.error("Failed to fetch tasks", error)
            setError("Failed to load tasks")
        }
    }

    useEffect(() => {
        fetchTasks()
    }, [])

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTask) return
        setError("")
        try {
            const res = await fetch("/api/planning", {
                method: "POST",
                body: JSON.stringify({ content: newTask, status: "NOT_STARTED", day: selectedDay }),
                headers: { "Content-Type": "application/json" },
            })
            if (res.ok) {
                setNewTask("")
                fetchTasks()
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
        // Optimistic update
        const previousTasks = [...tasks]
        setTasks(tasks.map(t => t.id === id ? { ...t, day } : t))

        try {
            const res = await fetch("/api/planning", {
                method: "PUT",
                body: JSON.stringify({ id, day }),
                headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) {
                throw new Error("Failed to update")
            }
        } catch (error) {
            console.error("Failed to update task day", error)
            setTasks(previousTasks) // Revert on error
        }
    }

    const updateTaskStatus = async (id: string, status: string) => {
        // Optimistic update
        setTasks(tasks.map(t => t.id === id ? { ...t, status } : t))
        try {
            await fetch("/api/planning", {
                method: "PUT",
                body: JSON.stringify({ id, status }),
                headers: { "Content-Type": "application/json" },
            })
        } catch (error) {
            console.error("Failed to update task status", error)
            fetchTasks() // Revert on error
        }
    }

    const deleteTask = async (id: string) => {
        try {
            const res = await fetch(`/api/planning?id=${id}`, {
                method: "DELETE",
            })
            if (res.ok) fetchTasks()
            else setError("Failed to delete task")
        } catch (error) {
            console.error("Failed to delete task", error)
            setError("Failed to delete task")
        }
    }

    const clearWeek = async () => {
        if (!confirm("Are you sure you want to delete all tasks?")) return
        try {
            const res = await fetch(`/api/planning?all=true`, {
                method: "DELETE",
            })
            if (res.ok) fetchTasks()
            else setError("Failed to clear week")
        } catch (error) {
            console.error("Failed to clear week", error)
            setError("Failed to clear week")
        }
    }

    const [isExporting, setIsExporting] = useState(false)

    const exportPDF = async () => {
        setIsExporting(true)
        const element = document.getElementById('kanban-board')
        if (!element) return

        try {
            const canvas = await html2canvas(element)
            const imgData = canvas.toDataURL('image/png')
            const pdf = new jsPDF('l', 'mm', 'a4') // landscape
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

    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        // Dropping over a day container (if we make headers droppable) or another task
        // For simplicity in this vertical list, we'll assume dropping over a task updates the day
        // We need to find which day the 'over' element belongs to if it's a task

        let targetDay = overId

        // If overId is not a day, it must be a task. Find that task's day.
        if (!days.includes(overId)) {
            const overTask = tasks.find(t => t.id === overId)
            if (overTask) {
                targetDay = overTask.day
            }
        }

        if (days.includes(targetDay)) {
            const task = tasks.find(t => t.id === activeId)
            if (task && task.day !== targetDay) {
                setTasks(tasks.map(t => t.id === activeId ? { ...t, day: targetDay } : t))
                updateTaskDay(activeId, targetDay)
            }
        }

        setActiveId(null)
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return (
        <div className="space-y-8 h-full flex flex-col max-w-3xl mx-auto w-full pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <form onSubmit={addTask} className="flex gap-2 w-full md:w-auto">
                    <Select value={selectedDay} onValueChange={setSelectedDay}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {days.map(day => (
                                <SelectItem key={day} value={day}>{day}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Add a new task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        className="flex-1 md:w-[300px]"
                    />
                    <Button type="submit"><Plus className="h-4 w-4" /></Button>
                </form>
                <div className="flex gap-2 w-full md:w-auto justify-end">
                    <Button variant="outline" onClick={clearWeek} title="Clear Week">
                        <Eraser className="h-4 w-4 mr-2" /> <span className="hidden md:inline">Clear Week</span>
                    </Button>
                    <Button variant="outline" onClick={exportPDF} disabled={isExporting} title="Export PDF">
                        <FileDown className="h-4 w-4 mr-2" /> <span className="hidden md:inline">{isExporting ? "Exporting..." : "Export PDF"}</span>
                    </Button>
                </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div id="kanban-board" className="space-y-8">
                    {days.map(day => {
                        const dayTasks = tasks.filter(t => t.day === day)

                        return (
                            <div key={day} className="space-y-3">
                                <h3 className="font-semibold text-lg text-primary/80 border-b border-white/10 pb-1 flex items-center justify-between">
                                    {day}
                                    <span className="text-xs text-muted-foreground font-normal">{dayTasks.length} tasks</span>
                                </h3>

                                {/* Desktop: Draggable Sortable List */}
                                <div className="hidden md:block">
                                    <SortableContext
                                        id={day} // Use day as container ID
                                        items={dayTasks.map(t => t.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2 min-h-[10px]" data-day={day}>
                                            {dayTasks.length === 0 && (
                                                <div className="h-16 border-2 border-dashed border-white/5 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                                                    Drop tasks here
                                                </div>
                                            )}
                                            {dayTasks.map(task => (
                                                <KanbanCard
                                                    key={task.id}
                                                    task={task}
                                                    onDelete={deleteTask}
                                                    onStatusChange={updateTaskStatus}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </div>

                                {/* Mobile: Simple List (No Drag) */}
                                <div className="md:hidden space-y-2">
                                    {dayTasks.length === 0 && (
                                        <p className="text-xs text-muted-foreground italic pl-2">No tasks</p>
                                    )}
                                    {dayTasks.map(task => (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            onDelete={deleteTask}
                                            onStatusChange={updateTaskStatus}
                                            onUpdateDay={updateTaskDay}
                                        />
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <DragOverlay>
                    {activeId ? <KanbanCard task={tasks.find(t => t.id === activeId)!} onDelete={() => { }} onStatusChange={() => { }} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
