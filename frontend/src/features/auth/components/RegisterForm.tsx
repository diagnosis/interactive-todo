import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import authClient from '../../../api/authClient'
import { Card } from "../../../shared/components/Card"
import { Input } from "../../../shared/components/Input"
import { Button } from "../../../shared/components/Button"

interface RegisterVars {
    email: string
    password: string
    displayName: string
    wantsManager: boolean
}

export function RegisterForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [displayName, setDisplayName] = useState("")
    const [wantsManager, setWantsManager] = useState(false)
    const [errMsg, setErrMsg] = useState<string | null>(null)
    const navigate = useNavigate()

    const registerMutation = useMutation({
        mutationFn: (vars: RegisterVars) =>
            authClient.register(vars.email, vars.password, vars.displayName, vars.wantsManager),
        onSuccess: (res) => {
            if (res.error) {
                setErrMsg(res.error.message)
                return
            }
            navigate({ to: '/login' })
        },
    })

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErrMsg(null)

        const trimmedName = displayName.trim()
        if (trimmedName.length < 3) {
            setErrMsg("Display name must be at least 3 characters")
            return
        }

        registerMutation.mutate({
            email: email.trim(),
            password: password.trim(),
            displayName: trimmedName,
            wantsManager,
        })
    }

    return (
        <Card>
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">
                    Create Account
                </h1>
                <p className="text-slate-600">
                    Sign up to start managing your team and tasks
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
                <Input
                    label="Display Name"
                    type="text"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="Your name"
                    required
                />

                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border-2 border-slate-200">
                    <input
                        id="wants-manager"
                        type="checkbox"
                        checked={wantsManager}
                        onChange={(e) => setWantsManager(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="wants-manager" className="text-sm text-slate-700 cursor-pointer">
                        I want to manage tasks and teams
                    </label>
                </div>

                <Button type="submit" loading={registerMutation.isPending} className="w-full" size="lg">
                    Sign up
                </Button>

                <div className="text-center pt-2 text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                        Log in
                    </Link>
                </div>
            </form>
        </Card>
    )
}
