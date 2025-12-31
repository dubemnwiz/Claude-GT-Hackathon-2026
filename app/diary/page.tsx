"use client"

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";

export default function DiaryPage() {
    const router = useRouter();
    const [date, setDate] = useState<Date | null>(new Date());
    const [filledDates, setFilledDates] = useState<Record<string, string | null>>({});

    useEffect(() => {
        const fetchFilledDates = async () => {
            try {
                const res = await fetch('/api/diary');
                if (res.ok) {
                    const data: { date: string, rating: string | null }[] = await res.json();
                    const datesMap: Record<string, string | null> = {};
                    data.forEach(item => {
                        datesMap[item.date] = item.rating;
                    });
                    setFilledDates(datesMap);
                }
            } catch (error) {
                console.error("Failed to fetch filled dates", error);
            }
        };
        fetchFilledDates();
    }, []);

    type ValuePiece = Date | null;
    type Value = ValuePiece | [ValuePiece, ValuePiece];

    const onDateChange = (newDate: Value) => {
        if (newDate instanceof Date) {
            setDate(newDate);
            const formattedDate = format(newDate, 'yyyy-MM-dd');
            router.push(`/diary/${formattedDate}`);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Journal</h2>
            </div>

            <div className="flex justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <CardTitle>Select a Date</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => onDateChange(new Date())}>
                            Today
                        </Button>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Calendar
                            onChange={onDateChange}
                            value={date}
                            className="rounded-md border p-4"
                            tileClassName={({ date, view }) => {
                                if (view === 'month') {
                                    const tileDate = format(date, 'yyyy-MM-dd');
                                    if (Object.keys(filledDates).includes(tileDate)) {
                                        const rating = filledDates[tileDate];
                                        let colorClass = 'bg-blue-100/80 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';

                                        if (rating === "GOOD") {
                                            colorClass = 'bg-green-200 dark:bg-green-900/50 border-green-300 dark:border-green-800 text-green-800 dark:text-green-300';
                                        } else if (rating === "MID") {
                                            colorClass = 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-300 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300';
                                        } else if (rating === "BAD") {
                                            colorClass = 'bg-red-200 dark:bg-red-900/50 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300';
                                        }

                                        return `font-extrabold rounded-lg shadow-sm border ${colorClass}`;
                                    }
                                }
                                return null;
                            }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
