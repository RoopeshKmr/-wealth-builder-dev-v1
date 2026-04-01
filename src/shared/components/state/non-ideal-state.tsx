import { type ReactNode } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Heading, Text } from '../ui/typography';

interface NonIdealStateProps {
  heading?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function NonIdealState({
  heading,
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: NonIdealStateProps) {
  const resolvedTitle = heading || title;

  return (
    <div
      className={[
        'rounded-lg border border-white/15 bg-white/5 p-6 text-center',
        className || '',
      ]
        .join(' ')
        .trim()}
    >
      {icon ? <div className="mb-3 flex justify-center text-2xl">{icon}</div> : null}
      <Heading as="h3" variant="h5" className="mb-2 text-white">{resolvedTitle}</Heading>
      {description ? <Text variant="small" className="text-gray-300">{description}</Text> : null}
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
