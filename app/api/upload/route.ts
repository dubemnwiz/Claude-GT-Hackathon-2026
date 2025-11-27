import { NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    if (!session) return new NextResponse("Unauthorized", { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File
    const caption = formData.get("caption") as string

    if (!file) {
        return new NextResponse("No file uploaded", { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = Date.now() + "_" + file.name.replaceAll(" ", "_")

    // Save to public/uploads
    const uploadDir = path.join(process.cwd(), "public/uploads")
    // Ensure dir exists (might need mkdir)
    // For now assuming public exists, uploads might not
    try {
        await writeFile(path.join(uploadDir, filename), buffer)
    } catch (e) {
        // Try creating dir
        const fs = require('fs')
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
            await writeFile(path.join(uploadDir, filename), buffer)
        }
    }

    try {
        const photo = await prisma.progressPhoto.create({
            data: {
                userId: session.user.id,
                url: `/uploads/${filename}`,
                caption,
                date: new Date(),
            },
        })
        return NextResponse.json(photo)
    } catch (error) {
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
