import React from 'react';
import { Bot } from 'lucide-react';
import { ComingSoon } from '../components/common/ComingSoon';

/**
 * The AI assistant is not implemented. This route is kept stable so the real
 * chat experience can replace this placeholder later.
 */
export const AssistantPage: React.FC = () => (
  <ComingSoon
    icon={Bot}
    title="AI Assistant"
    state="maintenance"
    headline="Under maintenance"
    description="We're preparing PaperPilot's research assistant to help you explore scientific papers, compare findings and investigate research questions."
    note="Chat-based research assistance is coming in a future update."
    plannedTitle="Planned capabilities"
    planned={[
      'Ask questions about the papers in your library',
      'Compare findings across papers',
      'Answers that cite the passages they come from',
    ]}
  />
);
