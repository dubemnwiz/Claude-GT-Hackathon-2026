# Meridian

This repo was built for a **nutrition-focused hackathon prompt**. The idea is a small personal hub that ties together eating well, staying accountable, and seeing your progress in one place—without pretending to be a full clinical product.

**Meridian** is a web app with three main ideas:

- **Home** — A signed-in landing surface: time, weather, a daily line of focus, motivational copy, and personal countdowns. It’s meant to feel like a calm dashboard, not another tracker grid.

- **Field Coach** — A companion view for an agentic coach that ingests what you eat and how you train (by iMessage), resolves foods into macros, rolls daily totals, and surfaces workouts with a muscle map so you can see load across muscle groups—not just numbers on a log.

- **NutriMap** — A map-centered experience for discovering places to eat when you’re out: natural-language search, ranked results with a health-oriented lens, and restaurants plotted so “what’s good near me?” is answered visually as well as in text.

Behind the main UI there is a **Next.js** app with authentication and a database for the hub. The coach and the map each lean on separate services: a Node backend for messaging, nutrition resolution, and rollups, and a Python API that powers place search and scoring for NutriMap. Together they sketch an answer to the prompt: **health and wellness with minimal friction**
