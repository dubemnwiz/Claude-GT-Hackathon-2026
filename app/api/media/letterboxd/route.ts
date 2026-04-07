import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { fetchLetterboxdWatchlist, enrichWithTMDB } from "@/lib/media/letterboxd"

// Cap imports at 100 to avoid very long response times
const IMPORT_LIMIT = 100

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { username } = await req.json()
    if (!username?.trim()) {
        return new NextResponse("Username required", { status: 400 })
    }

    try {
        // 1. Fetch + parse Letterboxd RSS
        const films = await fetchLetterboxdWatchlist(username)
        const capped = films.slice(0, IMPORT_LIMIT)

        // 2. Cross-reference with TMDB
        const enriched = await enrichWithTMDB(capped)

        // 3. Find which externalIds already exist for this user (skip duplicates)
        const externalIds = enriched.map(f => f.externalId).filter(Boolean) as string[]
        const existing    = await prisma.mediaItem.findMany({
            where: { userId: session.user.id, externalId: { in: externalIds } },
            select: { externalId: true },
        })
        const existingSet = new Set(existing.map(e => e.externalId))

        // 4. Bulk-insert new items
        const toInsert = enriched.filter(
            f => !f.externalId || !existingSet.has(f.externalId)
        )

        if (toInsert.length > 0) {
            await prisma.mediaItem.createMany({
                data: toInsert.map(f => ({
                    title:      f.title,
                    type:       "MOVIE",
                    status:     "WANT_TO",
                    posterUrl:  f.posterUrl  ?? null,
                    externalId: f.externalId ?? null,
                    year:       f.year       ?? null,
                    userId:     session.user.id,
                })),
            })
        }

        return NextResponse.json({
            imported:  toInsert.length,
            skipped:   enriched.length - toInsert.length,
            total:     films.length,          // total in watchlist (before cap)
            capped:    films.length > IMPORT_LIMIT,
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Import failed"
        return new NextResponse(message, { status: 422 })
    }
}
