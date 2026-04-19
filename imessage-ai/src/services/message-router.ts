import { prisma } from "../lib/prisma.js";
import { buildDailyProgressReply } from "./coaching.js";
import { getContextCoachAdvice } from "./context-coach.js";
import { maybeHandleCorrection } from "./corrections.js";
import { maybeHandleDeletion } from "./deletions.js";
import { getOnboardingState, handleOnboardingReply } from "./onboarding.js";
import { maybeHandleRecall } from "./recall.js";
import { ingestMealMessage } from "./meal-ingest.js";
import { ingestWorkoutMessage } from "./workout-ingest.js";
import { fridgeScanFromMessage } from "./fridge-scan.js";

type HandleInboundMessageInput = {
  userId: string;
  threadId: string;
  messageId: string;
  text: string;
  mediaCount: number;
};

export async function handleInboundMessage(input: HandleInboundMessageInput) {
  const onboarding = await getOnboardingState(input.userId);

  if (!onboarding.isComplete) {
    const normalized = input.text.trim().toLowerCase();
    const isGreetingOnly =
      normalized === "" ||
      normalized === "hi" ||
      normalized === "hello" ||
      normalized === "hey" ||
      normalized === "start" ||
      normalized === "yo";

    if (!onboarding.hasAnswers && onboarding.nextQuestion && isGreetingOnly) {
      return {
        replyText: `hey, i’m sam! i’ll help you track meals, stay on target, and make this feel easy. first up: ${onboarding.nextQuestion}`,
      };
    }

    return handleOnboardingReply(input.userId, input.text);
  }

  const normalized = input.text.trim().toLowerCase();

  if (normalized.includes("how am i doing") || normalized.includes("progress")) {
    const replyText = await buildDailyProgressReply(input.userId);
    return { replyText };
  }

  // Fridge / menu scan — must run before text-only context coach: phrases like
  // "what should i make" match isContextQuery, but vision lives here only.
  const isFridgeScanIntent =
    input.mediaCount > 0 &&
    (normalized === "" ||
      /what (should|can) i (eat|make|have|cook|order)|what('?s| is) (good|healthy|available|on (the )?menu)|what do you (see|suggest|recommend)|scan|fridge|menu|what'?s in (my|the)|make from (this|what)|what (to|can i) order|suggest (something|a meal)|what looks good/i.test(
        normalized,
      ));

  if (isFridgeScanIntent) {
    const scan = await fridgeScanFromMessage({
      userId: input.userId,
      messageId: input.messageId,
      text: input.text,
    });
    if (scan.handled) return { replyText: scan.replyText };
    // Image was sent but assets aren't stored yet — prompt them to describe instead
    if (input.mediaCount > 0) {
      return {
        replyText:
          "got the photo! describe what you're working with and i'll suggest something — fridge contents, a menu, whatever you've got.",
      };
    }
  }

  const isContextQuery = /what should i|what'?s good|what can i (eat|get|order)|i'?m at |i am at |at the (airport|hotel|gas station|drive|terminal|lounge|rest stop)|at [a-z]+ (airport|hotel|diner|cafe|restaurant|station|bar)|what do you recommend/i.test(normalized);
  if (isContextQuery) {
    const replyText = await getContextCoachAdvice(input.userId, input.text);
    return { replyText };
  }

  // Workout intent — catch before meal ingest (include ab/core + timed sessions)
  const isWorkoutMessage =
    /\b(push\s*day|pull\s*day|leg\s*day|chest\s*day|back\s*day|arm\s*day|hit\s+(the\s+)?(gym|weights|bench|squats?|legs?|chest|back|shoulders?|arms?)|just\s+(worked?\s*out|trained|lifted|ran|jogged|went\s+for\s+a\s+run)|(\d+(?:\.\d+)?)\s*(?:mile|mi|km)\s*run|went\s+for\s+a\s+(\d+|three|four|five|six|two|one)[\s-]*(mile|mi|km)?[\s-]*run|finished\s+(my\s+)?(workout|session|training|cardio|run|lift)|morning\s+run|evening\s+run)\b/i.test(
      normalized,
    ) ||
    /\b(ab|abs|core)\s+(workout|circuit|routine)\b/i.test(normalized) ||
    /\b\d+\s*(?:min|minutes?)\s+(?:of\s+)?(?:ab|abs|core)(?:\s+workout)?\b/i.test(normalized) ||
    (/\b(?:did|done|crushed|finished)\s+(?:a\s+)?\d+\s*(?:min|minutes?)\s+/i.test(normalized) &&
      /\b(ab|abs|core|pilates|yoga|hiit|cardio|stretch)\b/i.test(normalized));

  if (isWorkoutMessage) {
    const workout = await ingestWorkoutMessage({ userId: input.userId, text: input.text });
    if (workout.handled) {
      return { replyText: workout.replyText! };
    }
  }

  const deletion = await maybeHandleDeletion({
    userId: input.userId,
    text: input.text,
  });

  if (deletion?.handled) {
    return {
      replyText: deletion.replyText,
    };
  }

  const recall = await maybeHandleRecall({
    userId: input.userId,
    text: input.text,
  });

  if (recall?.handled) {
    return {
      replyText: recall.replyText,
    };
  }

  const correction = await maybeHandleCorrection({
    userId: input.userId,
    messageId: input.messageId,
    text: input.text,
  });

  if (correction?.handled) {
    return {
      replyText: correction.replyText,
    };
  }

  const meal = await ingestMealMessage({
    userId: input.userId,
    messageId: input.messageId,
    text: input.text,
    mediaCount: input.mediaCount,
  });

  if (meal.needsClarification) {
    await prisma.clarification.create({
      data: {
        mealEventId: meal.mealEventId,
        question: meal.replyText,
      },
    });
  }

  return {
    replyText: meal.replyText,
  };
}
