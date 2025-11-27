"use client"

import { KanbanBoard } from "@/components/planning/KanbanBoard";

export default function PlanningPage() {
    return (
        <div className="p-8 space-y-8 h-full">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Weekly Planning</h2>
            </div>
            <KanbanBoard />
        </div>
    );
}
