import { withAuth } from "next-auth/middleware"

export default withAuth({
    pages: {
        signIn: "/login",
    },
})

export const config = {
    matcher: [
        "/diary/:path*",
        "/fitness/:path*",
        "/dashboard/:path*",
        "/planning/:path*",
        "/", // Protect home page too? Probably yes as it has widgets
    ]
}
