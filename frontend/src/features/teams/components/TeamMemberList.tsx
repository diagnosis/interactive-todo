import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { teamClient } from "../../../api/teamClient"
import { useAuth } from "../../../context/AuthContext"
import { useState } from "react"
import { AddMemberModal } from "../../tasks/components/AddMemberModal"
import { Button } from "../../../shared/components/Button"

interface TeamMemberListProps {
    teamId: string | null
}

export function TeamMemberList({ teamId }: TeamMemberListProps) {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [showAddModal, setShowAddModal] = useState(false)

    const { data: membersResp } = useQuery({
        queryKey: ["team-members", teamId],
        queryFn: () => teamClient.listMembers(teamId!),
        enabled: !!teamId,
    })

    const members = membersResp?.data?.members ?? []

    const removeMutation = useMutation({
        mutationFn: (userId: string) => teamClient.removeMember(teamId!, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["team-members", teamId] })
        },
    })

    const canManage = user?.type === "task_manager" || user?.type === "admin"

    if (!teamId) {
        return (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-200">
                Select a team to view members
            </div>
        )
    }

    return (
        <div>
            <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">
                Team Members
            </h3>

            {members.length === 0 ? (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-200">
                    No members in this team
                </p>
            ) : (
                <ul className="space-y-2">
                    {members.map((member) => (
                        <li
                            key={member.user_id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                    {member.display_name ?? "Unknown"}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {member.email}
                                </p>
                            </div>
                            {canManage && member.user_id !== user?.id && (
                                <button
                                    onClick={() => removeMutation.mutate(member.user_id)}
                                    disabled={removeMutation.isPending}
                                    className="ml-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {canManage && (
                <div className="mt-4">
                    <Button
                        onClick={() => setShowAddModal(true)}
                        variant="secondary"
                        size="sm"
                        className="w-full"
                    >
                        + Add Member
                    </Button>
                </div>
            )}

            <AddMemberModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                teamId={teamId}
            />
        </div>
    )
}
