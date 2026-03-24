import { cn } from '@/lib/utils';

interface TruncateTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export function TruncateText({ text, maxLength = 100, className }: TruncateTextProps) {
  const truncated = text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
  return (
    <span className={cn('truncate', className)} title={text.length > maxLength ? text : undefined}>
      {truncated}
    </span>
  );
}
