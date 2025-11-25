import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { teamClient } from "../../../api/teamClient"
import { Modal } from "../../../shared/components/Modal"
import { Input } from "../../../shared/components/Input"
import { Button } from "../../../shared/components/Button"

interface CreateTeamModalProps {
    isOpen: boolean
    onClose: () => void
}

export function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
    const [name, setName] = useState("")
    const [err, setErr] = useState<string | null>(null)
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: (name: string) => teamClient.create(name),
        onSuccess: (res) => {
            if (res.error) {
                setErr(res.error.message)
                return
            }

            queryClient.invalidateQueries({ queryKey: ["teams"] })
            setName("")
            setErr(null)
            onClose()
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErr(null)
        const trimmed = name.trim()
        if (!trimmed) {
            setErr("Team name is required")
            return
        }
        createMutation.mutate(trimmed)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create a New Team"
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
                        loading={createMutation.isPending}
                        onClick={handleSubmit}
                    >
                        Create Team
                    </Button>
                </>
            }
        >
            <form className="space-y-4" onSubmit={handleSubmit}>
                {err && (
                    <p className="text-sm text-red-600 bg-red-50 border-2 border-red-200 rounded-lg px-4 py-3">
                        {err}
                    </p>
                )}
                <Input
                    label="Team Name"
                    value={name}
                    onChange={setName}
                    required
                    placeholder="e.g., Backend Squad"
                />
            </form>
        </Modal>
    )
}
