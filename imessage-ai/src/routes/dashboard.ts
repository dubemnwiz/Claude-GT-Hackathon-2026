import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function registerDashboardRoutes(app: FastifyInstance) {
  app.get("/dashboard/:phone", async (request, reply) => {
    const { phone } = request.params as { phone: string };

    const user = await prisma.user.findUnique({
      where: { phoneE164: phone },
      include: {
        profile: true,
        goals: {
          where: { active: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    const today = startOfDay(new Date());

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);

    const [todayRollup, weekRollups, todayMeals, recentWorkouts] = await Promise.all([
      prisma.dailyRollup.findUnique({
        where: {
          userId_dayDate: {
            userId: user.id,
            dayDate: today,
          },
        },
      }),
      prisma.dailyRollup.findMany({
        where: {
          userId: user.id,
          dayDate: { gte: sevenDaysAgo },
        },
        orderBy: { dayDate: "asc" },
      }),
      prisma.mealEvent.findMany({
        where: {
          userId: user.id,
          loggingState: { in: ["AUTO_LOGGED", "CONFIRMED"] },
          mealTime: { gte: today },
        },
        include: { mealItems: true },
        orderBy: { mealTime: "desc" },
      }),
      prisma.workoutEvent.findMany({
        where: {
          userId: user.id,
          workoutDate: { gte: sevenDaysAgo },
        },
        orderBy: { workoutDate: "desc" },
        take: 20,
      }),
    ]);

    const goal = user.goals[0] ?? null;
    const profile = user.profile ?? null;

    return reply.send({
      userId: user.id,
      profile: profile
        ? {
            firstName: profile.firstName,
            sex: profile.sex,
            heightCm: profile.heightCm,
            currentWeightKg: profile.currentWeightKg,
            startWeightKg: profile.startWeightKg,
            activityLevel: profile.activityLevel,
            exerciseDaysPerWeek: profile.exerciseDaysPerWeek,
            dietaryPreferences: profile.dietaryPreferences,
            allergies: profile.allergies,
          }
        : null,
      goal: goal
        ? {
            goalType: goal.goalType,
            targetCalories: goal.targetCalories,
            targetProteinG: goal.targetProteinG,
            targetCarbsG: goal.targetCarbsG,
            targetFatG: goal.targetFatG,
            targetWeightKg: goal.targetWeightKg,
          }
        : null,
      todayRollup: todayRollup
        ? {
            calories: Math.round(todayRollup.calories),
            proteinG: Math.round(todayRollup.proteinG),
            carbsG: Math.round(todayRollup.carbsG),
            fatG: Math.round(todayRollup.fatG),
            fiberG: Math.round(todayRollup.fiberG),
            mealsLogged: todayRollup.mealsLogged,
            caloriesBurned: Math.round(todayRollup.caloriesBurned ?? 0),
            workoutsLogged: todayRollup.workoutsLogged ?? 0,
          }
        : null,
      weekRollups: weekRollups.map((r) => ({
        dayDate: r.dayDate.toISOString().split("T")[0],
        calories: Math.round(r.calories),
        proteinG: Math.round(r.proteinG),
        carbsG: Math.round(r.carbsG),
        fatG: Math.round(r.fatG),
        mealsLogged: r.mealsLogged,
      })),
      recentWorkouts: recentWorkouts.map((w) => ({
        id: w.id,
        workoutLabel: w.workoutLabel,
        muscleGroups: w.muscleGroups,
        exercises: w.exercises,
        durationMin: w.durationMin,
        caloriesBurned: w.caloriesBurned,
        workoutDate: w.workoutDate.toISOString(),
      })),
      todayMeals: todayMeals.map((meal) => ({
        id: meal.id,
        mealTime: meal.mealTime?.toISOString() ?? null,
        loggingState: meal.loggingState,
        items: meal.mealItems.map((item) => ({
          name: item.nameCanonical ?? item.nameRaw,
          calories: item.calories ? Math.round(item.calories) : null,
          proteinG: item.proteinG ? Math.round(item.proteinG) : null,
          carbsG: item.carbsG ? Math.round(item.carbsG) : null,
          fatG: item.fatG ? Math.round(item.fatG) : null,
        })),
        totalCalories: meal.mealItems.reduce((s, i) => s + (i.calories ?? 0), 0),
        totalProteinG: meal.mealItems.reduce((s, i) => s + (i.proteinG ?? 0), 0),
      })),
    });
  });
}
