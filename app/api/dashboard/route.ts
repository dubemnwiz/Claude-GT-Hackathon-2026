import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const notes = await prisma.noteBlock.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(notes)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { content, type } = body

        const note = await prisma.noteBlock.create({
            data: {
                userId: session.user.id,
                content,
                type,
            },
        })
        return NextResponse.json(note)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { id, content } = body

        const note = await prisma.noteBlock.update({
            where: { id, userId: session.user.id }, // Ensure user owns note
            data: { content },
        })
        return NextResponse.json(note)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) return new NextResponse("ID required", { status: 400 })

    try {
        await prisma.noteBlock.delete({
            where: { id, userId: session.user.id },
        })
        return new NextResponse("Deleted", { status: 200 })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
