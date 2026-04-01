import { Block, NonIdealState } from '@/shared/components';

export default function AssociateTrackerPage() {
  return (
    <div className="p-6">
      <Block
        title="Associate Tracker"
        description="Monitor your associates' activity and progress"
        className="mb-6"
      />
      <NonIdealState
        title="Coming Soon"
        description="The associate tracker is under construction. Check back soon!"
        icon="👔"
      />
    </div>
  );
}
