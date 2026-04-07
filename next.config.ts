import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  turbopack: {
    root: "./",
  },
  images: {
    remotePatterns: [
      // TMDB posters
      { protocol: "https", hostname: "image.tmdb.org" },
      // Google Books thumbnails
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      // Open Library covers
      { protocol: "https", hostname: "covers.openlibrary.org" },
    ],
  },
};

export default withSerwist(nextConfig);
