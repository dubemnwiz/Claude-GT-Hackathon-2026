import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Meridian",
        short_name: "Meridian",
        description: "Your personal life OS — journal, fitness, planning, and more.",
        start_url: "/",
        display: "standalone",
        background_color: "#0b0f1a",
        theme_color: "#7c3aed",
        orientation: "portrait",
        icons: [
            {
                src: "/apple-icon",
                sizes: "180x180",
                type: "image/png",
            },
            {
                src: "/apple-icon",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/apple-icon",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    }
}
