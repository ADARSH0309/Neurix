import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface AvatarIconProps {
  children: ReactNode;
  variant?: 'primary' | 'accent' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  primary: 'bg-primary text-primary-foreground',
  accent: 'bg-neurix-orange/90 text-white',
  muted: 'bg-muted text-muted-foreground',
};

const sizeClasses = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' };

export function AvatarIcon({ children, variant = 'primary', size = 'md', className }: AvatarIconProps) {
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center shrink-0 shadow-sm',
      variantClasses[variant], sizeClasses[size], className
    )}>
      {children}
    </div>
  );
}
