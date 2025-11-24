interface InputProps {
    label?: string
    type?: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    required?: boolean
    error?: string
    helperText?: string
}

export const Input = (props: InputProps) => {
    return (
        <div className="flex flex-col gap-1.5">
            {props.label && (
                <label className="text-sm font-semibold text-slate-700">
                    {props.label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                type={props.type ?? "text"}
                value={props.value}
                onChange={e => props.onChange(e.target.value)}
                placeholder={props.placeholder}
                className={`w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-colors
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    placeholder:text-slate-400
                    ${props.error
                        ? "border-red-300 focus:border-red-500"
                        : "border-slate-200 focus:border-blue-500 hover:border-slate-300"
                    }`}
                required={props.required}
            />
            {props.error && (
                <p className="text-xs text-red-600">{props.error}</p>
            )}
            {props.helperText && !props.error && (
                <p className="text-xs text-slate-500">{props.helperText}</p>
            )}
        </div>
    )
}
