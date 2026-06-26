import React from 'react';
import { render } from '@testing-library/react-native';
import IssueStatusBadge from '@/src/components/IssueStatusBadge';
import SeverityBadge from '@/src/components/SeverityBadge';

// Accessibility guard (mobile-engineering.md: "do not communicate state using
// color alone"). These assert the badges expose readable text — not just a
// colour — so colourblind / low-vision users can perceive the state.

describe('IssueStatusBadge', () => {
  it('renders the status as readable text, not colour alone', async () => {
    const { getByText } = await render(<IssueStatusBadge status="IN_PROGRESS" />);
    expect(getByText('In Progress')).toBeTruthy();
  });

  it('exposes the status to assistive technology with a textual label', async () => {
    const { getByLabelText } = await render(<IssueStatusBadge status="RESOLVED" />);
    expect(getByLabelText('Status: Resolved')).toBeTruthy();
  });
});

describe('SeverityBadge', () => {
  it('renders the severity as readable text, not colour alone', async () => {
    const { getByText } = await render(<SeverityBadge severity="CRITICAL" />);
    expect(getByText('Critical')).toBeTruthy();
  });

  it('exposes the severity to assistive technology with a textual label', async () => {
    const { getByLabelText } = await render(<SeverityBadge severity="LOW" />);
    expect(getByLabelText('Severity: Low')).toBeTruthy();
  });
});
