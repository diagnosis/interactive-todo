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
        <div className="flex-1 flex justify-center py-12 px-4 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
            <div className="w-full max-w-2xl space-y-8">
                <header className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl mb-4 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Profile Settings</h1>
                    <p className="text-slate-600">
                        Manage your personal information and account security
                    </p>
                    {mustSetName && (
                        <div className="mt-4 inline-block rounded-xl bg-amber-50 border-2 border-amber-200 px-4 py-3 text-sm text-amber-800">
                            <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Please set a display name before continuing
                        </div>
                    )}
                </header>

                <section className="rounded-2xl bg-white border-2 border-slate-200 p-6 shadow-xl space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Profile Information</h2>
                            <p className="text-xs text-slate-500">Update your personal details</p>
                        </div>
                    </div>

                    {profileErr && (
                        <div className="rounded-xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm text-red-700">
                            {profileErr}
                        </div>
                    )}

                    <form
                        className="space-y-5"
                        onSubmit={(e) => {
                            e.preventDefault()
                            profileMutation.mutate()
                        }}
                    >
                        <Input
                            label="Email Address"
                            type="email"
                            value={user?.email ?? ''}
                            onChange={() => {}}
                            disabled
                        />

                        <Input
                            label="Display Name"
                            type="text"
                            value={displayName}
                            onChange={setDisplayName}
                            required
                        />

                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                loading={profileMutation.isPending}
                            >
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </section>

                <section className="rounded-2xl bg-white border-2 border-slate-200 p-6 shadow-xl space-y-5">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Change Password</h2>
                            <p className="text-xs text-slate-500">Update your account password</p>
                        </div>
                    </div>

                    {passwordErr && (
                        <div className="rounded-xl bg-red-50 border-2 border-red-200 px-4 py-3 text-sm text-red-700">
                            {passwordErr}
                        </div>
                    )}
                    {passwordMsg && (
                        <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                            {passwordMsg}
                        </div>
                    )}

                    <form
                        className="space-y-5"
                        onSubmit={(e) => {
                            e.preventDefault()
                            passwordMutation.mutate()
                        }}
                    >
                        <Input
                            label="Current Password"
                            type="password"
                            value={currentPassword}
                            onChange={setCurrentPassword}
                            required
                        />

                        <Input
                            label="New Password"
                            type="password"
                            value={newPassword}
                            onChange={setNewPassword}
                            required
                        />

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                onClick={() => {
                                    setCurrentPassword('')
                                    setNewPassword('')
                                    setPasswordErr(null)
                                    setPasswordMsg(null)
                                }}
                                variant="secondary"
                            >
                                Clear
                            </Button>

                            <Button
                                type="submit"
                                loading={passwordMutation.isPending}
                            >
                                Update Password
                            </Button>
                        </div>
                    </form>
                </section>

            </div>
        </div>
    )

}
