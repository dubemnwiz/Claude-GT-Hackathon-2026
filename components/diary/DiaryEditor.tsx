"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useDebounce } from "@/hooks/use-debounce" // Need to create this hook or just use timeout
import { Save, ArrowLeft } from "lucide-react"
import { format } from "date-fns"

export function DiaryEditor({ date }: { date: string }) {
    const router = useRouter()
    const [content, setContent] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [error, setError] = useState("")

    useEffect(() => {
        const fetchEntry = async () => {
            try {
                const res = await fetch(`/api/diary?date=${date}`)
                if (res.ok) {
                    const data = await res.json()
                    setContent(data.content || "")
                }
            } catch (error) {
                console.error("Failed to fetch entry", error)
                setError("Failed to load entry")
            } finally {
                setIsLoading(false)
            }
        }
        fetchEntry()
    }, [date])

    const handleSave = async () => {
        setIsSaving(true)
        setError("")
        try {
            const res = await fetch("/api/diary", {
                method: "POST",
                body: JSON.stringify({ date, content }),
                headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) {
                if (res.status === 401) setError("Please login to save")
                else setError("Failed to save")
            }
        } catch (error) {
            console.error("Failed to save", error)
            setError("Failed to save")
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) return <div>Loading...</div>

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex items-center gap-4">
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save"}
                    </Button>
                </div>
            </div>
            <div className="border rounded-md p-4 min-h-[500px] bg-white dark:bg-gray-800">
                <textarea
                    className="w-full h-full min-h-[500px] resize-none outline-none bg-transparent text-lg"
                    placeholder="Insert Text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
            </div>
        </div>
    )
}
