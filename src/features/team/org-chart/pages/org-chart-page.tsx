import { Block, NonIdealState } from '@/shared/components';

export default function OrgChartPage() {
  return (
    <div className="p-6">
      <Block
        title="Org Chart"
        description="Visualise your team hierarchy"
        className="mb-6"
      />
      <NonIdealState
        title="Coming Soon"
        description="The org-chart view is under construction. Check back soon!"
        icon="📊"
      />
    </div>
  );
}
