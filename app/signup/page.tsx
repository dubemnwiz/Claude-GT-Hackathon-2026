"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import { motion } from "framer-motion"
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react"
export default function SignupPage() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)
        
        try {
            const res = await fetch("/api/register", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    email,
                    password,
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            })

            if (res.ok) {
                setIsSuccess(true)
                setTimeout(() => {
                    router.push("/login")
                }, 1500)
            } else {
                const data = await res.text()
                setError(data || "Registration failed. Please try again.")
                setIsLoading(false)
            }
        } catch (error) {
            setError("Something went wrong. Please check your connection.")
            setIsLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-[80vh] relative z-10 w-full px-4">
            <motion.div
                className="w-full max-w-[380px]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            >
                <Card className="w-full bg-card border-border shadow-lg">
                    <CardHeader className="space-y-3 pb-6 border-b border-border mb-6 mx-6 px-0 pt-6">
                        <div className="flex justify-center mb-2">
                            <motion.div
                                initial={{ y: -10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="w-14 h-14 flex items-center justify-center rounded-2xl bg-primary/10 text-2xl"
                            >
                                🧭
                            </motion.div>
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-foreground text-center">Create Account</CardTitle>
                        <CardDescription className="text-muted-foreground text-sm text-center">Join Meridian to organize your life.</CardDescription>
                    </CardHeader>
                    <CardContent className="px-6">
                        <form onSubmit={onSubmit} className="space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                                    <Input 
                                        id="name" 
                                        placeholder="John Doe"
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)} 
                                        required 
                                        className="bg-muted border-border focus:border-primary transition-colors h-11"
                                        disabled={isLoading || isSuccess}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                                    <Input 
                                        id="email" 
                                        type="email" 
                                        placeholder="you@example.com"
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required 
                                        className="bg-muted border-border focus:border-primary transition-colors h-11"
                                        disabled={isLoading || isSuccess}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
                                    <Input 
                                        id="password" 
                                        type="password" 
                                        placeholder="••••••••"
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        required 
                                        className="bg-muted border-border focus:border-primary transition-colors h-11"
                                        disabled={isLoading || isSuccess}
                                        minLength={8}
                                    />
                                </div>
                            </div>
                            
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: "auto" }} 
                                    className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p>{error}</p>
                                </motion.div>
                            )}

                            {isSuccess && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }} 
                                    animate={{ opacity: 1, height: "auto" }} 
                                    className="flex items-center gap-2 text-sm text-primary bg-primary/10 border border-primary/20 p-3 rounded-lg"
                                >
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <p>Account created! Redirecting...</p>
                                </motion.div>
                            )}

                            <Button 
                                className="w-full relative h-11 transition-all" 
                                type="submit" 
                                disabled={isLoading || isSuccess}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating Account...
                                    </>
                                ) : isSuccess ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Success!
                                    </>
                                ) : (
                                    <span className="font-medium">Sign Up</span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-center bg-secondary py-4 mt-2 rounded-b-xl border-t border-border">
                        <p className="text-sm text-muted-foreground">
                            Already have an account? <Link href="/login" className="text-primary font-medium hover:underline transition-colors ml-1">Log in</Link>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}
