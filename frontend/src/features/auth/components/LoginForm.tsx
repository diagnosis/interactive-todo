import { useState } from "react"
import { Link, useNavigate } from '@tanstack/react-router'
import { useAuth } from "../../../context/AuthContext"
import { Card } from "../../../shared/components/Card"
import { Input } from "../../../shared/components/Input"
import { Button } from "../../../shared/components/Button"

export function LoginForm() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errMsg, setErrMsg] = useState<string | null>(null)
    const navigate = useNavigate()
    const { login, isLoggingIn } = useAuth()

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrMsg(null)
        try {
            await login(email.trim(), password.trim())
            navigate({ to: '/' })
        } catch (err: any) {
            setErrMsg(err.message ?? 'Login failed')
        }
    }

    return (
        <Card>
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back</h1>
                <p className="text-slate-600">
                    Sign in to manage your team and tasks
                </p>
            </div>

            {errMsg && (
                <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm text-red-700">
                    {errMsg}
                </div>
            )}

            <form className="space-y-5" onSubmit={onSubmit}>
                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    required
                    placeholder="you@example.com"
                />
                <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    required
                />

                <Button type="submit" loading={isLoggingIn} className="w-full" size="lg">
                    Sign in
                </Button>

                <div className="text-center pt-2 text-sm text-slate-600">
                    Don't have an account?{" "}
                    <Link
                        to="/register"
                        className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                        Sign up
                    </Link>
                </div>
            </form>
        </Card>
    )
}
