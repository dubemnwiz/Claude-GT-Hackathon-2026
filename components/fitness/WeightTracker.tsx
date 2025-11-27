"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";

export function WeightTracker() {
    const [weight, setWeight] = useState("")
    const [data, setData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState("")

    const fetchData = async () => {
        try {
            const res = await fetch("/api/fitness/weight")
            if (res.ok) {
                const logs = await res.json()
                // Format data for chart
                const chartData = logs.map((log: any) => ({
                    id: log.id,
                    date: format(new Date(log.date), 'MM/dd'),
                    weight: log.weight,
                    fullDate: log.date
                })).reverse() // Assuming API returns newest first
                setData(chartData)
            } else {
                if (res.status === 401) setError("Please login to save data")
            }
        } catch (error) {
            console.error("Failed to fetch weight logs", error)
            setError("Failed to load data")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!weight) return
        setError("")

        try {
            const res = await fetch("/api/fitness/weight", {
                method: "POST",
                body: JSON.stringify({ weight: parseFloat(weight), date: new Date() }),
                headers: { "Content-Type": "application/json" },
            })
            if (!res.ok) {
                if (res.status === 401) setError("Please login to save data")
                else setError("Failed to save")
                return
            }
            setWeight("")
            fetchData()
        } catch (error) {
            console.error("Failed to save weight", error)
            setError("Failed to save")
        }
    }

    const deleteLog = async (id: string) => {
        try {
            const res = await fetch(`/api/fitness/weight?id=${id}`, {
                method: "DELETE",
            })
            if (res.ok) {
                fetchData()
            } else {
                setError("Failed to delete log")
            }
        } catch (error) {
            console.error("Failed to delete log", error)
            setError("Failed to delete log")
        }
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="flex gap-4 items-end">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <label htmlFor="weight" className="text-sm font-medium">Log Weight (lbs)</label>
                    <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="e.g. 175.5"
                    />
                </div>
                <Button type="submit">Add Log</Button>
            </form>
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="h-[300px] w-full">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">Loading...</div>
                ) : data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} />
                            <YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)' }}
                            />
                            <Line type="monotone" dataKey="weight" stroke="#8884d8" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">No data yet</div>
                )}
            </div>

            <div className="space-y-2">
                <h3 className="text-lg font-semibold">Recent Logs</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {data.slice().reverse().map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between p-2 border rounded-md">
                            <div>
                                <span className="font-medium">{log.weight} lbs</span>
                                <span className="text-muted-foreground text-sm ml-2">{format(new Date(log.fullDate), 'MMM dd, yyyy')}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => deleteLog(log.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                Delete
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
