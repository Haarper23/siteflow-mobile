export const colors = {
  background: '#0B0F14',
  surface: '#121820',
  surfaceSecondary: '#18212B',
  primary: '#F5B942',
  primaryDark: '#D99A20',
  textPrimary: '#F4F6F8',
  textSecondary: '#98A4B3',
  border: '#26313D',
  success: '#36C98F',
  warning: '#F5B942',
  danger: '#F06464',
  // "At Risk" project status. A distinct amber, kept separate from `warning`
  // so the two can diverge without a cross-impact.
  atRisk: '#F5A623',
  white: '#FFFFFF',
  // Top stop of the branded startup/splash gradient (slightly above
  // `background`). Tokenized so the splash and theme stay in lockstep.
  gradientTop: '#0E131A',
} as const;

export type Color = (typeof colors)[keyof typeof colors];
