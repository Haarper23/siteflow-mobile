import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type {
  WeatherCondition,
  WorkActivityStatus,
  EquipmentStatus,
} from '@/src/types/dailyReport';
import { colors } from '@/src/theme/colors';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface WeatherVisual {
  icon: MCIName;
  color: string;
}

const WEATHER_VISUALS: Record<WeatherCondition, WeatherVisual> = {
  SUNNY: { icon: 'weather-sunny', color: '#F5B942' },
  PARTLY_CLOUDY: { icon: 'weather-partly-cloudy', color: '#9FB4C7' },
  CLOUDY: { icon: 'weather-cloudy', color: '#9FB4C7' },
  RAINY: { icon: 'weather-rainy', color: '#5AA9FF' },
  STORMY: { icon: 'weather-lightning-rainy', color: '#B07CF5' },
  SNOWY: { icon: 'weather-snowy', color: '#CFE4FF' },
  WINDY: { icon: 'weather-windy', color: '#7FC8A9' },
};

export function getWeatherVisual(condition: WeatherCondition): WeatherVisual {
  return WEATHER_VISUALS[condition];
}

export function getActivityStatusColor(status: WorkActivityStatus): string {
  switch (status) {
    case 'NOT_STARTED':
      return colors.textSecondary;
    case 'IN_PROGRESS':
      return colors.primary;
    case 'COMPLETED':
      return colors.success;
    case 'BLOCKED':
      return colors.danger;
  }
}

export function getEquipmentStatusColor(status: EquipmentStatus): string {
  switch (status) {
    case 'ACTIVE':
      return colors.success;
    case 'IDLE':
      return colors.textSecondary;
    case 'MAINTENANCE':
      return colors.warning;
    case 'OUT_OF_SERVICE':
      return colors.danger;
  }
}
