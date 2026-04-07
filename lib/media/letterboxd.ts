/**
 * Server-side Letterboxd RSS utilities.
 * Parses public watchlist feeds and cross-references titles with TMDB.
 */

const TMDB_BASE  = "https://api.themoviedb.org/3"
const TMDB_IMG   = "https://image.tmdb.org/t/p/w342"
const TMDB_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN

export interface LetterboxdFilm {
    title: string
    year:  number | null
}

export interface EnrichedFilm {
    title:      string
    year:       number | null
    posterUrl:  string | null
    externalId: string | null
}

// ── RSS fetching + parsing ────────────────────────────────────────────────

/**
 * Fetches the public watchlist RSS for a Letterboxd username.
 * Throws a user-facing error string if the profile is not found or private.
 */
export async function fetchLetterboxdWatchlist(username: string): Promise<LetterboxdFilm[]> {
    const url = `https://letterboxd.com/${username.trim()}/watchlist/rss/`
    let res: Response
    try {
        res = await fetch(url, {
            headers: { "User-Agent": "Meridian/1.0" },
            next: { revalidate: 0 },
        })
    } catch {
        throw new Error("Could not reach Letterboxd — check your connection.")
    }

    if (res.status === 404) {
        throw new Error(`Letterboxd profile "${username}" not found or watchlist is private.`)
    }
    if (!res.ok) {
        throw new Error(`Letterboxd returned an error (${res.status}).`)
    }

    const xml = await res.text()
    return parseRSSItems(xml)
}

function parseRSSItems(xml: string): LetterboxdFilm[] {
    const films: LetterboxdFilm[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match: RegExpExecArray | null

    while ((match = itemRegex.exec(xml)) !== null) {
        const block = match[1]

        // Prefer letterboxd:filmTitle (clean title without year suffix)
        const titleMatch =
            block.match(/<letterboxd:filmTitle><!\[CDATA\[(.*?)\]\]><\/letterboxd:filmTitle>/) ??
            block.match(/<letterboxd:filmTitle>(.*?)<\/letterboxd:filmTitle>/)

        const yearMatch = block.match(/<letterboxd:filmYear>(\d{4})<\/letterboxd:filmYear>/)

        if (titleMatch?.[1]?.trim()) {
            films.push({
                title: titleMatch[1].trim(),
                year:  yearMatch ? parseInt(yearMatch[1], 10) : null,
            })
        }
    }

    return films
}

// ── TMDB cross-reference ─────────────────────────────────────────────────

async function tmdbSearch(title: string, year: number | null): Promise<EnrichedFilm> {
    const params = new URLSearchParams({ query: title, page: "1" })
    if (year) params.set("year", String(year))

    try {
        const res  = await fetch(`${TMDB_BASE}/search/movie?${params}`, {
            headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
            next: { revalidate: 0 },
        })
        const data = await res.json()
        const top  = data.results?.[0]
        if (!top) return { title, year, posterUrl: null, externalId: null }

        return {
            title:      top.title ?? title,
            year:       top.release_date ? parseInt(top.release_date.slice(0, 4), 10) : year,
            posterUrl:  top.poster_path ? `${TMDB_IMG}${top.poster_path}` : null,
            externalId: String(top.id),
        }
    } catch {
        return { title, year, posterUrl: null, externalId: null }
    }
}

/**
 * Enriches a batch of Letterboxd films with TMDB metadata.
 * Runs in parallel batches of 5 to stay within TMDB rate limits.
 */
export async function enrichWithTMDB(films: LetterboxdFilm[]): Promise<EnrichedFilm[]> {
    const results: EnrichedFilm[] = []
    const batchSize = 5

    for (let i = 0; i < films.length; i += batchSize) {
        const batch  = films.slice(i, i + batchSize)
        const batch_ = await Promise.all(batch.map(f => tmdbSearch(f.title, f.year)))
        results.push(...batch_)
    }

    return results
}
