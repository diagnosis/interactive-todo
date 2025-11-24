// src/components/task/AddMemberModal.tsx
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Modal } from "../ui/Modal"
import { PrimaryButton } from "../ui/buttons"
import { teamClient } from "../../api/teamClient"
import { userClient } from "../../api/userClient"
import type { TeamMemberRequest, TeamRole } from "../../types/taskAndTeam"
import type { UserOption, UserSearchResponse } from "../../types/auth"
import {useDebounce} from "../../hooks/debounce.ts";


interface AddMemberModalProps {
    isOpen: boolean
    onClose: () => void
    teamId: string | null
}

export function AddMemberModal({
                                   isOpen,
                                   onClose,
                                   teamId,
                               }: AddMemberModalProps) {
    const [search, setSearch] = useState("")
    const [selectedUser, setSelectedUser] = useState<UserOption | null>(null)
    const [role, setRole] = useState<TeamRole>("member")
    const [errMsg, setErrMsg] = useState<string | null>(null)
    const queryClient = useQueryClient()
    const debouncedSearch = useDebounce(search, 300)

    const minLenOk = debouncedSearch.trim().length >= 2

    const { data: userSearch } = useQuery({
        queryKey: ["user-search", debouncedSearch],
        queryFn: () => userClient.search(debouncedSearch),
        enabled: isOpen && minLenOk,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
    })

    const candidates: UserOption[] =
        (userSearch?.data as UserSearchResponse | undefined)?.users ?? []

    const mutation = useMutation({
        mutationFn: (payload: TeamMemberRequest) => teamClient.addMember(payload),
        onSuccess: (res) => {
            if (res.error) {
                setErrMsg(res.error.message)
                return
            }
            if (teamId) {
                queryClient.invalidateQueries({ queryKey: ["team-members", teamId] })
            }

            setSearch("")
            setSelectedUser(null)
            setRole("member")
            setErrMsg(null)
            onClose()
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErrMsg(null)

        if (!teamId) return
        if (!selectedUser) {
            setErrMsg("Please select a user")
            return
        }

        const payload: TeamMemberRequest = {
            team_id: teamId,
            user_id: selectedUser.id,
            role,
        }

        mutation.mutate(payload)
    }

    return (
        <Modal
            isOpen={isOpen && !!teamId}
            onClose={onClose}
            title="Add team member"
            maxWidthClass="max-w-lg"
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <PrimaryButton
                        type="submit"
                        loading={mutation.isPending}
                        click={handleSubmit as any}
                    >
                        Add
                    </PrimaryButton>
                </>
            }
        >
            <form className="space-y-3" onSubmit={handleSubmit}>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                        Search user (email or name)
                    </label>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setSelectedUser(null)
                        }}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Type at least 2 characters…"
                    />

                    {/* dropdown */}
                    {search.trim().length >= 2 && candidates.length > 0 && !selectedUser && (
                        <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-sm text-sm">
                            {candidates.map((u) => (
                                <li
                                    key={u.id}
                                    className="px-3 py-1.5 hover:bg-slate-100 cursor-pointer flex justify-between"
                                    onClick={() => {
                                        setSelectedUser(u)
                                        setSearch(u.display_name || u.email)
                                    }}
                                >
                  <span className="truncate">
                    {u.display_name ?? u.email}
                  </span>
                                    <span className="ml-2 text-xs text-slate-500">
                    {u.email}
                  </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {search.trim().length >= 2 && candidates.length === 0 && (
                        <p className="mt-1 text-[11px] text-slate-500">
                            No users found.
                        </p>
                    )}

                    {selectedUser && (
                        <p className="mt-1 text-[11px] text-slate-600">
                            Selected:{" "}
                            <span className="font-medium">
                {selectedUser.display_name ?? selectedUser.email}
              </span>
                        </p>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                        Role
                    </label>
                    <select
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={role}
                        onChange={(e) => setRole(e.target.value as TeamRole)}
                    >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                    </select>
                </div>

                {errMsg && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                        {errMsg}
                    </p>
                )}
            </form>
        </Modal>
    )
}