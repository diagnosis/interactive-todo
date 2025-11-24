export function AuthCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-md p-8">
            {children}
        </div>
    );
}