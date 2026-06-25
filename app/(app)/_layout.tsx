import { Stack } from 'expo-router';
import { IssueProvider } from '@/src/context/IssueContext';
import { DailyReportProvider } from '@/src/context/DailyReportContext';
import { colors } from '@/src/theme/colors';

export default function AppLayout() {
  return (
    <IssueProvider>
      <DailyReportProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          <Stack.Screen name="projects/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="issues/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="issues/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="issues/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="daily-reports/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="daily-reports/new" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="daily-reports/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </DailyReportProvider>
    </IssueProvider>
  );
}
