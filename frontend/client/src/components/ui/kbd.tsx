import { cn } from '@/lib/utils';

interface KbdProps {
  children: string;
  className?: string;
}

export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd className={cn(
      'inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-mono font-semibold',
      'bg-muted border border-border rounded-md shadow-[0_1px_0_1px] shadow-border/50',
      'text-muted-foreground',
      className
    )}>
      {children}
    </kbd>
  );
}
