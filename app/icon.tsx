import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
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
                    borderRadius: "7px",
                }}
            >
                <span
                    style={{
                        color: "white",
                        fontSize: 20,
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
