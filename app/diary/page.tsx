"use client"

import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";

export default function DiaryPage() {
    const router = useRouter();
    const [date, setDate] = useState<Date | null>(new Date());

    const onDateChange = (newDate: any) => {
        setDate(newDate);
        if (newDate) {
            const formattedDate = format(newDate, 'yyyy-MM-dd');
            router.push(`/diary/${formattedDate}`);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Diary</h2>
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
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
