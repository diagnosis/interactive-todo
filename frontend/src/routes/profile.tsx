import {createFileRoute, redirect} from '@tanstack/react-router'
import {useAuth} from "../context/AuthContext.tsx";
import { useState } from "react";
import {useMutation} from "@tanstack/react-query";
import {userClient} from "../api/userClient.ts";
import {Input} from "../shared/components/Input.tsx";
import { Button } from "../shared/components/Button.tsx";

export const Route = createFileRoute('/profile')({
    beforeLoad : () => {
      const raw = localStorage.getItem("current_user")
      if (!raw){
          throw redirect({to: "/login"})
      }
      return null
    },

    component: ProfilePage,
})

function ProfilePage() {
    const {user, logout} = useAuth()
    const [displayName, setDisplayName] = useState(user?.display_name ?? "")
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [profileErr, setProfileErr] = useState<string| null>(null)
    const [passwordErr, setPasswordErr] =useState<string | null>(null)
    const [passwordMsg, setPasswordMsg] = useState<string | null>(null)

    const profileMutation =useMutation({
        mutationFn: () => userClient.updateProfile({display_name: displayName.trim()}),
        onSuccess: (res) => {
            if(res.error){
                setProfileErr(res.error.message)
                return
            }
            setProfileErr(null)
            const updatedUser = res.data?.user
            if (updatedUser){
                localStorage.setItem("current_user", JSON.stringify(updatedUser))
                window.dispatchEvent(new StorageEvent("storage",  {key: "current_user"}))
            }
        }
    })
    const passwordMutation = useMutation({
        mutationFn: () => {
           return userClient.updatePassword({current_password:currentPassword,password:newPassword})
        },
        onSuccess: (res) =>{
            if(res.error){
                setProfileErr(res.error.message)
                setPasswordMsg(null)
                return
            }
            setPasswordErr(null)
            setPasswordMsg("Password updated successfully")
            setCurrentPassword("")
            setNewPassword("")
        }
    })
    const mustSetName = !user?.display_name
    return (
        <div className="flex-1 flex justify-center py-8 px-4">
            <div className="w-full max-w-lg space-y-8">
                <header>
                    <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
                    <p className="text-sm text-slate-500">
                        Manage your personal information and password.
                    </p>
                    {mustSetName && (
                        <p className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                            Please set a display name before continuing.
                        </p>
                    )}
                </header>

                {/* Display name / profile section */}
                <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
                    <h2 className="text-sm font-semibold text-slate-800">Profile info</h2>
                    {profileErr && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                            {profileErr}
                        </p>
                    )}

                    <form
                        className="space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault()
                            profileMutation.mutate()
                        }}
                    >
                        <Input
                            label="Email"
                            type="email"
                            value={user?.email ?? ''}
                            onChange={() => {}}
                            disabled
                        />

                        <Input
                            label="Display name"
                            type="text"
                            value={displayName}
                            onChange={setDisplayName}
                            required
                        />

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                loading={profileMutation.isPending}
                            >
                                Save profile
                            </Button>
                        </div>
                    </form>
                </section>

                {/* Password section */}
                <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm space-y-3">
                    <h2 className="text-sm font-semibold text-slate-800">Password</h2>

                    {passwordErr && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                            {passwordErr}
                        </p>
                    )}
                    {passwordMsg && (
                        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
                            {passwordMsg}
                        </p>
                    )}

                    <form
                        className="space-y-3"
                        onSubmit={(e) => {
                            e.preventDefault()
                            passwordMutation.mutate()
                        }}
                    >
                        <Input
                            label="Current password"
                            type="password"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            required
                        />

                        <Input
                            label="New password"
                            type="password"
                            value={newPassword}
                            onChange={setNewPassword}
                            required
                        />

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setCurrentPassword('')
                                    setNewPassword('')
                                    setPasswordErr(null)
                                    setPasswordMsg(null)
                                }}
                                className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                                Reset
                            </button>

                            <Button
                                type="submit"
                                loading={passwordMutation.isPending}
                            >
                                Update password
                            </Button>
                        </div>
                    </form>
                </section>

                <section>
                    <button
                        type="button"
                        onClick={logout}
                        className="text-xs text-red-600 hover:underline"
                    >
                        Log out from this device
                    </button>
                </section>
            </div>
        </div>
    )

}
