import type { Notification } from '@/src/types/notification';

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'High-Priority Issue Assigned',
    message: 'Concrete pour defect on Nova Residence Block A — Column C12 has been assigned to you for review.',
    time: '10 min ago',
    type: 'ISSUE',
    isRead: false,
  },
  {
    id: 'notif-2',
    title: 'Safety Checklist Due',
    message: 'Weekly safety checklist for Atlas Business Center is due today at 17:00. Please complete before end of shift.',
    time: '1 hour ago',
    type: 'SAFETY',
    isRead: false,
  },
  {
    id: 'notif-3',
    title: 'Approval Required',
    message: 'Defect repair on Nova Residence Floor 4 is awaiting your approval. Contractor is on standby.',
    time: '3 hours ago',
    type: 'APPROVAL',
    isRead: false,
  },
  {
    id: 'notif-4',
    title: 'Daily Report Submitted',
    message: 'Skyline Towers site manager Mert Demir submitted the daily progress report for both towers.',
    time: 'Yesterday, 18:05',
    type: 'REPORT',
    isRead: true,
  },
  {
    id: 'notif-5',
    title: 'Project Milestone Reached',
    message: 'Skyline Towers Tower A has reached 88% structural completion — on schedule for Q4 handover.',
    time: 'Yesterday, 14:30',
    type: 'MILESTONE',
    isRead: true,
  },
  {
    id: 'notif-6',
    title: 'Safety Alert Escalated',
    message: 'GreenPark Villas excavation edge protection has 4 open corrective actions. Deadline: tomorrow.',
    time: '2 days ago',
    type: 'SAFETY',
    isRead: true,
  },
];
