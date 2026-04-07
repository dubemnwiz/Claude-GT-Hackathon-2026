"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
    Library, Plus, X, Star, ChevronDown, BookOpen, Film, Tv,
    Search, Loader2, ImageOff, Download, CheckCircle2, AlertCircle,
    GripVertical, Trophy, LayoutGrid, List,
} from "lucide-react"
import Image from "next/image"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// ── Types ──────────────────────────────────────────────────────────────────

type MediaType   = "ALL" | "BOOK" | "MOVIE" | "TV_SHOW"
type MediaStatus = "WANT_TO" | "IN_PROGRESS" | "DONE"
type ViewMode    = "grid" | "ranked"

interface MediaItem {
    id:         string
    title:      string
    type:       "BOOK" | "MOVIE" | "TV_SHOW"
    status:     MediaStatus
    rating:     number | null
    notes:      string | null
    posterUrl:  string | null
    externalId: string | null
    year:       number | null
    author:     string | null
    rank:       number | null
    createdAt:  string
}

interface SearchResult {
    externalId: string
    title:      string
    author:     string | null
    year:       number | null
    posterUrl:  string | null
    overview:   string | null
}

// ── Config ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
    BOOK:    { label: "Book",    icon: BookOpen, color: "text-violet-500",  bg: "bg-violet-500/10" },
    MOVIE:   { label: "Movie",   icon: Film,     color: "text-blue-500",    bg: "bg-blue-500/10"   },
    TV_SHOW: { label: "TV Show", icon: Tv,       color: "text-rose-500",    bg: "bg-rose-500/10"   },
}

const STATUS_CONFIG = {
    WANT_TO:     { label: "Want to",     pill: "bg-slate-500/15 text-slate-400"      },
    IN_PROGRESS: { label: "In Progress", pill: "bg-amber-500/15 text-amber-500"      },
    DONE:        { label: "Done",        pill: "bg-emerald-500/15 text-emerald-500"  },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
    const [hovered, setHovered] = useState<number | null>(null)
    const active = hovered ?? value ?? 0
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    onClick={() => onChange(value === n ? null : n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(null)}
                    className="text-amber-400 transition-transform hover:scale-110"
                >
                    <Star className={cn("h-4 w-4", n <= active ? "fill-amber-400" : "fill-none stroke-amber-400/40")} />
                </button>
            ))}
        </div>
    )
}

function StarDisplay({ value, size = "sm" }: { value: number | null; size?: "sm" | "xs" }) {
    if (!value) return null
    const cls = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3"
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} className={cn(cls, n <= value ? "fill-amber-400 text-amber-400" : "fill-none text-amber-400/30")} />
            ))}
        </div>
    )
}

function Poster({ url, title, size = "sm" }: { url: string | null; title: string; size?: "sm" | "lg" | "xs" }) {
    const [failed, setFailed] = useState(false)
    const dim = size === "lg" ? "w-16 h-24" : size === "xs" ? "w-8 h-11" : "w-10 h-14"
    if (!url || failed) {
        return (
            <div className={cn("rounded-lg bg-muted/50 flex items-center justify-center shrink-0", dim)}>
                <ImageOff className="h-3 w-3 text-muted-foreground/30" />
            </div>
        )
    }
    return (
        <div className={cn("relative rounded-lg overflow-hidden shrink-0", dim)}>
            <Image
                src={url}
                alt={title}
                fill
                className="object-cover"
                onError={() => setFailed(true)}
                sizes={size === "lg" ? "64px" : size === "xs" ? "32px" : "40px"}
            />
        </div>
    )
}

// ── Letterboxd Import Modal ────────────────────────────────────────────────

type ImportState = "idle" | "loading" | "done" | "error"

interface ImportResult {
    imported: number
    skipped:  number
    total:    number
    capped:   boolean
}

function LetterboxdImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
    const [username, setUsername] = useState("")
    const [state,    setState]    = useState<ImportState>("idle")
    const [result,   setResult]   = useState<ImportResult | null>(null)
    const [errMsg,   setErrMsg]   = useState("")

    const handleImport = async () => {
        if (!username.trim() || state === "loading") return
        setState("loading"); setResult(null); setErrMsg("")
        try {
            const res  = await fetch("/api/media/letterboxd", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: username.trim() }),
            })
            if (!res.ok) { setErrMsg(await res.text() || "Import failed"); setState("error"); return }
            const data = await res.json()
            setResult(data); setState("done"); onImported()
        } catch {
            setErrMsg("Something went wrong. Check your connection and try again.")
            setState("error")
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={state === "loading" ? undefined : onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-card border border-border/40 shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#00e054]/10 flex items-center justify-center">
                            <span className="text-[#00e054] text-xs font-bold">LB</span>
                        </div>
                        <h2 className="text-base font-semibold">Import from Letterboxd</h2>
                    </div>
                    <button onClick={onClose} disabled={state === "loading"}
                        className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground disabled:opacity-40">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                {state !== "done" && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Enter your Letterboxd username to import your public watchlist. Films already in your library are skipped.
                    </p>
                )}
                {state !== "done" && (
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                            letterboxd.com/
                        </span>
                        <input autoFocus value={username} onChange={e => setUsername(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleImport()}
                            disabled={state === "loading"} placeholder="username"
                            className="w-full pl-[6.5rem] pr-3 py-2.5 rounded-xl bg-muted/60 border border-border/40 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground/40 disabled:opacity-60" />
                    </div>
                )}
                {state === "error" && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">{errMsg}</p>
                    </motion.div>
                )}
                {state === "done" && result && (
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Import complete!</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {result.imported} film{result.imported !== 1 ? "s" : ""} added
                                    {result.skipped > 0 && ` · ${result.skipped} already in your library`}
                                    {result.capped && ` · first 100 of ${result.total} imported`}
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                            These are set to <strong>Want to watch</strong>. Update them here as you go.
                        </p>
                    </motion.div>
                )}
                {state !== "done" ? (
                    <button onClick={handleImport} disabled={!username.trim() || state === "loading"}
                        className="w-full py-2.5 rounded-xl bg-[#00e054] text-black text-sm font-semibold disabled:opacity-50 transition-opacity flex items-center justify-center gap-2">
                        {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing watchlist…</>
                            : <><Download className="h-4 w-4" /> Import watchlist</>}
                    </button>
                ) : (
                    <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Done</button>
                )}
            </motion.div>
        </motion.div>
    )
}

// ── Add / Search Modal ─────────────────────────────────────────────────────

function AddItemModal({ onClose, onAdd }: { onClose: () => void; onAdd: (item: MediaItem) => void }) {
    const [type,      setType]      = useState<"BOOK" | "MOVIE" | "TV_SHOW">("MOVIE")
    const [query,     setQuery]     = useState("")
    const [results,   setResults]   = useState<SearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [selected,  setSelected]  = useState<SearchResult | null>(null)
    const [manual,    setManual]    = useState(false)
    const [title,     setTitle]     = useState("")
    const [author,    setAuthor]    = useState("")
    const [status,    setStatus]    = useState<MediaStatus>("WANT_TO")
    const [rating,    setRating]    = useState<number | null>(null)
    const [notes,     setNotes]     = useState("")
    const [saving,    setSaving]    = useState(false)
    const [addError,  setAddError]  = useState<string | null>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (!query.trim() || manual) { setResults([]); return }
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const res  = await fetch(`/api/media/search?q=${encodeURIComponent(query)}&type=${type}`)
                const data = await res.json()
                setResults(Array.isArray(data) ? data : [])
            } catch { setResults([]) }
            finally { setSearching(false) }
        }, 350)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query, type, manual])

    useEffect(() => { setQuery(""); setResults([]); setSelected(null) }, [type])

    const selectResult = (r: SearchResult) => {
        setSelected(r); setTitle(r.title); setAuthor(r.author ?? ""); setResults([]); setQuery(r.title)
    }

    const handleSubmit = async () => {
        const finalTitle = (selected?.title ?? title).trim()
        if (!finalTitle) return
        setSaving(true)
        setAddError(null)
        try {
            const res = await fetch("/api/media", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: finalTitle, type, status, rating,
                    notes: notes.trim() || null,
                    author:     (selected?.author ?? (author || null)),
                    posterUrl:  selected?.posterUrl   ?? null,
                    externalId: selected?.externalId  ?? null,
                    year:       selected?.year        ?? null,
                }),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || `Failed to add (Status ${res.status})`)
            }

            const created = await res.json()
            onAdd(created)
            onClose()
        } catch (err: any) {
            setAddError(err.message || "An unexpected error occurred")
        } finally {
            setSaving(false)
        }
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-card border border-border/40 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Add to tracker</h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"><X className="h-4 w-4" /></button>
                </div>

                {/* Type picker */}
                <div className="flex gap-2">
                    {(["BOOK", "MOVIE", "TV_SHOW"] as const).map(t => {
                        const cfg = TYPE_CONFIG[t]; const Icon = cfg.icon
                        return (
                            <button key={t} type="button" onClick={() => setType(t)}
                                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                                    type === t ? `${cfg.bg} ${cfg.color} border-current/30` : "border-border/30 text-muted-foreground hover:border-border/60")}>
                                <Icon className="h-3.5 w-3.5" />{cfg.label}
                            </button>
                        )
                    })}
                </div>

                {/* Search or manual input */}
                {!manual ? (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input autoFocus value={query} onChange={e => { setQuery(e.target.value); setSelected(null) }}
                            placeholder={`Search for a ${TYPE_CONFIG[type].label.toLowerCase()}…`}
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-muted/60 border border-border/40 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground/60" />
                        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground animate-spin" />}
                        {selected && !searching && (
                            <button type="button" onClick={() => { setSelected(null); setQuery("") }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleSubmit()} placeholder="Title…"
                            className="w-full px-3 py-2.5 rounded-xl bg-muted/60 border border-border/40 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground/60" />
                        {type === "BOOK" && (
                            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author (optional)…"
                                className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border/40 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground/60" />
                        )}
                    </div>
                )}

                {/* Search results */}
                <AnimatePresence>
                    {results.length > 0 && !selected && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                            className="rounded-xl border border-border/40 bg-card overflow-hidden shadow-lg -mt-2">
                            {results.map((r, i) => (
                                <button key={r.externalId} type="button" onClick={() => selectResult(r)}
                                    className={cn("w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left",
                                        i > 0 && "border-t border-border/20")}>
                                    <Poster url={r.posterUrl} title={r.title} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">{r.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {[r.author, r.year].filter(Boolean).join(" · ")}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Selected preview */}
                <AnimatePresence>
                    {selected && (
                        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                            <Poster url={selected.posterUrl} title={selected.title} size="lg" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{selected.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    {[selected.author, selected.year].filter(Boolean).join(" · ")}
                                </p>
                                {selected.overview && (
                                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{selected.overview}</p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button type="button" onClick={() => { setManual(v => !v); setSelected(null); setQuery(""); setTitle(""); setAuthor("") }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                    {manual ? "← Search instead" : "Can't find it? Add manually"}
                </button>

                {/* Status */}
                <div className="flex gap-2">
                    {(["WANT_TO", "IN_PROGRESS", "DONE"] as const).map(s => (
                        <button key={s} type="button" onClick={() => setStatus(s)}
                            className={cn("flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                                status === s ? `${STATUS_CONFIG[s].pill} border-current/20` : "border-border/30 text-muted-foreground hover:border-border/60")}>
                            {STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Rating</span>
                    <StarRating value={rating} onChange={setRating} />
                    {rating && <span className="text-xs text-muted-foreground">{rating}/5</span>}
                </div>

                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)…" rows={2}
                    className="w-full px-3 py-2 rounded-xl bg-muted/60 border border-border/40 text-sm outline-none focus:border-primary/50 placeholder:text-muted-foreground/60 resize-none" />

                {addError && (
                    <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20">
                        {addError}
                    </p>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={saving || (manual ? !title.trim() : !selected)}
                    className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 transition-opacity"
                >
                    {saving ? "Adding…" : "Add"}
                </button>
            </motion.div>
        </motion.div>
    )
}

// ── Grid Media Card ────────────────────────────────────────────────────────

function MediaCard({ item, onDelete, onStatusChange, onRatingChange }: {
    item: MediaItem
    onDelete:       (id: string) => void
    onStatusChange: (id: string, status: MediaStatus) => void
    onRatingChange: (id: string, rating: number | null) => void
}) {
    const typeCfg  = TYPE_CONFIG[item.type]
    const TypeIcon = typeCfg.icon
    const [expanded, setExpanded] = useState(false)

    return (
        <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
            className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-md p-4 group">
            <div className="flex items-start gap-3">
                {item.posterUrl ? (
                    <Poster url={item.posterUrl} title={item.title} size="lg" />
                ) : (
                    <div className={cn("shrink-0 p-2 rounded-xl mt-0.5", typeCfg.bg)}>
                        <TypeIcon className={cn("h-4 w-4", typeCfg.color)} />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{item.title}</p>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", STATUS_CONFIG[item.status].pill)}>
                            {STATUS_CONFIG[item.status].label}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.author && <p className="text-xs text-muted-foreground truncate">{item.author}</p>}
                        {item.year && !item.author && <span className="text-xs text-muted-foreground">{item.year}</span>}
                        {item.year && item.author && <span className="text-xs text-muted-foreground/50">· {item.year}</span>}
                    </div>
                    <StarDisplay value={item.rating} size="sm" />
                    {item.notes && !expanded && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.notes}</p>}
                    {item.notes && expanded  && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {item.notes && (
                        <button onClick={() => setExpanded(v => !v)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors">
                            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                        </button>
                    )}
                    <button onClick={() => onDelete(item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-destructive transition-all">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <div className="flex gap-1.5 mt-3 pt-3 border-t border-border/20">
                {(["WANT_TO", "IN_PROGRESS", "DONE"] as const).map(s => (
                    <button key={s} onClick={() => onStatusChange(item.id, s)}
                        className={cn("flex-1 py-1 rounded-lg text-xs font-medium transition-all",
                            item.status === s ? STATUS_CONFIG[s].pill : "text-muted-foreground hover:bg-muted/60")}>
                        {STATUS_CONFIG[s].label}
                    </button>
                ))}
                <div className="border-l border-border/20 pl-1.5">
                    <StarRating value={item.rating} onChange={r => onRatingChange(item.id, r)} />
                </div>
            </div>
        </motion.div>
    )
}

// ── Ranked Row (sortable) ──────────────────────────────────────────────────

function SortableRankRow({ item, position }: { item: MediaItem; position: number }) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: item.id })
    const style = { transform: CSS.Transform.toString(transform), transition }
    const typeCfg = TYPE_CONFIG[item.type]

    if (isDragging) {
        return (
            <div ref={setNodeRef} style={style}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 border-primary/30 bg-primary/5 opacity-50 h-[56px]" />
        )
    }

    return (
        <div ref={setNodeRef} style={style}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card/50 border border-border/30 hover:bg-muted/30 transition-colors group">

            {/* Drag handle */}
            <button {...attributes} {...listeners}
                className="text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing shrink-0 touch-none">
                <GripVertical className="h-4 w-4" />
            </button>

            {/* Position badge */}
            <div className={cn(
                "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                position === 1 ? "bg-amber-400/20 text-amber-500" :
                position === 2 ? "bg-slate-400/20 text-slate-500" :
                position === 3 ? "bg-orange-400/20 text-orange-500" :
                "bg-muted/40 text-muted-foreground"
            )}>
                {position <= 3 ? <Trophy className="h-3 w-3" /> : position}
            </div>

            {/* Poster */}
            <Poster url={item.posterUrl} title={item.title} size="xs" />

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                    {[item.author, item.year, typeCfg.label].filter(Boolean).join(" · ")}
                </p>
            </div>

            {/* Stars */}
            <StarDisplay value={item.rating} size="xs" />
        </div>
    )
}

// ── Ranked View ────────────────────────────────────────────────────────────

function RankingList({
    items,
    sensors,
    onReorder,
}: {
    items:      MediaItem[]
    sensors:    any
    onReorder:  (id: string, newRank: number) => void
}) {
    const [ranked, unranked] = useMemo(() => {
        const r = items.filter(i => i.rank !== null).sort((a, b) => a.rank! - b.rank!)
        const u = items.filter(i => i.rank === null)
        return [r, u]
    }, [items])

    const allSorted = [...ranked, ...unranked]

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const oldIdx = allSorted.findIndex(i => i.id === active.id)
        const newIdx = allSorted.findIndex(i => i.id === over.id)
        if (oldIdx === -1 || newIdx === -1) return

        const reordered = arrayMove(allSorted, oldIdx, newIdx)
        const movedIdx  = newIdx
        const prev      = reordered[movedIdx - 1]
        const next      = reordered[movedIdx + 1]

        const BASE = Date.now()
        const prevRank = prev?.rank ?? (BASE - 2000)
        const nextRank = next?.rank ?? null

        let newRank: number
        if (!prev && !next)       newRank = 1000
        else if (!prev)           newRank = nextRank! - 1000
        else if (nextRank === null) newRank = prevRank + 1000
        else                      newRank = (prevRank + nextRank) / 2

        onReorder(String(active.id), newRank)
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={allSorted.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                    {ranked.map((item, idx) => (
                        <SortableRankRow key={item.id} item={item} position={idx + 1} />
                    ))}
                    {unranked.length > 0 && (
                        <>
                            {ranked.length > 0 && (
                                <div className="flex items-center gap-3 my-3">
                                    <div className="h-px flex-1 bg-border/30" />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">Not yet ranked</span>
                                    <div className="h-px flex-1 bg-border/30" />
                                </div>
                            )}
                            <div className="space-y-2">
                                {unranked.map((item, idx) => (
                                    <SortableRankRow key={item.id} item={item} position={ranked.length + idx + 1} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </SortableContext>
        </DndContext>
    )
}

function RankedView({
    items,
    typeFilter,
    onReorder,
}: {
    items:      MediaItem[]
    typeFilter: MediaType
    onReorder:  (id: string, newRank: number) => void
}) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const doneItems = useMemo(() => items.filter(i => i.status === "DONE"), [items])

    if (doneItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Trophy className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <h3 className="text-base font-semibold mb-1">No ranked items yet</h3>
                <p className="text-sm text-muted-foreground">
                    Mark items as <strong>Done</strong> and they&apos;ll appear here to rank.
                </p>
            </div>
        )
    }

    const typesToRender = typeFilter === "ALL" ? (["MOVIE", "TV_SHOW", "BOOK"] as const) : [typeFilter as "MOVIE" | "TV_SHOW" | "BOOK"]

    return (
        <div className="space-y-8">
            {typesToRender.map(type => {
                const typeItems = doneItems.filter(i => i.type === type)
                if (typeItems.length === 0) return null

                return (
                    <div key={type} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            {typeFilter === "ALL" && (
                                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">
                                    {TYPE_CONFIG[type].label}s
                                </h3>
                            )}
                            <div className="h-px flex-1 bg-border/20" />
                        </div>
                        <RankingList
                            items={typeItems}
                            sensors={sensors}
                            onReorder={onReorder}
                        />
                    </div>
                )
            })}
            <p className="text-xs text-muted-foreground text-center pt-2">
                Drag to reorder items within their category
            </p>
        </div>
    )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MediaPage() {
    const [items,        setItems]        = useState<MediaItem[]>([])
    const [loading,      setLoading]      = useState(true)
    const [showAdd,      setShowAdd]      = useState(false)
    const [showImport,   setShowImport]   = useState(false)
    const [view,         setView]         = useState<ViewMode>("grid")
    const [typeFilter,   setTypeFilter]   = useState<MediaType>("ALL")
    const [statusFilter, setStatusFilter] = useState<MediaStatus | "ALL">("ALL")

    const refreshItems = () => {
        fetch("/api/media")
            .then(r => r.json())
            .then(data => { setItems(data); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { refreshItems() }, [])

    const handleAdd = (item: MediaItem) => setItems(prev => [item, ...prev])

    const handleDelete = async (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id))
        await fetch(`/api/media?id=${id}`, { method: "DELETE" })
    }

    const handleStatusChange = async (id: string, status: MediaStatus) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i))
        const res  = await fetch("/api/media", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body:   JSON.stringify({ id, status }),
        })
        // Server may have auto-assigned rank — sync it back
        if (status === "DONE") {
            const updated = await res.json()
            if (updated?.rank !== undefined) {
                setItems(prev => prev.map(i => i.id === id ? { ...i, rank: updated.rank } : i))
            }
        }
    }

    const handleRatingChange = async (id: string, rating: number | null) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, rating } : i))
        await fetch("/api/media", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body:   JSON.stringify({ id, rating }),
        })
    }

    const handleReorder = (id: string, newRank: number) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, rank: newRank } : i))
        fetch("/api/media", {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body:   JSON.stringify({ id, rank: newRank }),
        })
    }

    const filtered = items.filter(i => {
        const matchType   = typeFilter   === "ALL" || i.type   === typeFilter
        const matchStatus = statusFilter === "ALL" || i.status === statusFilter
        return matchType && matchStatus
    })

    const counts = {
        BOOK:    items.filter(i => i.type === "BOOK").length,
        MOVIE:   items.filter(i => i.type === "MOVIE").length,
        TV_SHOW: items.filter(i => i.type === "TV_SHOW").length,
    }

    return (
        <div className="relative min-h-full py-6">
            <div className="fixed inset-0 -z-10 pointer-events-none">
                <div className="absolute inset-0 opacity-40" style={{
                    background: `
                        radial-gradient(ellipse 70% 50% at 15% 25%, hsla(260,70%,60%,0.13) 0%, transparent 60%),
                        radial-gradient(ellipse 60% 40% at 85% 75%, hsla(210,80%,55%,0.10) 0%, transparent 55%)
                    `,
                }} />
            </div>

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-primary/10">
                            <Library className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Media Tracker</h1>
                            <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""} tracked</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View toggle */}
                        <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/40 border border-border/30">
                            <button onClick={() => setView("grid")}
                                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                    view === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                <LayoutGrid className="h-3.5 w-3.5" /> Grid
                            </button>
                            <button onClick={() => setView("ranked")}
                                className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                    view === "ranked" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                <Trophy className="h-3.5 w-3.5" /> Ranked
                            </button>
                        </div>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setShowImport(true)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/40 bg-card/60 text-sm font-semibold hover:bg-muted/60 transition-colors">
                            <span className="text-[#00e054] font-bold text-xs">LB</span>
                            <span className="hidden sm:inline">Import</span>
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={() => setShowAdd(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20">
                            <Plus className="h-4 w-4" /> Add
                        </motion.button>
                    </div>
                </div>

                {/* Type filter pills (shared between views) */}
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setTypeFilter("ALL")}
                        className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                            typeFilter === "ALL" ? "bg-foreground text-background border-foreground" : "border-border/30 text-muted-foreground hover:border-border/60")}>
                        All · {items.length}
                    </button>
                    {(["BOOK", "MOVIE", "TV_SHOW"] as const).map(t => {
                        const cfg = TYPE_CONFIG[t]; const Icon = cfg.icon
                        return (
                            <button key={t} onClick={() => setTypeFilter(t)}
                                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all",
                                    typeFilter === t ? `${cfg.bg} ${cfg.color} border-current/30` : "border-border/30 text-muted-foreground hover:border-border/60")}>
                                <Icon className="h-3 w-3" />{cfg.label} · {counts[t]}
                            </button>
                        )
                    })}
                </div>

                {/* Ranked view */}
                {view === "ranked" && !loading && (
                    <RankedView items={items} typeFilter={typeFilter} onReorder={handleReorder} />
                )}

                {/* Grid view */}
                {view === "grid" && (
                    <>
                        {/* Status tabs */}
                        <div className="flex flex-wrap gap-2">
                            {(["ALL", "WANT_TO", "IN_PROGRESS", "DONE"] as const).map(s => {
                                const label = s === "ALL" ? "All" : STATUS_CONFIG[s].label
                                const cnt   = s === "ALL" ? filtered.length
                                    : items.filter(i => i.status === s && (typeFilter === "ALL" || i.type === typeFilter)).length
                                return (
                                    <button key={s} onClick={() => setStatusFilter(s)}
                                        className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                                            statusFilter === s
                                                ? s === "ALL" ? "bg-foreground text-background border-foreground"
                                                    : STATUS_CONFIG[s].pill + " border-current/20"
                                                : "border-border/30 text-muted-foreground hover:border-border/60")}>
                                        {label} {cnt > 0 && <span className="opacity-70">{cnt}</span>}
                                    </button>
                                )
                            })}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="h-28 rounded-2xl bg-card/50 border border-border/30 animate-pulse" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                                    <Library className="h-7 w-7 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1">Nothing here yet</h3>
                                <p className="text-sm text-muted-foreground mb-6">Start tracking the books, movies, and shows in your life.</p>
                                <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                                    Add your first item
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <AnimatePresence>
                                    {filtered.map(item => (
                                        <MediaCard key={item.id} item={item}
                                            onDelete={handleDelete}
                                            onStatusChange={handleStatusChange}
                                            onRatingChange={handleRatingChange} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </>
                )}
            </div>

            <AnimatePresence>
                {showAdd    && <AddItemModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
                {showImport && <LetterboxdImportModal onClose={() => setShowImport(false)} onImported={refreshItems} />}
            </AnimatePresence>
        </div>
    )
}
