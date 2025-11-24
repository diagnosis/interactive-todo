// login.tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from "react"
import { useAuth } from "../../context/AuthContext"
import { AuthCard } from "../../components/ui/cards.tsx"
import { TextInput } from "../../components/ui/text.tsx"
import { PrimaryButton } from "../../components/ui/buttons.tsx"

export const Route = createFileRoute('/_auth/login')({
    component: LoginPage,
})

function LoginPage() {
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
        <AuthCard>
            <h1 className="text-2xl font-semibold text-slate-800 mb-2">Welcome back</h1>
            <p className="text-sm text-slate-500 mb-2">
                Sign in to manage your team and tasks
            </p>
            {errMsg && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {errMsg}
                </div>
            )}
            <form className="space-y-4" onSubmit={onSubmit}>
                <TextInput
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    required
                    placeholder="you@example.com"
                />
                <TextInput
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="••••••••"
                    required
                />

                <div className="text-center mt-3 text-sm text-slate-600">
                    Don't have an account?{" "}
                    <Link
                        to="/register"
                        className="text-indigo-600 hover:underline font-medium"
                    >
                        Sign up
                    </Link>
                </div>

                <PrimaryButton type="submit" loading={isLoggingIn}>
                    Sign in
                </PrimaryButton>
            </form>
        </AuthCard>
    )
}