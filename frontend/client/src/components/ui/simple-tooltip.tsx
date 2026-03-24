import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

interface SimpleTooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function SimpleTooltip({ content, children, side = 'top', className }: SimpleTooltipProps) {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className={cn(
          'absolute z-50 px-2.5 py-1.5 text-[11px] font-medium bg-popover text-popover-foreground border border-border rounded-lg shadow-lg whitespace-nowrap pointer-events-none',
          positionClasses[side]
        )}>
          {content}
        </div>
      )}
    </div>
  );
}
