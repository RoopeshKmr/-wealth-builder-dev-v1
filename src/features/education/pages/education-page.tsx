import { Heading, Text } from '@/shared/components';

export default function EducationPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h2">Education Center</Heading>
        <Text variant="body" className="text-muted-foreground">
          Access training materials and educational resources
        </Text>
      </div>
      
      <div className="text-center text-muted-foreground py-12">
        Educational content coming soon!
      </div>
    </div>
  );
}
