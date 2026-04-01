import type { ReactNode } from 'react';
import { cn } from '@core/utils';
import { Heading, Text } from '../typography';

interface BlockProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
}

export function Block({
  title,
  description,
  actions,
  children,
  className,
  headerClassName,
}: BlockProps) {
  return (
    <section className={cn(className)}>
      {(title || description) && (
        <div className={cn('mb-6', headerClassName)}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            {title ? <Heading as="h1" variant="h4" weight="bold">{title}</Heading> : <span />}
            {actions}
          </div>
          {description ? <Text variant="muted" className="text-gray-400">{description}</Text> : null}
        </div>
      )}
      {children}
    </section>
  );
}
