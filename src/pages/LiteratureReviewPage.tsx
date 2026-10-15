import React from 'react';
import { BookOpen } from 'lucide-react';
import { ComingSoon } from '../components/common/ComingSoon';

export const LiteratureReviewPage: React.FC = () => (
  <ComingSoon
    icon={BookOpen}
    title="Literature Review"
    headline="Coming soon"
    description="Automatic literature review generation is not available yet. For now, PaperPilot stores and organizes the papers you upload."
    plannedTitle="Planned"
    planned={[
      'Draft a structured review from the papers you select',
      'Citation-aware sections and reference lists',
      'Export for your preferred citation style',
    ]}
  />
);
