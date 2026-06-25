import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IssueCategory } from '@/src/types/issue';
import { colors } from '@/src/theme/colors';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface CategoryVisual {
  icon: MCIName;
  color: string;
}

const CATEGORY_VISUALS: Record<IssueCategory, CategoryVisual> = {
  STRUCTURAL: { icon: 'home-city-outline', color: '#F5894A' },
  ELECTRICAL: { icon: 'flash-outline', color: colors.warning },
  PLUMBING: { icon: 'water-outline', color: '#5AA9FF' },
  FINISHING: { icon: 'format-paint', color: '#B07CF5' },
  SAFETY: { icon: 'shield-alert-outline', color: colors.danger },
  MATERIAL: { icon: 'package-variant-closed', color: colors.success },
  OTHER: { icon: 'dots-horizontal-circle-outline', color: colors.textSecondary },
};

export function getCategoryVisual(category: IssueCategory): CategoryVisual {
  return CATEGORY_VISUALS[category];
}
