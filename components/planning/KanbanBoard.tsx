"use client"

import { useState, useEffect } from "react"
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash, FileDown, Eraser } from "lucide-react"
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
                body: JSON.stringify({ content: newTask, status: "NOT_STARTED" }),
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
            <div className="flex justify-between items-center">
                <form onSubmit={addTask} className="flex gap-2">
                    <Input
                        placeholder="Add a new task..."
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        className="max-w-sm"
                    />
                    <Button type="submit"><Plus className="h-4 w-4" /></Button>
                </form>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={clearWeek} title="Clear Week">
                        <Eraser className="h-4 w-4 mr-2" /> Clear Week
                    </Button>
                    <Button variant="outline" onClick={exportPDF} disabled={isExporting} title="Export PDF">
                        <FileDown className="h-4 w-4 mr-2" /> {isExporting ? "Exporting..." : "Export PDF"}
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
                <div id="kanban-board" className="flex gap-4 h-full overflow-x-auto pb-4">
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
        </div>
    )
}
