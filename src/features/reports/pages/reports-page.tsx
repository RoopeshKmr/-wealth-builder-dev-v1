import { Heading, Text } from '@/shared/components';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h2">Reports</Heading>
        <Text variant="body" className="text-muted-foreground">
          View your performance reports and analytics
        </Text>
      </div>
      
      <div className="text-center text-muted-foreground py-12">
        No reports available yet.
      </div>
    </div>
  );
}
