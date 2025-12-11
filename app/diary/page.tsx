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
    const [filledDates, setFilledDates] = useState<string[]>([]);

    useEffect(() => {
        const fetchFilledDates = async () => {
            try {
                const res = await fetch('/api/diary');
                if (res.ok) {
                    const dates = await res.json();
                    setFilledDates(dates);
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
                                    // filledDates might be ISO strings or simpler yyyy-MM-dd, check format
                                    // The API returns Date objects usually as ISO strings
                                    if (filledDates.some(d => {
                                        try {
                                            return format(new Date(d), 'yyyy-MM-dd') === tileDate;
                                        } catch { return false; }
                                    })) {
                                        // Stronger visual cues: Bold, Color, Background
                                        return 'font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100/80 dark:bg-blue-900/50 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800';
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
