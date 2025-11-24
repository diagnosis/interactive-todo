// src/components/dashboard/TeamMemberList.tsx
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { teamClient } from "../../api/teamClient"
import type { TeamMember } from "../../types/taskAndTeam"
import { useAuth } from "../../context/AuthContext"
import { AddMemberModal } from "../task/AddMemberModal"

interface TeamMembersListProps {
    teamId: string | null
}

export function TeamMemberList({ teamId }: TeamMembersListProps) {
    const { user } = useAuth()
    const [isAddOpen, setIsAddOpen] = useState(false)

    const canManage =
        user?.type === "task_manager" || user?.type === "admin"

    // ✅ always call the hook
    const { data, isLoading, isError } = useQuery({
        queryKey: ["team-members", teamId],
        queryFn: () => teamClient.listMembers(teamId ?? ""), // won't run if enabled = false
        enabled: !!teamId,
    })

    const members: TeamMember[] = data?.data?.members ?? []

    // UI branches AFTER hooks
    if (!teamId) {
        return (
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">
                    Team members
                </h3>
                <p className="text-xs text-slate-500">
                    Select a team to see its members.
                </p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">
                    Team members
                </h3>
                <p className="text-xs text-slate-500">Loading members…</p>
            </div>
        )
    }

    if (isError || !data) {
        return (
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-700">
                    Team members
                </h3>
                <p className="text-xs text-red-500">
                    Could not load team members
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-700">
                Team members
            </h3>

            {members.length === 0 ? (
                <p className="text-xs text-slate-500">No members yet.</p>
            ) : (
                <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {members.map((m) => (
                        <li
                            key={`${m.team_id}-${m.user_id}`}
                            className="flex items-center justify-between text-xs px-2 py-1 rounded-md hover:bg-slate-100"
                        >
              <span className="truncate">
                {m.display_name ?? m.email}
              </span>
                            {m.role && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                  {m.role}
                </span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {canManage && (
                <button
                    type="button"
                    onClick={() => setIsAddOpen(true)}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    + Add member
                </button>
            )}

            <AddMemberModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                teamId={teamId}
            />
        </div>
    )
}