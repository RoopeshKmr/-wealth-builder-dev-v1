import { Heading, Text } from '@/shared/components';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <Heading as="h1" variant="h2">Settings</Heading>
        <Text variant="body" className="text-muted-foreground">
          Manage your account settings and preferences
        </Text>
      </div>
      
      <div className="text-center text-muted-foreground py-12">
        Settings panel coming soon!
      </div>
    </div>
  );
}
