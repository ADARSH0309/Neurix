import { cn } from '@/lib/utils';

interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantClasses = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export function CountBadge({ count, max = 99, variant = 'default', className }: CountBadgeProps) {
  const display = count > max ? `${max}+` : count.toString();
  return (
    <span className={cn(
      'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full',
      variantClasses[variant],
      className
    )}>
      {display}
    </span>
  );
}
