import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { teamApi, Team } from '../api/teamApi'
import { Modal } from '../components/Modal'

export const Route = createFileRoute('/teams')({
    component: TeamsPage,
})

function TeamsPage() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false)
    const queryClient = useQueryClient()

    const { data: teamsData, isLoading } = useQuery({
        queryKey: ['teams'],
        queryFn: teamApi.listMyTeams,
    })

    const createTeamMutation = useMutation({
        mutationFn: teamApi.createTeam,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] })
            setIsCreateModalOpen(false)
            alert('Team created successfully!')
        },
        onError: (error: any) => {
            alert(error.response?.data?.error?.message || 'Failed to create team')
        },
    })

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        )
    }

    const teams = teamsData?.teams || []

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Teams</h1>
                        <p className="text-gray-600 mt-1">Manage your teams and collaborate with members</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            to="/dashboard"
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                            Back to Dashboard
                        </Link>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            + Create Team
                        </button>
                    </div>
                </div>

                {teams.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <p className="text-gray-500 mb-4">You are not a member of any teams yet.</p>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Create Your First Team
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map((team) => (
                            <div
                                key={team.id}
                                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900">{team.name}</h3>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">
                                    Created {new Date(team.created_at).toLocaleDateString()}
                                </p>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => setSelectedTeam(team)}
                                        className="w-full px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                    >
                                        View Members
                                    </button>
                                    <Link
                                        to="/teams/$teamId/tasks"
                                        params={{ teamId: team.id }}
                                        className="block w-full px-3 py-2 text-sm text-center bg-green-50 text-green-600 rounded hover:bg-green-100"
                                    >
                                        View Tasks
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Create New Team"
            >
                <CreateTeamForm
                    onSubmit={(name) => createTeamMutation.mutate(name)}
                    isPending={createTeamMutation.isPending}
                />
            </Modal>

            <Modal
                isOpen={!!selectedTeam}
                onClose={() => setSelectedTeam(null)}
                title={`${selectedTeam?.name} - Team Members`}
            >
                {selectedTeam && (
                    <TeamMembersView
                        teamId={selectedTeam.id}
                        onAddMember={() => {
                            setIsAddMemberModalOpen(true)
                        }}
                    />
                )}
            </Modal>
        </div>
    )
}

function CreateTeamForm({ onSubmit, isPending }: { onSubmit: (name: string) => void; isPending: boolean }) {
    const [name, setName] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (name.trim()) {
            onSubmit(name.trim())
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name *
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Marketing Team"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    maxLength={100}
                />
            </div>
            <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
                {isPending ? 'Creating...' : 'Create Team'}
            </button>
        </form>
    )
}

function TeamMembersView({ teamId, onAddMember }: { teamId: string; onAddMember: () => void }) {
    const queryClient = useQueryClient()
    const [isAddingMember, setIsAddingMember] = useState(false)

    const { data: membersData, isLoading } = useQuery({
        queryKey: ['team-members', teamId],
        queryFn: () => teamApi.listMembers(teamId),
    })

    const removeMemberMutation = useMutation({
        mutationFn: (userId: string) => teamApi.removeMember(teamId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members', teamId] })
            alert('Member removed successfully!')
        },
        onError: (error: any) => {
            alert(error.response?.data?.error?.message || 'Failed to remove member')
        },
    })

    const addMemberMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: 'admin' | 'member' }) =>
            teamApi.addMember(teamId, userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-members', teamId] })
            setIsAddingMember(false)
            alert('Member added successfully!')
        },
        onError: (error: any) => {
            alert(error.response?.data?.error?.message || 'Failed to add member')
        },
    })

    if (isLoading) {
        return <div className="text-center py-4">Loading members...</div>
    }

    const members = membersData?.members || []

    return (
        <div className="space-y-4">
            {!isAddingMember ? (
                <>
                    <div className="max-h-96 overflow-y-auto">
                        {members.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No members in this team yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {members.map((member) => (
                                    <div
                                        key={member.user_id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {member.user_id}
                                            </p>
                                            <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                                        </div>
                                        {member.role !== 'owner' && (
                                            <button
                                                onClick={() => {
                                                    if (confirm('Remove this member from the team?')) {
                                                        removeMemberMutation.mutate(member.user_id)
                                                    }
                                                }}
                                                disabled={removeMemberMutation.isPending}
                                                className="px-3 py-1 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsAddingMember(true)}
                        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        + Add Member
                    </button>
                </>
            ) : (
                <AddMemberForm
                    onSubmit={(userId, role) => addMemberMutation.mutate({ userId, role })}
                    onCancel={() => setIsAddingMember(false)}
                    isPending={addMemberMutation.isPending}
                />
            )}
        </div>
    )
}

function AddMemberForm({
    onSubmit,
    onCancel,
    isPending,
}: {
    onSubmit: (userId: string, role: 'admin' | 'member') => void
    onCancel: () => void
    isPending: boolean
}) {
    const [userId, setUserId] = useState('')
    const [role, setRole] = useState<'admin' | 'member'>('member')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (userId.trim()) {
            onSubmit(userId.trim(), role)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    User ID *
                </label>
                <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                </label>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                </select>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isPending ? 'Adding...' : 'Add Member'}
                </button>
            </div>
        </form>
    )
}
