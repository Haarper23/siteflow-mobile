export type NotificationType = 'ISSUE' | 'SAFETY' | 'APPROVAL' | 'REPORT' | 'MILESTONE';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: NotificationType;
  isRead: boolean;
}
