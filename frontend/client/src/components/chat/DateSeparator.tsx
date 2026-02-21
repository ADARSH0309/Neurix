interface DateSeparatorProps {
    dateString: string;
}

function formatDateLabel(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' });
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DateSeparator({ dateString }: DateSeparatorProps) {
    const label = formatDateLabel(dateString);

    return (
        <div className="flex items-center gap-4 my-6 px-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <span className="text-[10px] font-mono font-medium text-slate-grey uppercase tracking-widest">
                {label}
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        </div>
    );
}
