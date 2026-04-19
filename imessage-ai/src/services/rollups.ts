import { prisma } from "../lib/prisma.js";

export async function updateDailyRollup(userId: string) {
  const dayDate = startOfDay(new Date());

  const [mealEvents, workoutEvents] = await Promise.all([
    prisma.mealEvent.findMany({
      where: {
        userId,
        loggingState: "AUTO_LOGGED",
        mealTime: { gte: dayDate },
      },
      include: { mealItems: true },
    }),
    prisma.workoutEvent.findMany({
      where: {
        userId,
        workoutDate: { gte: dayDate },
      },
    }),
  ]);

  const totals = mealEvents.reduce(
    (acc, event) => {
      acc.mealsLogged += 1;
      for (const item of event.mealItems) {
        acc.calories += item.calories ?? 0;
        acc.proteinG += item.proteinG ?? 0;
        acc.carbsG += item.carbsG ?? 0;
        acc.fatG += item.fatG ?? 0;
        acc.fiberG += item.fiberG ?? 0;
      }
      return acc;
    },
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, mealsLogged: 0 },
  );

  const caloriesBurned = workoutEvents.reduce(
    (sum, w) => sum + (w.caloriesBurned ?? 0),
    0,
  );

  const data = {
    ...totals,
    caloriesBurned,
    workoutsLogged: workoutEvents.length,
  };

  await prisma.dailyRollup.upsert({
    where: { userId_dayDate: { userId, dayDate } },
    update: data,
    create: { userId, dayDate, ...data },
  });
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
