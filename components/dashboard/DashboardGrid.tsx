"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Plus, Trash, Save } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface Note {
    id: string
    content: string
    type: string
}

export function DashboardGrid() {
    const [notes, setNotes] = useState<Note[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchNotes = async () => {
        try {
            const res = await fetch("/api/dashboard")
            if (res.ok) {
                setNotes(await res.json())
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

    const addNote = async () => {
        try {
            const res = await fetch("/api/dashboard", {
                method: "POST",
                body: JSON.stringify({ content: "", type: "text" }),
                headers: { "Content-Type": "application/json" },
            })
            if (res.ok) {
                fetchNotes()
            }
        } catch (error) {
            console.error("Failed to add note", error)
        }
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

    const updateNote = async (id: string, content: string) => {
        // Optimistic update
        setNotes(notes.map(n => n.id === id ? { ...n, content } : n))
        // Debounce save logic would go here, for now simple save on blur or button
    }

    const saveNote = async (id: string, content: string) => {
        try {
            await fetch("/api/dashboard", {
                method: "PUT",
                body: JSON.stringify({ id, content }),
                headers: { "Content-Type": "application/json" },
            })
        } catch (error) {
            console.error("Failed to save note", error)
        }
    }

    if (isLoading) return <div>Loading...</div>

    return (
        <div className="space-y-4">
            <Button onClick={addNote}>
                <Plus className="mr-2 h-4 w-4" /> Add Block
            </Button>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {notes.map((note) => (
                    <Card key={note.id} className="relative group">
                        <CardHeader className="pb-2">
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => deleteNote(note.id)}>
                                    <Trash className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                value={note.content}
                                onChange={(e) => updateNote(note.id, e.target.value)}
                                onBlur={(e) => saveNote(note.id, e.target.value)}
                                className="min-h-[150px] border-none resize-none focus-visible:ring-0 p-0 shadow-none"
                                placeholder="Type something..."
                            />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
