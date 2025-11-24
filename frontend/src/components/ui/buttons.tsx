import type { ReactNode } from "react"

interface PrimaryButtonProps {
    children: ReactNode
    loading?: boolean
    click?: () => void
    className?: string
    type?: "button" | "submit" | "reset"
}

export const PrimaryButton = ({
                                  children,
                                  loading,
                                  click,
                                  className = "",
                                  type = "button",
                              }: PrimaryButtonProps) => {
    return (
        <button
            className={`py-2 px-4 rounded-md transition 
        ${loading ? "opacity-50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white"} 
        ${className}`}
            type={type}
            onClick={click}
            disabled={loading}
        >
            {loading ? "Loading..." : children}
        </button>
    )
}