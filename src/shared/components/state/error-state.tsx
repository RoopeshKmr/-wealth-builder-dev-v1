import { NonIdealState } from './non-ideal-state';
import { Heading, Text } from '../ui/typography';

interface ErrorStateProps {
  pageHeading?: string;
  pageDescription?: string;
  title?: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  pageHeading,
  pageDescription,
  title = 'Something went wrong',
  description,
  retryLabel = 'Retry',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={className}>
      {pageHeading || pageDescription ? (
        <div className="mb-6">
          {pageHeading ? <Heading as="h1" variant="h4" weight="bold" className="mb-2">{pageHeading}</Heading> : null}
          {pageDescription ? <Text variant="muted" className="text-gray-400">{pageDescription}</Text> : null}
        </div>
      ) : null}

      <NonIdealState
        title={title}
        description={description}
        icon={<span aria-hidden>!</span>}
        actionLabel={onRetry ? retryLabel : undefined}
        onAction={onRetry}
      />
    </div>
  );
}
