import { DiaryEditor } from "@/components/diary/DiaryEditor";
import { format } from "date-fns";

export default async function DiaryEntryPage({ params }: { params: Promise<{ date: string }> }) {
    const { date } = await params;
    const dateObj = new Date(date);
    const formattedDate = format(dateObj, 'EEEE, MMMM do, yyyy');

    return (
        <div className="p-8 space-y-8 h-full">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">{formattedDate}</h2>
            </div>
            <DiaryEditor date={date} />
        </div>
    );
}
