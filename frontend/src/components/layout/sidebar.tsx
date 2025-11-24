// src/components/layout/sidebar.tsx
import type { Team } from "../../types/taskAndTeam"
import { useAuth } from "../../context/AuthContext"
import { useState } from "react"
import { CreateTeamModal } from "../task/CreateTeamModal"
import { TeamMemberList } from "../dashboard/TeamMemberList"

interface AsideProps {
    useDropdown: boolean
    teams: Team[]
    selectedTeamId: string | null
    setSelectedTeamId: (val: string | null) => void
}

export const Aside = (props: AsideProps) => {
    const { user } = useAuth()
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const canManage =
        user?.type === "task_manager" || user?.type === "admin"

    return (
        <aside className="w-64 border-r border-slate-200 bg-slate-50 p-4 flex flex-col gap-4">
            {/* --- YOUR TEAM --- */}
            <div>
                <h2 className="text-sm font-semibold text-slate-700 mb-3">
                    Your Team
                </h2>

                {props.teams.length === 0 && (
                    <p className="text-xs text-slate-500">
                        You are not a member of any team yet
                    </p>
                )}

                {props.teams.length > 0 && props.useDropdown && (
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">
                            Select a team
                        </label>
                        <select
                            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={props.selectedTeamId ?? ""}
                            onChange={(e) =>
                                props.setSelectedTeamId(e.target.value || null)
                            }
                        >
                            <option value="">-- Choose a team --</option>
                            {props.teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {props.teams.length > 0 && !props.useDropdown && (
                    <ul className="space-y-1">
                        {props.teams.map((team) => (
                            <li key={team.id}>
                                <button
                                    onClick={() =>
                                        props.setSelectedTeamId(
                                            props.selectedTeamId === team.id ? null : team.id,
                                        )
                                    }
                                    className={`w-full text-left px-2 py-1 rounded-md text-sm transition ${
                                        props.selectedTeamId === team.id
                                            ? "bg-indigo-100 text-indigo-700"
                                            : "hover:bg-slate-100 text-slate-700"
                                    }`}
                                >
                                    {team.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {canManage && (
                    <div className="mt-3">
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700"
                        >
                            + Create team
                        </button>
                    </div>
                )}
            </div>

            {/* separator */}
            <div className="border-t border-slate-200" />

            {/* --- TEAM MEMBERS --- */}
            <TeamMemberList teamId={props.selectedTeamId} />

            <CreateTeamModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
            />
        </aside>
    )
}