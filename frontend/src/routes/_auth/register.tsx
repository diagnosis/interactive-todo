import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import authClient from '../../api/authClient'
import { TextInput } from "../../components/ui/text.tsx";
import { PrimaryButton } from "../../components/ui/buttons.tsx";
import { AuthCard } from "../../components/ui/cards.tsx";

export const Route = createFileRoute('/_auth/register')({
    component: RegisterPage,
})

interface RegisterVars {
    email: string
    password: string
    displayName: string
    wantsManager: boolean
}

function RegisterPage() {
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
        <AuthCard>
            <h1 className="text-2xl font-semibold text-slate-800 mb-2">
                Create your account
            </h1>
            <p className="text-sm text-slate-500 mb-2">
                Sign up to start managing your team and tasks
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
                <TextInput
                    label="Display Name"
                    type="text"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="display name"
                    required
                />
                <div className="flex items-start gap-2">
                    <input
                        id="wants-manager"
                        type="checkbox"
                        checked={wantsManager}
                        onChange={(e) => setWantsManager(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="wants-manager" className="text-sm text-slate-700">
                        I want to manage tasks / teams
                    </label>
                </div>

                <PrimaryButton type="submit" loading={registerMutation.isPending}>
                    Sign up
                </PrimaryButton>

                <div className="text-center mt-3 text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link
                        to="/login"
                        className="text-indigo-600 hover:underline font-medium"
                    >
                        Log in
                    </Link>
                </div>
            </form>
        </AuthCard>
    )
}