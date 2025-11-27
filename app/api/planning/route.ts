import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const tasks = await prisma.task.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
        })
        return NextResponse.json(tasks)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { content, status, day } = body

        const task = await prisma.task.create({
            data: {
                content,
                status: status || "NOT_STARTED",
                day: day || "Monday",
                userId: session.user.id,
            },
        })
        return NextResponse.json(task)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function PUT(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const body = await req.json()
        const { id, status, day } = body

        const task = await prisma.task.update({
            where: { id, userId: session.user.id },
            data: {
                ...(status && { status }),
                ...(day && { day })
            },
        })
        return NextResponse.json(task)
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")
    const all = searchParams.get("all")

    try {
        if (all === "true") {
            await prisma.task.deleteMany({
                where: { userId: session.user.id },
            })
        } else if (id) {
            await prisma.task.delete({
                where: { id, userId: session.user.id },
            })
        } else {
            return new NextResponse("ID or all flag required", { status: 400 })
        }
        return new NextResponse("Deleted", { status: 200 })
    } catch (error) {
        return new NextResponse("Internal Error", { status: 500 })
    }
}
