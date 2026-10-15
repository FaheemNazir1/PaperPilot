import React from 'react';
import { GitCompare } from 'lucide-react';
import { ComingSoon } from '../components/common/ComingSoon';

export const ComparePage: React.FC = () => (
  <ComingSoon
    icon={GitCompare}
    title="Compare Papers"
    headline="Coming soon"
    description="Side-by-side comparison of methods, datasets and results is not available yet."
    plannedTitle="Planned"
    planned={[
      'Compare methodology, datasets and reported results across papers',
      'Highlight where papers agree or disagree',
    ]}
  />
);
