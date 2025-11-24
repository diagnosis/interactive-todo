

interface TextInputProps{
    label: string
    type?: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    required: boolean
}


export const TextInput = (props: TextInputProps)=>{
    return <>
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">
                {props.label}
            </label>
            <input
                type={props.type?props.type:"text"}
                value={props.value}
                onChange={e=>props.onChange(e.target.value)}
                placeholder={props.placeholder}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                            placeholder:text-slate-400"
                required={props.required}
            />
        </div>

    </>
}