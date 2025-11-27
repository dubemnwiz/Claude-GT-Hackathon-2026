"use client"

import { WeightTracker } from "@/components/fitness/WeightTracker";
import { ProgressGallery } from "@/components/fitness/ProgressGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FitnessPage() {
    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Fitness Tracker</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Weight Tracker</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <WeightTracker />
                    </CardContent>
                </Card>

                {/* Placeholder for Progress Photos */}
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Progress Pictures</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProgressGallery />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
