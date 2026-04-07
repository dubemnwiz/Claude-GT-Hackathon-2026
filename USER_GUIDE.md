# Meridian — User Guide

Meridian is a personal life OS: a single app where you track your health, plan your week, journal your thoughts, and capture ideas — all in one place. It's designed to work as a PWA (add to your iPhone home screen for the best experience).

---

## Getting Started

### Add to iPhone Home Screen
1. Open the app in Safari
2. Tap the **Share** button (box with arrow)
3. Tap **"Add to Home Screen"**
4. Tap **Add**

The app will behave like a native app — full screen, no browser chrome, native feel.

### Account
- **Sign up** with email + password, or sign in with Google
- All your data is private and tied to your account
- To log out, tap the **+** button in the dock and scroll to the bottom

---

## The Dock (Bottom Navigation)

The floating dock at the bottom has six main pages, a **+** quick-action button in the center, and — on desktop — a theme toggle and logout.

| Icon | Page |
|---|---|
| 🏠 Home | Dashboard overview |
| 📖 Journal | Daily diary entries |
| 🏋️ Fitness | Weight + workout tracking |
| 🧠 Mind Dump | Quick notes and idea capture |
| 📅 Planning | Weekly task board |
| 🎬 Media | Books, movies, and TV tracker |

Tap **+** to open Quick Actions: jump straight to a diary entry, start a workout, log weight, or jot a mind dump — without navigating away.

---

## Home

Your daily command center. Shows:
- **Greeting + Clock** — time-aware greeting with your name
- **Weather** — current conditions (auto-detected location)
- **Daily Quote** — a rotating motivational quote
- **Weekly Recap** — last week's stats: tasks completed, workouts, journal entries, weight change
- **Quick Actions** — 4 shortcut tiles to common actions
- **Recent Activity** — a live feed of your latest workouts, weight logs, and completed tasks
- **Focus Widget** — today's tasks from your planning board
- **Google Calendar** — upcoming events (requires Google sign-in)
- **Countdowns** — custom countdown timers to important dates

---

## Journal (`/diary`)

Write and review daily diary entries.

- Tap **Write Today** (top right) to open today's entry
- **Rate your day**: choose Good 😊 / Okay 😐 / Rough 😞 — this feeds your monthly stats and weekly recap
- Entries **auto-save** as you type (1.2s debounce) — no Save button needed
- The **calendar** lets you jump to any past date
- Filter entries by mood rating using the pill buttons
- Search entries by content or date

**Streak counter** tracks how many consecutive days you've written.

---

## Fitness (`/fitness`)

Three tabs: **Weight**, **Workouts**, **PRs**.

### Weight Tab
- Log your body weight in lbs
- A line chart tracks progress over time
- Delete individual entries with the ✕ button

### Workouts Tab
Type what you did (e.g. "Bench Press", "10km Run", "Basketball") and Meridian auto-detects whether it's **strength** or **cardio**.

**Strength exercises:**
- Add exercises (auto-filled from the workout name if it matches)
- Log sets with weight (lbs) and reps
- Mark a set as a PR 🏆 — confetti fires automatically when you beat a previous best
- The plate calculator (45) shows you which plates to load for a given barbell weight
- A ghost row shows your last session's numbers for comparison
- Log for **past dates** using the day navigator (< >) at the top
- Rest timer: tap the timer icon between sets

**Cardio activities:**
- Log duration (minutes)
- Optional notes
- Works for any sport or cardio type

**Day navigator:** Use < > arrows to browse days. Tap any dot in the week strip to jump to that day. An amber badge shows when you're logging to a past date.

### PRs Tab
Auto-populated from your workout logs. Shows your all-time best set for every exercise: highest weight × reps, plus estimated 1-rep max (Brzycki formula).

### Insights (top right ✦ button)
A slide-out analytics panel showing:
- Weight trend chart
- Workout frequency (this week + history)
- Volume over time per exercise
- Cardio duration trend
- Muscle heat map (highlights muscles worked in the last 2 weeks)

---

## Mind Dump (`/mind-dump`)

Rapid capture for anything on your mind.

- **Paste a URL** → auto-saved as a link card with the domain
- **Paste a YouTube URL** → embedded video card
- **Type text** → saved as an idea note (click any note to edit it inline)
- Add optional tags: Idea, Read Later, Resource, Watch Later
- Filter by type (All / Ideas / Links / Videos) and search by content
- Delete notes with the ✕ button on each card

---

## Planning (`/planning`)

Weekly task board organized by day (Mon–Sun).

### Adding tasks
1. Choose a **priority** (tap the colored pill to cycle High / Med / Low)
2. Select a **day** from the dropdown
3. Type the task and press **+**

### Managing tasks
- Tap the **status circle** to cycle: Not Started → In Progress → Completed
- On **desktop**: drag cards between columns
- On **mobile**: tap a task to expand it; use the day selector to move it
- **Roll Over**: moves all incomplete tasks from past days to today (visible when applicable)

### Google Calendar sync
- Connect Google Calendar via the banner at the top of Planning
- Tasks you add are automatically created as GCal events
- GCal events appear in each day column

### Export
Tap **Export PDF** to save your week as a PDF.

---

## Media (`/media`)

Track books, movies, and TV shows.

- Tap **+ Add** to search for a title (powered by TMDB / Open Library)
- Can't find it? Use "Add manually"
- Set status: **Want to** / **In Progress** / **Done**
- Rate with 1–5 stars ⭐
- Add personal notes
- Switch between **Grid view** and **Ranked view** (ranked view lets you drag to reorder your favorites)
- **Import from Letterboxd**: enter your Letterboxd username to bulk-import your watchlist

---

## Tips

| Tip | How |
|---|---|
| Log a workout from your phone while at the gym | Tap **+** in dock → "Start Workout" |
| Log weight quickly | Tap **+** → "Log Weight" |
| Jot a quick thought without leaving the current page | Tap **+** → "Instant Mind Dump" textarea |
| Switch theme | Tap **+** → bottom of the drawer (mobile) or use the toggle in the dock (desktop) |
| Log a workout from a past day | Go to Fitness → Workouts tab → use the day navigator arrows |
| See what muscles you've been training | Fitness → ✦ Insights → scroll to Muscle Map |
| Check your all-time PRs | Fitness → PRs tab |
| Jump to a specific diary entry | Diary → tap any day on the calendar |

---

## Keyboard Shortcuts (desktop)

| Shortcut | Action |
|---|---|
| `⌘ + ↵` | Save a Mind Dump note |
| `⌘ + ↵` | Save an inline edit in Mind Dump |

---

## Privacy

All data is stored in your private account. No data is shared with third parties. Diary entries are excluded from the activity feed to keep them private.
