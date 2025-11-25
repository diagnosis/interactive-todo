import type { ReactNode } from "react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    footer?: ReactNode
    maxWidthClass?: string
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidthClass = 'max-w-xl',
}: ModalProps) {
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            aria-modal="true"
            role="dialog"
        >
            <div className="absolute inset-0" onClick={onClose} />

            <div
                className={`
                    relative z-10 w-full ${maxWidthClass} mx-4
                    bg-white shadow-2xl rounded-2xl overflow-hidden
                    animate-in zoom-in-95 duration-200
                `}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    {title && (
                        <h2 className="text-lg font-bold text-slate-800">
                            {title}
                        </h2>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="px-6 py-5">{children}</div>

                {footer && (
                    <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
