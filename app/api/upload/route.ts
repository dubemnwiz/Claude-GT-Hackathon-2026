import { NextResponse } from "next/server"
import { put, del } from "@vercel/blob"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File
    const caption = formData.get("caption") as string || ""

    if (!file) {
        return new NextResponse("No file uploaded", { status: 400 })
    }

    try {
        // Upload to Vercel Blob
        const blob = await put(file.name, file, {
            access: 'public',
        })

        // Save metadata to DB
        const photo = await prisma.progressPhoto.create({
            data: {
                userId: session.user.id,
                url: blob.url,
                caption,
                date: new Date(),
            },
        })
        return NextResponse.json(photo)
    } catch (error) {
        console.error("Upload failed:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    try {
        const photos = await prisma.progressPhoto.findMany({
            where: { userId: session.user.id },
            orderBy: { date: 'desc' },
        })
        return NextResponse.json(photos)
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
        const photo = await prisma.progressPhoto.findUnique({
            where: { id, userId: session.user.id }
        })

        if (!photo) return new NextResponse("Not found", { status: 404 })

        // Delete from Vercel Blob
        if (photo.url.startsWith("http")) {
            try {
                await del(photo.url)
            } catch (e) {
                console.error("Failed to delete blob", e)
            }
        }

        // Delete from DB
        await prisma.progressPhoto.delete({
            where: { id }
        })

        return new NextResponse("Deleted", { status: 200 })
    } catch (error) {
        console.error("Delete failed:", error)
        return new NextResponse("Internal Error", { status: 500 })
    }
}
