import type { ReactNode } from "react"

interface ButtonProps {
    children: ReactNode
    loading?: boolean
    onClick?: () => void
    className?: string
    type?: "button" | "submit" | "reset"
    variant?: "primary" | "secondary" | "danger" | "ghost"
    size?: "sm" | "md" | "lg"
    disabled?: boolean
}

export const Button = ({
    children,
    loading,
    onClick,
    className = "",
    type = "button",
    variant = "primary",
    size = "md",
    disabled = false,
}: ButtonProps) => {
    const baseStyles = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"

    const variantStyles = {
        primary: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg focus:ring-blue-500",
        secondary: "bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 hover:bg-slate-50 focus:ring-slate-500",
        danger: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-md hover:shadow-lg focus:ring-red-500",
        ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-500"
    }

    const sizeStyles = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    }

    const disabledStyles = (loading || disabled) ? "opacity-60 cursor-not-allowed" : ""

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
            type={type}
            onClick={onClick}
            disabled={loading || disabled}
        >
            {loading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </>
            ) : children}
        </button>
    )
}
