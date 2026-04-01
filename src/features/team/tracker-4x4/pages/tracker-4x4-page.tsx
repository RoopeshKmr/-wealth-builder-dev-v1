import { Block, NonIdealState } from '@/shared/components';

export default function Tracker4x4Page() {
  return (
    <div className="p-6">
      <Block
        title="4×4 Tracker"
        description="Track your 4×4 activity goals"
        className="mb-6"
      />
      <NonIdealState
        title="Coming Soon"
        description="The 4×4 tracker is under construction. Check back soon!"
        icon="📈"
      />
    </div>
  );
}
