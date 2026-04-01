import { Heading, Text } from '../ui/typography';

interface LoadingStateProps {
  pageHeading?: string;
  pageDescription?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function LoadingState({
  pageHeading,
  pageDescription,
  title = 'Loading',
  description = 'Please wait...',
  className,
}: LoadingStateProps) {
  return (
    <div className={className}>
      {pageHeading || pageDescription ? (
        <div className="mb-6">
          {pageHeading ? <Heading as="h1" variant="h4" weight="bold" className="mb-2">{pageHeading}</Heading> : null}
          {pageDescription ? <Text variant="muted" className="text-gray-400">{pageDescription}</Text> : null}
        </div>
      ) : null}

      <div className="flex flex-col items-center justify-center py-12">
        <div className="mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[#ffdd45]" />
        <Text variant="large" weight="medium" className="text-white">{title}</Text>
        <Text variant="muted" className="mt-1 text-gray-400">{description}</Text>
      </div>
    </div>
  );
}
