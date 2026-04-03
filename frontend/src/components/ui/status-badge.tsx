import { cn } from '@/lib/utils';

type Status = 'online' | 'offline' | 'connecting' | 'error';

const statusConfig: Record<Status, { dot: string; text: string; label: string }> = {
  online: { dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]', text: 'text-emerald-600 dark:text-emerald-400', label: 'Online' },
  offline: { dot: 'bg-muted-foreground/30', text: 'text-muted-foreground/50', label: 'Offline' },
  connecting: { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-600 dark:text-amber-400', label: 'Connecting' },
  error: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', label: 'Error' },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', config.dot)} />
      <span className={cn('text-xs font-medium', config.text)}>{config.label}</span>
    </span>
  );
}
