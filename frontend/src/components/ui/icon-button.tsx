import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'filled';
}

const sizeClasses = { sm: 'h-7 w-7', md: 'h-8 w-8', lg: 'h-10 w-10' };
const variantClasses = {
  ghost: 'hover:bg-muted/60 dark:hover:bg-white/[0.06] text-muted-foreground hover:text-foreground',
  outline: 'border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground',
  filled: 'bg-primary/10 text-primary hover:bg-primary/20',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, size = 'md', variant = 'ghost', className, ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-all duration-200 active:scale-95',
        sizeClasses[size], variantClasses[variant], className
      )}
      {...props}
    >
      {icon}
    </button>
  )
);
IconButton.displayName = 'IconButton';
