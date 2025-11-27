"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Upload } from "lucide-react"

interface Photo {
    id: string
    url: string
    caption: string | null
    date: string
}

export function ProgressGallery() {
    const [photos, setPhotos] = useState<Photo[]>([])
    const [uploading, setUploading] = useState(false)
    const [caption, setCaption] = useState("")

    const fetchPhotos = async () => {
        try {
            const res = await fetch("/api/upload")
            if (res.ok) setPhotos(await res.json())
        } catch (error) {
            console.error("Failed to fetch photos", error)
        }
    }

    useEffect(() => {
        fetchPhotos()
    }, [])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return
        setUploading(true)

        const formData = new FormData()
        formData.append("file", e.target.files[0])
        formData.append("caption", caption)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })
            if (res.ok) {
                setCaption("")
                fetchPhotos()
            }
        } catch (error) {
            console.error("Failed to upload", error)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-4 items-center">
                <Input
                    placeholder="Caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="max-w-xs"
                />
                <div className="relative">
                    <Input
                        type="file"
                        className="hidden"
                        id="photo-upload"
                        onChange={handleUpload}
                        accept="image/*"
                        disabled={uploading}
                    />
                    <Button asChild disabled={uploading}>
                        <label htmlFor="photo-upload" className="cursor-pointer">
                            <Upload className="mr-2 h-4 w-4" />
                            {uploading ? "Uploading..." : "Upload Photo"}
                        </label>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                    <Card key={photo.id} className="overflow-hidden">
                        <div className="aspect-square relative">
                            <img
                                src={photo.url}
                                alt={photo.caption || "Progress photo"}
                                className="object-cover w-full h-full"
                            />
                        </div>
                        {photo.caption && (
                            <CardContent className="p-2">
                                <p className="text-xs text-muted-foreground truncate">{photo.caption}</p>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    )
}
