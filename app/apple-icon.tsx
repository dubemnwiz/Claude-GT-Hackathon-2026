import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "40px",
                }}
            >
                <span
                    style={{
                        color: "white",
                        fontSize: 110,
                        fontWeight: 800,
                        letterSpacing: "-0.05em",
                        fontFamily: "system-ui, sans-serif",
                    }}
                >
                    M
                </span>
            </div>
        ),
        { ...size }
    )
}
