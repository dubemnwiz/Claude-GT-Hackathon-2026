"use client"

import { useState, useEffect } from "react"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash, FileDown, Eraser, CheckCircle2, Calendar } from "lucide-react"
import { KanbanColumn } from "./KanbanColumn"
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
    const [activeId, setActiveId] = useState<string | null>(null)
    const [newTask, setNewTask] = useState("")
    const [selectedDay, setSelectedDay] = useState("Monday")

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

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
        try {
            await fetch("/api/planning", {
                method: "PUT",
                body: JSON.stringify({ id, day }),
                headers: { "Content-Type": "application/json" },
            })
        } catch (error) {
            console.error("Failed to update task day", error)
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

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // Columns are now Days: Monday, Tuesday, etc.
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        if (days.includes(overId)) {
            const task = tasks.find(t => t.id === activeId)
            if (task && task.day !== overId) {
                setTasks(tasks.map(t => t.id === activeId ? { ...t, day: overId } : t))
                updateTaskDay(activeId, overId)
            }
        }

        setActiveId(null)
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return (
        <div className="space-y-4 h-full flex flex-col">
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

            {/* Desktop View: Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div id="kanban-board" className="hidden md:flex gap-4 h-full overflow-x-auto pb-4">
                    {days.map(day => (
                        <KanbanColumn
                            key={day}
                            id={day}
                            title={day}
                            tasks={tasks.filter(t => t.day === day)}
                            onDeleteTask={deleteTask}
                            onStatusChange={updateTaskStatus}
                        />
                    ))}
                </div>
                <DragOverlay>
                    {activeId ? <KanbanCard task={tasks.find(t => t.id === activeId)!} onDelete={() => { }} onStatusChange={() => { }} /> : null}
                </DragOverlay>
            </DndContext>

            {/* Mobile View: Todoist Style List */}
            <div className="md:hidden space-y-8 pb-20">
                {days.map(day => {
                    const dayTasks = tasks.filter(t => t.day === day)

                    return (
                        <div key={day} className="space-y-3">
                            <h3 className="font-semibold text-lg text-primary/80 border-b border-white/10 pb-1 flex items-center justify-between">
                                {day}
                                <span className="text-xs text-muted-foreground font-normal">{dayTasks.length} tasks</span>
                            </h3>
                            <div className="space-y-2">
                                {dayTasks.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic pl-2">No tasks</p>
                                )}
                                {dayTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                        <button
                                            onClick={() => updateTaskStatus(task.id, task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED')}
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

                                        <div className="flex items-center gap-1">
                                            <Select value={task.day} onValueChange={(val) => updateTaskDay(task.id, val)}>
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
                                                onClick={() => deleteTask(task.id)}
                                                className="text-zinc-500 hover:text-red-400 p-2 hover:bg-white/10 rounded-full"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
