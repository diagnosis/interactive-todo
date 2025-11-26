// src/routes/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from "@tanstack/react-query"
import { teamClient } from "../api/teamClient"
import { Sidebar } from "../features/teams/components/Sidebar"
import { useState } from "react"
import { TeamTasks } from "../features/tasks/components/TeamTasks"
import { API_BASE_URL } from "../api/apiClient"   // 👈 import this

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const token = localStorage.getItem('access_token')
    if (token) return

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) throw new Error()

      const body = await res.json()
      const payload = body.data ?? body

      const access = payload.access_token
      const user = payload.user

      if (access) {
        localStorage.setItem('access_token', access)
      }
      if (user) {
        localStorage.setItem('current_user', JSON.stringify(user))
      }

      return
    } catch {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['teams'],
    queryFn: teamClient.listTeamsForUser,
  })

  const teams = data?.data?.teams ?? []
  const useDropdown = teams.length > 5

  return (
      <div className="flex flex-1">
        <Sidebar
            teams={teams}
            useDropdown={useDropdown}
            selectedTeamId={selectedTeamId}
            setSelectedTeamId={setSelectedTeamId}
        />

        <TeamTasks teamId={selectedTeamId} />
      </div>
  )
}