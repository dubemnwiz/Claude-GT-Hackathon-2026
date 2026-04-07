import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const TMDB_BASE  = "https://api.themoviedb.org/3"
const TMDB_IMG   = "https://image.tmdb.org/t/p/w342"
const TMDB_TOKEN = process.env.TMDB_READ_ACCESS_TOKEN

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const query = searchParams.get("q")?.trim()
    const type  = searchParams.get("type") // MOVIE | TV_SHOW | BOOK

    if (!query || !type) return new NextResponse("Missing params", { status: 400 })

    try {
        if (type === "BOOK") {
            const res  = await fetch(
                `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,cover_i,first_publish_year,key&limit=8`,
                { next: { revalidate: 3600 } }
            )
            const data = await res.json()
            const results = (data.docs ?? []).map((item: {
                key: string
                title: string
                author_name?: string[]
                cover_i?: number
                first_publish_year?: number
            }) => ({
                externalId: item.key.replace("/works/", ""),
                title:      item.title,
                author:     item.author_name?.join(", ") ?? null,
                year:       item.first_publish_year ?? null,
                posterUrl:  item.cover_i ? `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg` : null,
                overview:   null, // Open Library search doesn't return overview by default
            }))
            return NextResponse.json(results)
        }

        const endpoint = type === "MOVIE" ? "movie" : "tv"
        const res = await fetch(
            `${TMDB_BASE}/search/${endpoint}?query=${encodeURIComponent(query)}&page=1`,
            {
                headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
                next: { revalidate: 0 },
            }
        )
        const data = await res.json()

        const results = (data.results ?? []).slice(0, 8).map((item: {
            id: number
            title?: string
            name?: string
            release_date?: string
            first_air_date?: string
            poster_path?: string | null
            overview?: string
        }) => ({
            externalId: String(item.id),
            title:      item.title ?? item.name ?? "Unknown",
            year:       item.release_date
                            ? parseInt(item.release_date.slice(0, 4))
                            : item.first_air_date
                                ? parseInt(item.first_air_date.slice(0, 4))
                                : null,
            posterUrl:  item.poster_path ? `${TMDB_IMG}${item.poster_path}` : null,
            overview:   item.overview ?? null,
        }))

        return NextResponse.json(results)
    } catch {
        return new NextResponse("Search failed", { status: 500 })
    }
}
