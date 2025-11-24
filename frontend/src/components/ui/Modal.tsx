// src/components/ui/Modal.tsx
import type { ReactNode } from "react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    footer?: ReactNode
    /** Tailwind max-width class, e.g. 'max-w-lg', 'max-w-xl', 'max-w-2xl' */
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40"
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Panel */}
            <div
                className={`
          relative z-10
          w-full ${maxWidthClass}
          mx-4
          bg-white shadow-xl
          rounded-xl overflow-hidden
        `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                    {title && (
                        <h2 className="text-sm font-semibold text-slate-800">
                            {title}
                        </h2>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-sm"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-3">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}