import {useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {teamClient} from "../../api/teamClient.ts";
import { Modal } from "../ui/Modal.tsx";
import { TextInput } from "../ui/text.tsx";
import { PrimaryButton } from "../ui/buttons.tsx";


interface CreateTeamModalProps{
    isOpen: boolean
    onClose: () => void
}

export function CreateTeamModal({ isOpen, onClose}: CreateTeamModalProps){
    const [name, setName] = useState("")
    const [err, setErr] = useState<string| null>(null)
    const queryClient = useQueryClient()

    const createMutation = useMutation({
        mutationFn: (name:string)=> teamClient.create(name),
        onSuccess: (res) => {
            if (res.error){
                setErr(res.error.message)
                return
            }

            queryClient.invalidateQueries({queryKey:["teams"]})
            setName("")
            setErr(null)
            onClose()
        }
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErr(null)
        const trimmed = name.trim()
        if (!trimmed){
            setErr("team name is required")
            return
        }
        createMutation.mutate(trimmed)
    }
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create a new team"
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
                        loading={createMutation.isPending}
                        click={handleSubmit as any}
                    >
                        Create
                    </PrimaryButton>
                </>
            }
        >
            <form className="space-y-3" onSubmit={handleSubmit}>
                {err && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                        {err}
                    </p>
                )}
                <TextInput
                    label="Team name"
                    value={name}
                    onChange={setName}
                    required
                    placeholder="Backend Squad"
                />
            </form>
        </Modal>
    )
}
