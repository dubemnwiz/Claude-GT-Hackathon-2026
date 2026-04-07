# Fitness Tracker Roadmap 🚀

This document tracks the pending enhancements and bug fixes for the Fitness Tracker application.

## 🛠 Pending Fixes & Enhancements

### 1. Smart UI Unification
- **Goal**: Merge "Log Workout" and "Track Sets" into a single, cohesive form.
- **Logic**: 
    - Auto-expand the "Exercises & Sets" section if a **Strength** workout is detected.
    - Show only **Duration (mins)** if a **Cardio** activity is detected.
- **Micro-interactions**: Single "Finish & Log" button at the bottom of the card.

### 2. Cardio Duration Tracking
- **Goal**: Track endurance metrics alongside strength.
- **Tasks**:
    - Update `prisma/schema.prisma` to add `duration Int?` to the `WorkoutLog` model.
    - Update `/api/fitness/workout` API to handle the duration field.
    - Add "Cardio Trends" (Total minutes per week) to the Insights drawer.

### 3. Plate Calculator Refinement
- **Goal**: Show barbell-specific info only for relevant exercises.
- **Logic**: Use keywords (Squat, Bench, Deadlift, Press, Row) to determine if a "Plate Map" is shown.
- **Clean UI**: For isolation moves (Curls), show the total weight breakdown without the bar weight context.

### 4. Insights Debugging
- **Date Handling**: Update `FitnessAnalytics.tsx` to handle timezone offsets by normalizing dates to local midnight before comparison.
- **Heat Map Visibility**: Bump up the base opacity of the muscle map paths so even low-frequency workouts are clearly visible.

## 🧠 Brainstormed Ideas
- **AI Muscle Heatmap**: Already implemented, but could be expanded to show multi-colored "soreness levels."
- **Ghost Mode**: Compare today's intensity against your previous best session in real-time.
- **Rest Timer Sound**: Add custom notification sounds for timer completion.

---

*Last Updated: 2026-04-07*
