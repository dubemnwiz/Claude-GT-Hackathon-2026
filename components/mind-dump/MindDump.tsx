"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import {
    ExternalLink, X, Link2, Lightbulb, Youtube,
    Search, BookOpen, Clock, Layers
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteType = "text" | "link" | "youtube"
type Tag = "idea" | "read-later" | "resource" | "watch-later" | null

interface RawNote {
    id: string
    content: string
    type: string
    createdAt: string
}

interface ParsedNote {
    id: string
    type: NoteType
    text?: string
    url?: string
    note?: string
    videoId?: string
    tag?: Tag
    createdAt: string
}

type FilterOption = "All" | "Ideas" | "Links" | "Videos"
const FILTERS: FilterOption[] = ["All", "Ideas", "Links", "Videos"]

const TAGS: { value: Tag; label: string; icon: React.ElementType; color: string }[] = [
    { value: "idea",        label: "Idea",        icon: Lightbulb, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-400/30" },
    { value: "read-later",  label: "Read Later",  icon: BookOpen,  color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-400/30" },
    { value: "resource",    label: "Resource",    icon: Layers,    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-400/30" },
    { value: "watch-later", label: "Watch Later", icon: Clock,     color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-400/30" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
    try {
        const u = new URL(url.trim())
        if (u.hostname === "youtu.be") return u.pathname.slice(1).split("?")[0]
        if (u.hostname.includes("youtube.com")) return u.searchParams.get("v")
    } catch {}
    return null
}

function isUrl(str: string): boolean {
    try {
        const u = new URL(str.trim())
        return u.protocol.startsWith("http")
    } catch { return false }
}

function getDomain(url: string): string {
    try { return new URL(url).hostname.replace("www.", "") }
    catch { return url }
}

function parseNote(raw: RawNote): ParsedNote {
    try {
        const parsed = JSON.parse(raw.content)
        if (typeof parsed === "object" && parsed !== null) {
            return { id: raw.id, type: raw.type as NoteType, createdAt: raw.createdAt, ...parsed }
        }
    } catch {}
    return { id: raw.id, type: "text", text: raw.content, createdAt: raw.createdAt }
}

function detectType(input: string): NoteType {
    const trimmed = input.trim()
    if (extractYouTubeId(trimmed)) return "youtube"
    if (isUrl(trimmed)) return "link"
    return "text"
}

// ─── Tag badge ────────────────────────────────────────────────────────────────

function TagBadge({ tag }: { tag: Tag }) {
    const def = TAGS.find(t => t.value === tag)
    if (!def) return null
    const Icon = def.icon
    return (
        <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ring-1", def.color)}>
            <Icon className="h-3 w-3" />
            {def.label}
        </span>
    )
}

// ─── Card components ──────────────────────────────────────────────────────────

function TextCard({ note, onDelete, isEditing, editingText, onStartEdit, onEditChange, onSaveEdit }:
    { note: ParsedNote; onDelete: () => void; isEditing: boolean; editingText: string; onStartEdit: () => void; onEditChange: (v: string) => void; onSaveEdit: () => void }) {
    return (
        <div className="group relative p-4 rounded-xl bg-card/60 border border-border/40 hover:border-border/70 backdrop-blur-sm transition-all">
            {!isEditing && (
                <button
                    onClick={onDelete}
                    className="absolute top-2 right-2 p-2 rounded text-muted-foreground hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 transition-all"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
            <div className="flex items-start gap-3 pr-6">
                <div className="mt-0.5 p-1.5 rounded-lg bg-amber-500/10 shrink-0">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    {isEditing ? (
                        <textarea
                            autoFocus
                            value={editingText}
                            onChange={e => onEditChange(e.target.value)}
                            onBlur={onSaveEdit}
                            onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSaveEdit() }}
                            className="w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed"
                            rows={3}
                        />
                    ) : (
                        <p
                            className="text-sm leading-relaxed whitespace-pre-wrap break-words cursor-text"
                            onClick={onStartEdit}
                            title="Click to edit"
                        >
                            {note.text}
                        </p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                        {note.tag && <TagBadge tag={note.tag} />}
                        <span className="text-xs text-muted-foreground">{format(new Date(note.createdAt), "MMM d, yyyy · h:mm a")}</span>
                        {!isEditing && <span className="text-xs text-muted-foreground/40">Click to edit</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}

function LinkCard({ note, onDelete }: { note: ParsedNote; onDelete: () => void }) {
    const domain = getDomain(note.url ?? "")
    return (
        <div className="group relative p-4 rounded-xl bg-card/60 border border-border/40 hover:border-border/70 backdrop-blur-sm transition-all">
            <button
                onClick={onDelete}
                className="absolute top-2 right-2 p-2 rounded text-muted-foreground hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 transition-all"
            >
                <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start gap-3 pr-6">
                <div className="mt-0.5 p-1.5 rounded-lg bg-primary/10 shrink-0">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                    {note.note && <p className="text-sm font-medium">{note.note}</p>}
                    <a
                        href={note.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline truncate max-w-full"
                        title={note.text || note.url}
                    >
                        <span className="truncate font-medium">{note.text || domain}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <p className="text-xs text-muted-foreground truncate">{note.text ? domain : note.url}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        {note.tag && <TagBadge tag={note.tag} />}
                        <span className="text-xs text-muted-foreground">{format(new Date(note.createdAt), "MMM d, yyyy · h:mm a")}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function YoutubeCard({ note, onDelete }: { note: ParsedNote; onDelete: () => void }) {
    return (
        <div className="group relative rounded-xl bg-card/60 border border-border/40 hover:border-border/70 backdrop-blur-sm transition-all overflow-hidden">
            <button
                onClick={onDelete}
                className="absolute top-2 right-2 z-10 p-2 rounded bg-black/60 text-white hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
            >
                <X className="h-3.5 w-3.5" />
            </button>
            <div className="aspect-video w-full">
                <iframe
                    src={`https://www.youtube-nocookie.com/embed/${note.videoId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                />
            </div>
            {(note.note || note.tag) && (
                <div className="p-3 flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 mr-1 max-w-[80%]">
                        <Youtube className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        {note.text && <span className="text-sm font-medium truncate">{note.text}</span>}
                    </div>
                    {note.note && <p className="text-sm text-foreground w-full">{note.note}</p>}
                    {note.tag && <TagBadge tag={note.tag} />}
                    <span className="text-xs text-muted-foreground ml-auto">{format(new Date(note.createdAt), "MMM d, yyyy")}</span>
                </div>
            )}
            {!note.note && !note.tag && (
                <div className="px-3 py-2 flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Youtube className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground truncate" title={note.text || 'YouTube Video'}>
                            {note.text || getDomain(note.url ?? "youtube.com")}
                        </span>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(note.createdAt), "MMM d, yyyy")}</span>
                </div>
            )}
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MindDump() {
    const [notes, setNotes] = useState<ParsedNote[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [input, setInput] = useState("")
    const [linkNote, setLinkNote] = useState("")
    const [selectedTag, setSelectedTag] = useState<Tag>(null)
    const [filter, setFilter] = useState<FilterOption>("All")
    const [search, setSearch] = useState("")
    const [submitting, setSubmitting] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingText, setEditingText] = useState("")
    const inputRef = useRef<HTMLTextAreaElement>(null)

    const inputType = input.trim() ? detectType(input) : null

    const fetchNotes = async () => {
        try {
            const res = await fetch("/api/dashboard")
            if (res.ok) {
                const raw: RawNote[] = await res.json()
                setNotes(raw.map(parseNote))
            }
        } catch {}
        finally { setIsLoading(false) }
    }

    useEffect(() => { fetchNotes() }, [])

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault()
        const trimmed = input.trim()
        if (!trimmed || submitting) return

        setSubmitting(true)
        const type = detectType(trimmed)
        let content: Record<string, unknown>

        if (type === "youtube") {
            const videoId = extractYouTubeId(trimmed)
            content = { url: trimmed, videoId, note: linkNote.trim() || undefined, tag: selectedTag }
        } else if (type === "link") {
            content = { url: trimmed, note: linkNote.trim() || undefined, tag: selectedTag }
        } else {
            content = { text: trimmed, tag: selectedTag }
        }

        try {
            const res = await fetch("/api/dashboard", {
                method: "POST",
                body: JSON.stringify({ content: JSON.stringify(content), type }),
                headers: { "Content-Type": "application/json" },
            })
            if (res.ok) {
                setInput("")
                setLinkNote("")
                setSelectedTag(null)
                fetchNotes()
            }
        } catch {}
        finally { setSubmitting(false) }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleSubmit()
        }
    }

    const deleteNote = async (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id))
        await fetch(`/api/dashboard?id=${id}`, { method: "DELETE" })
    }

    const startEdit = (note: ParsedNote) => {
        setEditingId(note.id)
        setEditingText(note.text ?? "")
    }

    const saveEdit = async (id: string) => {
        const trimmed = editingText.trim()
        if (!trimmed) { setEditingId(null); return }
        const note = notes.find(n => n.id === id)
        if (!note) { setEditingId(null); return }
        const updated = { ...note, text: trimmed }
        setNotes(prev => prev.map(n => n.id === id ? updated : n))
        setEditingId(null)
        await fetch("/api/dashboard", {
            method: "PUT",
            body: JSON.stringify({ id, content: JSON.stringify({ text: trimmed, tag: note.tag }) }),
            headers: { "Content-Type": "application/json" },
        })
    }

    // Filter + search
    const filtered = notes.filter(note => {
        if (filter === "Ideas" && note.type !== "text") return false
        if (filter === "Links" && note.type !== "link") return false
        if (filter === "Videos" && note.type !== "youtube") return false
        if (search) {
            const q = search.toLowerCase()
            const haystack = [note.text, note.note, note.url].filter(Boolean).join(" ").toLowerCase()
            return haystack.includes(q)
        }
        return true
    })

    const counts: Record<FilterOption, number> = {
        All: notes.length,
        Ideas: notes.filter(n => n.type === "text").length,
        Links: notes.filter(n => n.type === "link").length,
        Videos: notes.filter(n => n.type === "youtube").length,
    }

    const isUrlInput = inputType === "link" || inputType === "youtube"

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Input card */}
            <div className="rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm p-4 space-y-3">
                <Textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste a link, YouTube video, or dump an idea..."
                    className="resize-none border-none bg-transparent focus-visible:ring-0 p-0 text-sm placeholder:text-muted-foreground/60 min-h-[64px]"
                    rows={3}
                />

                {/* Optional note for URLs */}
                <AnimatePresence>
                    {isUrlInput && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Input
                                value={linkNote}
                                onChange={e => setLinkNote(e.target.value)}
                                placeholder="Add a note (optional)..."
                                className="h-8 text-sm bg-muted/30 border-border/40"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tag selector + submit */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {TAGS.map(({ value, label, icon: Icon, color }) => (
                            <button
                                key={value}
                                onClick={() => setSelectedTag(selectedTag === value ? null : value)}
                                className={cn(
                                    "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ring-1 transition-all",
                                    selectedTag === value ? color : "ring-border/40 text-muted-foreground hover:text-foreground bg-muted/20"
                                )}
                            >
                                <Icon className="h-3 w-3" />
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {inputType && (
                            <span className="text-xs text-muted-foreground">
                                {inputType === "youtube" ? "YouTube embed" : inputType === "link" ? "Link" : "Note"}
                            </span>
                        )}
                        <Button
                            onClick={handleSubmit}
                            disabled={!input.trim() || submitting}
                            size="sm"
                            className="h-8 px-4 text-xs"
                        >
                            {submitting ? "Saving…" : <><span className="sm:hidden">Add</span><span className="hidden sm:inline">Add ⌘↵</span></>}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filter + search bar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex gap-1 p-1 bg-muted/40 rounded-xl">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                                filter === f
                                    ? "bg-card shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f}
                            {counts[f] > 0 && (
                                <span className={cn("ml-1.5 text-[10px]", filter === f ? "text-muted-foreground" : "text-muted-foreground/60")}>
                                    {counts[f]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="pl-8 h-8 text-xs bg-muted/30 border-border/40"
                    />
                </div>
            </div>

            {/* Feed */}
            {isLoading ? (
                <div className="text-center text-muted-foreground text-sm py-12">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-12">
                    {search || filter !== "All" ? "No entries match your search." : "Nothing here yet — drop an idea or paste a link above."}
                </div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {filtered.map(note => (
                            <motion.div
                                key={note.id}
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ duration: 0.18 }}
                            >
                                {note.type === "text" && (
                                    <TextCard
                                        note={note}
                                        onDelete={() => deleteNote(note.id)}
                                        isEditing={editingId === note.id}
                                        editingText={editingText}
                                        onStartEdit={() => startEdit(note)}
                                        onEditChange={setEditingText}
                                        onSaveEdit={() => saveEdit(note.id)}
                                    />
                                )}
                                {note.type === "link" && <LinkCard note={note} onDelete={() => deleteNote(note.id)} />}
                                {note.type === "youtube" && <YoutubeCard note={note} onDelete={() => deleteNote(note.id)} />}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    )
}
