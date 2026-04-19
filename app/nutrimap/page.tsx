"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox"
import { Send, MapPin, Star, Navigation, ExternalLink, Loader2, AlertTriangle, Zap } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import "mapbox-gl/dist/mapbox-gl.css"

const NUTRIMAP_URL = process.env.NEXT_PUBLIC_NUTRIMAP_URL ?? "http://localhost:8000"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Restaurant {
  name: string
  cuisine: string[]
  price_level: string | null
  rating: number | null
  distance_miles: number | null
  address: string | null
  website: string | null
  google_maps_url: string | null
  is_open: boolean | null
  hours_summary: string | null
  health_score: number
  reason: string | null
  health_highlights: string[]
  key_menu_items: string[]
  lat?: number
  lng?: number
}

interface SearchResult {
  restaurants: Restaurant[]
  query_intent: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/40", hex: "#10b981" }
  if (score >= 60) return { bg: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/40", hex: "#f59e0b" }
  return { bg: "bg-red-500", text: "text-red-400", border: "border-red-500/40", hex: "#ef4444" }
}

// ── Map Marker ─────────────────────────────────────────────────────────────────

function RestaurantMarker({
  restaurant,
  index,
  isSelected,
  onClick,
}: {
  restaurant: Restaurant
  index: number
  isSelected: boolean
  onClick: () => void
}) {
  if (!restaurant.lat || !restaurant.lng) return null
  const { hex } = scoreColor(restaurant.health_score)

  return (
    <Marker longitude={restaurant.lng} latitude={restaurant.lat} anchor="bottom">
      <button
        onClick={onClick}
        className="group relative"
        style={{ transform: isSelected ? "scale(1.15)" : "scale(1)", transition: "transform 0.15s" }}
      >
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-lg border whitespace-nowrap"
          style={{
            background: isSelected ? hex : "rgba(10,12,20,0.92)",
            borderColor: hex,
            color: isSelected ? "#fff" : hex,
            boxShadow: isSelected ? `0 0 12px ${hex}60` : "none",
          }}
        >
          <span className="truncate max-w-[90px]">
            {restaurant.name.split(" ").slice(0, 2).join(" ")}
          </span>
          <span>· {restaurant.health_score}%</span>
        </div>
        <div
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: hex }}
        />
      </button>
    </Marker>
  )
}

// ── Result Card ────────────────────────────────────────────────────────────────

function ResultCard({
  restaurant,
  index,
  isSelected,
  onClick,
}: {
  restaurant: Restaurant
  index: number
  isSelected: boolean
  onClick: () => void
}) {
  const { text, border, bg } = scoreColor(restaurant.health_score)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSelected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [isSelected])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onClick}
      className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 ${
        isSelected
          ? `${border} bg-white/5`
          : "border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/15"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">{restaurant.name}</p>
            {restaurant.price_level && (
              <span className="text-[10px] text-white/40 shrink-0">{restaurant.price_level}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {restaurant.is_open !== null && (
              <span className={`text-[10px] font-semibold ${restaurant.is_open ? "text-emerald-400" : "text-red-400"}`}>
                {restaurant.is_open ? "Open" : "Closed"}
              </span>
            )}
            {restaurant.rating && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <Star className="w-2.5 h-2.5 fill-amber-400" />
                {restaurant.rating}
              </span>
            )}
            {restaurant.distance_miles !== null && (
              <span className="text-[10px] text-white/40">{restaurant.distance_miles} mi</span>
            )}
            {restaurant.cuisine.length > 0 && (
              <span className="text-[10px] text-white/40">{restaurant.cuisine.slice(0, 2).join(" · ")}</span>
            )}
          </div>
        </div>

        {/* Health score badge */}
        <div className={`shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl border ${border} bg-white/5`}>
          <span className={`text-base font-black leading-none ${text}`}>{restaurant.health_score}</span>
          <span className="text-[8px] text-white/30 mt-0.5">health</span>
        </div>
      </div>

      {/* Reason */}
      {restaurant.reason && (
        <p className="text-[11px] text-white/55 mt-2.5 leading-relaxed">{restaurant.reason}</p>
      )}

      {/* Highlights */}
      {restaurant.health_highlights.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {restaurant.health_highlights.map((h, i) => (
            <span key={i} className="text-[10px] bg-white/6 border border-white/10 text-white/50 rounded-full px-2 py-0.5">
              {h}
            </span>
          ))}
        </div>
      )}

      {/* Key items */}
      {restaurant.key_menu_items.length > 0 && (
        <p className="text-[10px] text-white/35 mt-2">
          Try: {restaurant.key_menu_items.slice(0, 3).join(", ")}
        </p>
      )}

      {/* Links */}
      <div className="flex gap-3 mt-3">
        {restaurant.google_maps_url && (
          <a
            href={restaurant.google_maps_url}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
          >
            <MapPin className="w-2.5 h-2.5" /> Directions
          </a>
        )}
        {restaurant.website && (
          <a
            href={restaurant.website}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" /> Website
          </a>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function NutriMapPage() {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agentReady, setAgentReady] = useState<boolean | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [viewState, setViewState] = useState({
    longitude: -84.388,
    latitude: 33.749,
    zoom: 12,
  })
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch Mapbox token from backend config
  useEffect(() => {
    fetch(`${NUTRIMAP_URL}/api/config`)
      .then(r => r.json())
      .then(d => {
        setMapboxToken(d.mapbox_token ?? null)
        setAgentReady(true)
      })
      .catch(() => setAgentReady(false))
  }, [])

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setViewState(v => ({ ...v, latitude: loc.lat, longitude: loc.lng }))
      },
      () => {},
    )
  }, [])

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    setResults(null)
    setSelectedIndex(null)

    const lat = userLocation?.lat ?? viewState.latitude
    const lng = userLocation?.lng ?? viewState.longitude

    try {
      const res = await fetch("/api/nutrimap/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed, lat, lng, radius_meters: 2000 }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error ?? "Search failed")
        return
      }

      const data: SearchResult = await res.json()
      setResults(data)
    } catch {
      setError("Could not reach the NutriMap backend.")
    } finally {
      setLoading(false)
    }
  }, [query, loading, userLocation, viewState.latitude, viewState.longitude])

  const restaurants = results?.restaurants ?? []

  return (
    <div className="fixed inset-0 flex bg-[#0a0c14] text-white" style={{ paddingBottom: 0 }}>

      {/* ── Left: Map ── */}
      <div className="relative flex-1 min-w-0">
        {mapboxToken ? (
          <Map
            {...viewState}
            onMove={e => setViewState(e.viewState)}
            mapboxAccessToken={mapboxToken}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-left" />

            {/* User location dot */}
            {userLocation && (
              <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                  <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50" />
                </div>
              </Marker>
            )}

            {/* Restaurant markers */}
            {restaurants.map((r, i) => (
              <RestaurantMarker
                key={i}
                restaurant={r}
                index={i}
                isSelected={selectedIndex === i}
                onClick={() => setSelectedIndex(i === selectedIndex ? null : i)}
              />
            ))}
          </Map>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0d1117]">
            {agentReady === false ? (
              <div className="text-center space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm text-white/50">Backend offline — start it with <code className="text-amber-400">uvicorn main:app</code></p>
              </div>
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-white/30" />
            )}
          </div>
        )}

        {/* Result count badge */}
        {restaurants.length > 0 && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl bg-black/70 backdrop-blur border border-white/10 px-3 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium">{restaurants.length} spot{restaurants.length !== 1 ? "s" : ""} found nearby</span>
            {results?.query_intent && (
              <span className="text-[10px] text-white/40 max-w-[200px] truncate">· {results.query_intent}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Right: Sidebar ── */}
      <div className="w-[380px] shrink-0 flex flex-col border-l border-white/8 bg-[#0d0f1a]">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">NutriMap</h1>
                <p className="text-[9px] text-white/35 uppercase tracking-widest">AI-powered health-food discovery</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${agentReady === false ? "bg-red-500" : agentReady === true ? "bg-emerald-500 animate-pulse" : "bg-white/20"}`} />
              <span className="text-[10px] text-white/40">{agentReady === false ? "offline" : agentReady === true ? "Agent ready" : "connecting…"}</span>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Ask NutriMap</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                className="flex-1 rounded-xl bg-white/6 border border-white/10 px-3 py-2.5 text-xs placeholder:text-white/25 outline-none focus:border-emerald-500/50 focus:bg-white/8 transition-all"
                placeholder="e.g. high-protein Thai nearby…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-emerald-400 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Send className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-3">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <p className="text-xs text-white/30">Claude is searching nearby restaurants…</p>
            </div>
          )}

          {!loading && results && restaurants.length === 0 && (
            <div className="text-center py-16">
              <p className="text-xs text-white/30">No results found. Try a different query.</p>
            </div>
          )}

          {!loading && !results && !error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Navigation className="w-8 h-8 text-white/15" />
              <p className="text-xs text-white/25 max-w-[200px]">
                Search for healthy food options near your current location
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {["high-protein lunch", "vegan bowls", "low-carb near me", "healthy Thai"].map(s => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); setTimeout(() => inputRef.current?.focus(), 50) }}
                    className="text-[10px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-2.5 py-1 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {!loading && restaurants.map((r, i) => (
              <ResultCard
                key={i}
                restaurant={r}
                index={i}
                isSelected={selectedIndex === i}
                onClick={() => setSelectedIndex(i === selectedIndex ? null : i)}
              />
            ))}
          </AnimatePresence>

          {restaurants.length > 0 && (
            <p className="text-[9px] text-white/20 text-center pt-2 pb-1">
              Results ranked by health score · powered by Claude + Google Places
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
