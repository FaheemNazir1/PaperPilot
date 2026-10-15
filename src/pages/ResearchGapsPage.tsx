import React from 'react';
import { Lightbulb } from 'lucide-react';
import { ComingSoon } from '../components/common/ComingSoon';

export const ResearchGapsPage: React.FC = () => (
  <ComingSoon
    icon={Lightbulb}
    title="Research Gaps"
    headline="Coming soon"
    description="Automatic research-gap detection is not available yet."
    plannedTitle="Planned"
    planned={[
      'Surface open questions and limitations reported across your papers',
      'Suggest directions that are under-explored in your library',
    ]}
  />
);
