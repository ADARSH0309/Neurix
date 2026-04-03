import { type ReactNode } from 'react';

/**
 * Visually hidden content for screen readers only.
 * Use for accessible labels on icon-only buttons.
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return (
    <span
      className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      style={{ clip: 'rect(0, 0, 0, 0)' }}
    >
      {children}
    </span>
  );
}
