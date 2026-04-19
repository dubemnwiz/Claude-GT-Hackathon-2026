import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Meridian",
        short_name: "Meridian",
        description: "Your personal life OS — NutriMap, Field Coach, and more.",
        start_url: "/",
        display: "standalone",
        background_color: "#0b0f1a",
        theme_color: "#7c3aed",
        orientation: "portrait",
        icons: [
            {
                src: "/icon",
                sizes: "32x32",
                type: "image/png",
            },
            {
                src: "/icon",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/icon",
                sizes: "512x512",
                type: "image/png",
            },
            {
                src: "/apple-icon",
                sizes: "180x180",
                type: "image/png",
            },
        ],
        shortcuts: [
            {
                name: "Field Coach",
                short_name: "Coach",
                description: "Open Field Coach",
                url: "/correspondent",
                icons: [{ src: "/apple-icon", sizes: "192x192" }],
            },
            {
                name: "NutriMap",
                short_name: "Map",
                description: "Search places and nutrition",
                url: "/nutrimap",
                icons: [{ src: "/apple-icon", sizes: "192x192" }],
            },
        ]
    }
}
