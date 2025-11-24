import type { Team } from "../../../types/taskAndTeam"
import { useAuth } from "../../../context/AuthContext"
import { useState } from "react"
import { CreateTeamModal } from "../../tasks/components/CreateTeamModal"
import { TeamMemberList } from "./TeamMemberList"
import { Button } from "../../../shared/components/Button"

interface SidebarProps {
    useDropdown: boolean
    teams: Team[]
    selectedTeamId: string | null
    setSelectedTeamId: (val: string | null) => void
}

export const Sidebar = (props: SidebarProps) => {
    const { user } = useAuth()
    const [isCreateOpen, setIsCreateOpen] = useState(false)

    const canManage =
        user?.type === "task_manager" || user?.type === "admin"

    return (
        <aside className="w-72 border-r border-slate-200/50 bg-white/80 backdrop-blur-sm p-6 flex flex-col gap-6 shadow-sm">
            <div>
                <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">
                    Your Teams
                </h2>

                {props.teams.length === 0 && (
                    <p className="text-sm text-slate-500 bg-slate-50 rounded-lg p-4 border border-slate-200">
                        You are not a member of any team yet
                    </p>
                )}

                {props.teams.length > 0 && props.useDropdown && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                            Select a team
                        </label>
                        <select
                            className="w-full rounded-lg border-2 border-slate-200 px-4 py-2.5 text-sm
                                focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                                bg-white transition-all"
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
                    <ul className="space-y-2">
                        {props.teams.map((team) => (
                            <li key={team.id}>
                                <button
                                    onClick={() =>
                                        props.setSelectedTeamId(
                                            props.selectedTeamId === team.id ? null : team.id,
                                        )
                                    }
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                                        props.selectedTeamId === team.id
                                            ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                                            : "hover:bg-slate-100 text-slate-700 border-2 border-transparent hover:border-slate-200"
                                    }`}
                                >
                                    {team.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {canManage && (
                    <div className="mt-4">
                        <Button
                            onClick={() => setIsCreateOpen(true)}
                            className="w-full"
                            size="md"
                        >
                            + Create Team
                        </Button>
                    </div>
                )}
            </div>

            <div className="border-t border-slate-200" />

            <TeamMemberList teamId={props.selectedTeamId} />

            <CreateTeamModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
            />
        </aside>
    )
}
