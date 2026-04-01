import { Block, NonIdealState } from '@/shared/components';

export default function ProductionTrackerPage() {
  return (
    <div className="p-6">
      <Block
        title="Production Tracker"
        description="Monitor your team's production and revenue"
        className="mb-6"
      />
      <NonIdealState
        title="Coming Soon"
        description="The production tracker is under construction. Check back soon!"
        icon="💰"
      />
    </div>
  );
}
