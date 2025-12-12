"use client"

import { DashboardGrid } from "@/components/dashboard/DashboardGrid";

export default function DashboardPage() {
    return (
        <div className="fixed top-16 inset-x-0 bottom-0 overflow-hidden z-0">
            <DashboardGrid />
        </div>
    );
}
