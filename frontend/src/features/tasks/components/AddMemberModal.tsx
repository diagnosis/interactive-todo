import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Modal } from "../../../shared/components/Modal"
import { Button } from "../../../shared/components/Button"
import { Input } from "../../../shared/components/Input"
import { teamClient } from "../../../api/teamClient"
import { userClient } from "../../../api/userClient"
import type { TeamMemberRequest, TeamRole } from "../../../types/taskAndTeam"
import type { UserOption, UserSearchResponse } from "../../../types/auth"
import { useDebounce } from "../../../hooks/debounce"

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
            title="Add Team Member"
            maxWidthClass="max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        onClick={onClose}
                        variant="secondary"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        loading={mutation.isPending}
                        onClick={handleSubmit}
                    >
                        Add Member
                    </Button>
                </>
            }
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                        Search User
                    </label>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value)
                            setSelectedUser(null)
                        }}
                        className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                        placeholder="Type at least 2 characters (email or name)"
                    />

                    {search.trim().length >= 2 && candidates.length > 0 && !selectedUser && (
                        <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border-2 border-slate-200 bg-white shadow-lg">
                            {candidates.map((u) => (
                                <li
                                    key={u.id}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-100 last:border-b-0"
                                    onClick={() => {
                                        setSelectedUser(u)
                                        setSearch(u.display_name || u.email)
                                    }}
                                >
                                    <span className="truncate font-medium text-slate-800">
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
                        <p className="mt-2 text-sm text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
                            No users found.
                        </p>
                    )}

                    {selectedUser && (
                        <p className="mt-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                            Selected:{" "}
                            <span className="font-semibold">
                                {selectedUser.display_name ?? selectedUser.email}
                            </span>
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                        Role
                    </label>
                    <select
                        className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-colors"
                        value={role}
                        onChange={(e) => setRole(e.target.value as TeamRole)}
                    >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                    </select>
                </div>

                {errMsg && (
                    <p className="text-sm text-red-600 bg-red-50 border-2 border-red-200 rounded-lg px-4 py-3">
                        {errMsg}
                    </p>
                )}
            </form>
        </Modal>
    )
}
