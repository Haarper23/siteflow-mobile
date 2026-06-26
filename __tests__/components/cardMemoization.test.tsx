import React from 'react';
import { render, act } from '@testing-library/react-native';
import IssueCard from '@/src/components/IssueCard';
import DailyReportCard from '@/src/components/DailyReportCard';
import ProjectCard from '@/src/components/ProjectCard';
import type { Project } from '@/src/types/project';
import { makeIssue, makeReport } from '../fixtures';

// List rows are wrapped in React.memo so a row re-renders only when its own
// props change (audit §15). These tests lock in both that the rows are memoized
// and — crucially — that memoization does not stop them updating when a
// meaningful prop actually changes.

const MEMO = Symbol.for('react.memo');

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    name: 'Nova Residence',
    code: 'NR-2026-01',
    city: 'Istanbul',
    district: 'Kadıköy',
    address: '1 Demo Street',
    progress: 42,
    status: 'ON_TRACK',
    openIssueCount: 3,
    overdueTaskCount: 1,
    safetyAlertCount: 0,
    activeWorkerCount: 24,
    managerName: 'Demo Manager',
    startDate: '2026-01-01',
    targetDate: '2026-12-31',
    description: 'A demo project.',
    blocks: [],
    recentActivity: [],
    ...overrides,
  };
}

describe('list row memoization', () => {
  it('exports memoized card components', () => {
    expect((IssueCard as unknown as { $$typeof: symbol }).$$typeof).toBe(MEMO);
    expect((DailyReportCard as unknown as { $$typeof: symbol }).$$typeof).toBe(MEMO);
    expect((ProjectCard as unknown as { $$typeof: symbol }).$$typeof).toBe(MEMO);
  });

  it('IssueCard still re-renders when a meaningful prop changes', async () => {
    const { getByText, rerender, queryByText } = await render(
      <IssueCard issue={makeIssue({ title: 'First title' })} projectName="Nova" onPress={() => {}} />,
    );
    expect(getByText('First title')).toBeTruthy();

    await act(async () => {
      rerender(
        <IssueCard issue={makeIssue({ title: 'Second title' })} projectName="Nova" onPress={() => {}} />,
      );
    });
    expect(queryByText('First title')).toBeNull();
    expect(getByText('Second title')).toBeTruthy();
  });

  it('DailyReportCard still re-renders when a meaningful prop changes', async () => {
    const { getByText, rerender } = await render(
      <DailyReportCard report={makeReport()} projectName="Nova Residence" onPress={() => {}} />,
    );
    expect(getByText('Nova Residence')).toBeTruthy();

    await act(async () => {
      rerender(
        <DailyReportCard report={makeReport()} projectName="Atlas Center" onPress={() => {}} />,
      );
    });
    expect(getByText('Atlas Center')).toBeTruthy();
  });

  it('ProjectCard still re-renders when a meaningful prop changes', async () => {
    const { getByText, rerender } = await render(
      <ProjectCard project={makeProject({ name: 'Nova Residence' })} onPress={() => {}} />,
    );
    expect(getByText('Nova Residence')).toBeTruthy();

    await act(async () => {
      rerender(<ProjectCard project={makeProject({ name: 'Skyline Towers' })} onPress={() => {}} />);
    });
    expect(getByText('Skyline Towers')).toBeTruthy();
  });
});
