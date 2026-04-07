import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const items = await prisma.mediaItem.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(items)
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { title, type, status, rating, notes, posterUrl, externalId, year, author } = await req.json()
    if (!title || !type) return new NextResponse("Missing fields", { status: 400 })

    // Auto-assign rank if created directly as DONE
    let rank: number | null = null
    if (status === "DONE") {
        const maxRankItem = await prisma.mediaItem.findFirst({
            where: { userId: session.user.id, status: "DONE", type, rank: { not: null } },
            orderBy: { rank: "desc" },
            select: { rank: true },
        })
        rank = (maxRankItem?.rank ?? 0) + 1000
    }

    const item = await prisma.mediaItem.create({
        data: {
            title,
            type,
            status:     status     ?? "WANT_TO",
            rating:     rating     ?? null,
            notes:      notes      ?? null,
            posterUrl:  posterUrl  ?? null,
            externalId: externalId ?? null,
            year:       year       ?? null,
            author:     author     ?? null,
            rank,
            userId:     session.user.id,
        },
    })
    return NextResponse.json(item)
}

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { id, ...updates } = await req.json()
    if (!id) return new NextResponse("Missing id", { status: 400 })

    // Auto-assign rank when status changes to DONE for the first time
    if (updates.status === "DONE") {
        const current = await prisma.mediaItem.findFirst({
            where: { id, userId: session.user.id },
            select: { rank: true, type: true },
        })
        if (current && current.rank === null) {
            const maxRankItem = await prisma.mediaItem.findFirst({
                where: { userId: session.user.id, status: "DONE", type: current.type, rank: { not: null } },
                orderBy: { rank: "desc" },
                select: { rank: true },
            })
            updates.rank = (maxRankItem?.rank ?? 0) + 1000
        }
    }

    await prisma.mediaItem.updateMany({
        where: { id, userId: session.user.id },
        data: updates,
    })

    // Return the updated record so callers can sync auto-assigned fields (e.g. rank)
    const updated = await prisma.mediaItem.findFirst({
        where: { id, userId: session.user.id },
    })
    return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    if (!id) return new NextResponse("Missing id", { status: 400 })

    await prisma.mediaItem.deleteMany({
        where: { id, userId: session.user.id },
    })
    return new NextResponse(null, { status: 204 })
}
