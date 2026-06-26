import React from 'react';
import { render } from '@testing-library/react-native';
import StatusBadge from '@/src/components/StatusBadge';
import type { ProjectStatus } from '@/src/types/project';

// Accessibility guard (mobile-engineering.md: "do not communicate state using
// color alone"). Each project status must render a readable text label so that
// the state is perceivable without relying on the badge colour.

describe('StatusBadge', () => {
  it('renders a text label for the at-risk status (not colour-only)', async () => {
    const { getByText } = await render(<StatusBadge status="AT_RISK" />);
    expect(getByText('At Risk')).toBeTruthy();
  });

  it('renders a readable text label for every project status', async () => {
    const cases: { status: ProjectStatus; label: string }[] = [
      { status: 'ON_TRACK', label: 'On Track' },
      { status: 'AT_RISK', label: 'At Risk' },
      { status: 'DELAYED', label: 'Delayed' },
      { status: 'COMPLETED', label: 'Completed' },
    ];

    for (const { status, label } of cases) {
      const { getByText, unmount } = await render(<StatusBadge status={status} />);
      expect(getByText(label)).toBeTruthy();
      await unmount();
    }
  });
});
