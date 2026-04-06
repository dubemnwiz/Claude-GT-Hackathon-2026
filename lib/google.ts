import { google } from "googleapis"
import { prisma } from "@/lib/prisma"

/**
 * Returns an authenticated Google OAuth2 client for the given userId,
 * reading tokens from the Account table and auto-persisting refreshed tokens.
 * Returns null if the user has not connected their Google account.
 */
export async function getGoogleOAuthClient(userId: string) {
    const account = await prisma.account.findFirst({
        where: { userId, provider: "google" },
    })

    if (!account?.access_token) return null

    const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
    )

    oauth2.setCredentials({
        access_token:  account.access_token,
        refresh_token: account.refresh_token ?? undefined,
        expiry_date:   account.expires_at ? account.expires_at * 1000 : undefined,
    })

    // When the library auto-refreshes, persist the new token back to the DB
    oauth2.on("tokens", async (tokens) => {
        const data: Record<string, unknown> = {}
        if (tokens.access_token)  data.access_token  = tokens.access_token
        if (tokens.refresh_token) data.refresh_token = tokens.refresh_token
        if (tokens.expiry_date)   data.expires_at    = Math.floor(tokens.expiry_date / 1000)
        if (Object.keys(data).length) {
            await prisma.account.update({ where: { id: account.id }, data }).catch(() => {})
        }
    })

    return oauth2
}
