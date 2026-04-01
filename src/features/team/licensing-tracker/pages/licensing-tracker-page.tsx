import { Block, NonIdealState } from '@/shared/components';

export default function LicensingTrackerPage() {
  return (
    <div className="p-6">
      <Block
        title="Licensing Tracker"
        description="Track your team's licensing progress"
        className="mb-6"
      />
      <NonIdealState
        title="Coming Soon"
        description="The licensing tracker is under construction. Check back soon!"
        icon="📝"
      />
    </div>
  );
}
