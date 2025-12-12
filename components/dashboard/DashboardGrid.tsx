"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash, GripHorizontal, Palette } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { motion, useMotionValue } from "framer-motion"
import { cn } from "@/lib/utils"

interface Note {
    id: string
    content: string
    type: string
}

interface ParsedNote extends Omit<Note, 'content'> {
    text: string
    x: number
    y: number
    color: string
    rotation: number
    width: number
    height: number
}

const COLORS = [
    { name: "Yellow", value: "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-200 dark:border-yellow-800" },
    { name: "Blue", value: "bg-blue-100 dark:bg-blue-900/40 border-blue-200 dark:border-blue-800" },
    { name: "Green", value: "bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800" },
    { name: "Pink", value: "bg-pink-100 dark:bg-pink-900/40 border-pink-200 dark:border-pink-800" },
    { name: "Purple", value: "bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800" },
]

export function DashboardGrid() {
    const [notes, setNotes] = useState<ParsedNote[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const containerRef = useRef<HTMLDivElement>(null)

    // Parse raw note content which might be JSON or plain text
    const parseNoteContent = (content: string): { text: string, x: number, y: number, color: string, rotation: number, width: number, height: number } => {
        try {
            const parsed = JSON.parse(content)
            if (typeof parsed === 'object' && parsed !== null && 'text' in parsed) {
                return {
                    text: parsed.text || "",
                    x: parsed.x || Math.random() * (window.innerWidth - 300),
                    y: parsed.y || Math.random() * (window.innerHeight - 300),
                    color: parsed.color || COLORS[0].value,
                    rotation: parsed.rotation || (Math.random() * 4 - 2),
                    width: parsed.width || 280,
                    height: parsed.height || 200
                }
            }
        } catch (e) {
            // Fallback for legacy plain text notes
        }
        return {
            text: content,
            x: Math.random() * (window.innerWidth - 400) + 50,
            y: Math.random() * (window.innerHeight - 400) + 50,
            color: COLORS[Math.floor(Math.random() * COLORS.length)].value,
            rotation: (Math.random() * 4 - 2),
            width: 280,
            height: 200
        }
    }

    const fetchNotes = async () => {
        try {
            const res = await fetch("/api/dashboard")
            if (res.ok) {
                const rawNotes: Note[] = await res.json()
                const parsed = rawNotes.map(n => ({
                    ...n,
                    ...parseNoteContent(n.content)
                }))
                setNotes(parsed)
            }
        } catch (error) {
            console.error("Failed to fetch notes", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchNotes()
    }, [])

    const saveNote = async (note: ParsedNote) => {
        try {
            // Serialize back to JSON string
            const contentToSave = JSON.stringify({
                text: note.text,
                x: note.x,
                y: note.y,
                color: note.color,
                rotation: note.rotation,
                width: note.width,
                height: note.height
            })

            await fetch("/api/dashboard", {
                method: "PUT",
                body: JSON.stringify({ id: note.id, content: contentToSave }),
                headers: { "Content-Type": "application/json" },
            })
        } catch (error) {
            console.error("Failed to save note", error)
        }
    }

    const addNote = async () => {
        const newNoteData = {
            text: "",
            x: window.innerWidth / 2 - 140 + (Math.random() * 40 - 20),
            y: window.innerHeight / 2 - 100 + (Math.random() * 40 - 20),
            color: COLORS[Math.floor(Math.random() * COLORS.length)].value,
            rotation: (Math.random() * 6 - 3),
            width: 280,
            height: 200
        }

        try {
            const res = await fetch("/api/dashboard", {
                method: "POST",
                body: JSON.stringify({
                    content: JSON.stringify(newNoteData),
                    type: "text"
                }),
                headers: { "Content-Type": "application/json" },
            })
            if (res.ok) {
                const created: Note = await res.json()
                // Optimistically add to state
                setNotes([...notes, { ...created, ...newNoteData }])
            }
        } catch (error) {
            console.error("Failed to add note", error)
        }
    }

    const updateNoteState = (id: string, updates: Partial<ParsedNote>) => {
        const updatedNotes = notes.map(n => n.id === id ? { ...n, ...updates } : n)
        setNotes(updatedNotes)
        return updatedNotes.find(n => n.id === id)
    }

    const deleteNote = async (id: string) => {
        try {
            await fetch(`/api/dashboard?id=${id}`, {
                method: "DELETE",
            })
            setNotes(notes.filter(n => n.id !== id))
        } catch (error) {
            console.error("Failed to delete note", error)
        }
    }

    if (isLoading) return <div className="flex h-full items-center justify-center text-zinc-500">Loading Mind Dump...</div>

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]"
                style={{
                    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />

            {/* Ambient Background Animations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, -50, 0],
                        opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        x: [0, -70, 0],
                        y: [0, 80, 0],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 5 }}
                    className="absolute bottom-1/3 right-1/3 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl"
                />
            </div>

            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md p-2 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                <Button onClick={addNote} variant="secondary" size="sm" className="rounded-full shadow-sm hover:shadow-md transition-all">
                    <Plus className="mr-2 h-4 w-4" /> New Idea
                </Button>
            </div>

            {/* Canvas Area */}
            <div className="w-full h-full relative z-10">
                {notes.map((note) => (
                    <motion.div
                        key={note.id}
                        drag
                        dragMomentum={false}
                        initial={{
                            x: note.x,
                            y: note.y,
                            opacity: 0,
                            scale: 0.8,
                            rotate: note.rotation
                        }}
                        animate={{
                            x: note.x,
                            y: note.y,
                            opacity: 1,
                            scale: 1,
                            rotate: note.rotation
                        }}
                        onDragEnd={(_, info) => {
                            const newX = note.x + info.offset.x
                            const newY = note.y + info.offset.y
                            const updated = updateNoteState(note.id, { x: newX, y: newY })
                            if (updated) saveNote(updated)
                        }}
                        className={cn(
                            "absolute flex flex-col p-4 shadow-sm hover:shadow-xl transition-shadow duration-300 rounded-lg border backdrop-blur-sm",
                            note.color
                        )}
                        style={{ width: note.width, height: note.height }}
                    >
                        {/* Note Header / Drag Handle */}
                        <div className="flex items-center justify-between mb-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-zinc-400 dark:text-zinc-500">
                            <GripHorizontal className="w-5 h-5" />
                            <div className="flex gap-1">
                                {COLORS.map(c => (
                                    <button
                                        key={c.name}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const updated = updateNoteState(note.id, { color: c.value })
                                            if (updated) saveNote(updated)
                                        }}
                                        className={cn(
                                            "w-3 h-3 rounded-full border border-black/10 transition-transform hover:scale-125",
                                            c.value.split(" ")[0] // Extract bg class
                                        )}
                                        title={c.name}
                                    />
                                ))}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteNote(note.id)
                                    }}
                                    className="ml-2 hover:text-red-500 transition-colors"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Note Content */}
                        <Textarea
                            value={note.text}
                            onChange={(e) => updateNoteState(note.id, { text: e.target.value })}
                            onBlur={() => saveNote(note)}
                            className="flex-1 bg-transparent border-none resize-none focus-visible:ring-0 p-0 text-zinc-800 dark:text-zinc-100 leading-relaxed font-medium placeholder:text-zinc-400/50"
                            placeholder="Write something down..."
                        />
                    </motion.div>
                ))}
            </div>

            <div className="absolute bottom-4 left-4 text-xs text-zinc-400 pointer-events-none">
                Hint: Drag notes to move them
            </div>
        </div>
    )
}
