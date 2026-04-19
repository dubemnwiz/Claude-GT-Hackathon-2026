"use client"

import { motion } from "framer-motion"
import { getDayOfYear } from "date-fns"

const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
    { text: "Great things never come from comfort zones.", author: "Unknown" },
    { text: "Dream it. Wish it. Do it.", author: "Unknown" },
    { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
    { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
    { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
    { text: "Do something today that your future self will thank you for.", author: "Sean Patrick Flanery" },
    { text: "Little things make big days.", author: "Unknown" },
    { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
    { text: "Don't wait for opportunity. Create it.", author: "Unknown" },
    { text: "Sometimes we're tested not to show our weaknesses, but to discover our strengths.", author: "Unknown" },
    { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
    { text: "Dream bigger. Do bigger.", author: "Unknown" },
    { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
    { text: "Act as if what you do makes a difference. It does.", author: "William James" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "What you get by achieving your goals is not as important as what you become.", author: "Henry David Thoreau" },
    { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
    { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
    { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
    { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
    { text: "The mind is everything. What you think you become.", author: "Buddha" },
    { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
    { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "An unexamined life is not worth living.", author: "Socrates" },
    { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
    { text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" },
    { text: "Always remember that you are absolutely unique. Just like everyone else.", author: "Margaret Mead" },
    { text: "Don't judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
    { text: "Do not go where the path may lead; instead, go where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
]

export function DailyQuote() {
    const dayIndex = getDayOfYear(new Date()) % QUOTES.length
    const quote = QUOTES[dayIndex]

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="relative overflow-hidden rounded-2xl px-6 py-4 border border-border bg-card"
        >
            {/* Decorative quote mark */}
            <span
                className="absolute -top-4 left-4 text-8xl font-serif leading-none text-muted/60 select-none pointer-events-none"
                aria-hidden
            >
                &ldquo;
            </span>
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <p className="text-sm md:text-base italic text-foreground leading-relaxed flex-1">
                    &ldquo;{quote.text}&rdquo;
                </p>
                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    — {quote.author}
                </span>
            </div>
        </motion.div>
    )
}
