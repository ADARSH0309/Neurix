import { cn } from '@/lib/utils';

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  if (!label) return <hr className={cn('border-border', className)} />;
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 h-px bg-border" />
      <span className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}
