"use client"

import { DashboardGrid } from "@/components/dashboard/DashboardGrid";

export default function DashboardPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Mind Dump</h2>
            </div>
            <DashboardGrid />
        </div>
    );
}
