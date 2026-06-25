import { Tabs } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/src/theme/colors';

type TabIconProps = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focusedName: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  focused: boolean;
  size?: number;
};

function TabIcon({ name, focusedName, color, focused, size = 22 }: TabIconProps) {
  return <Ionicons name={focused ? focusedName : name} size={size} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" focusedName="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="business-outline" focusedName="business" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color, focused }) => (
            <View style={styles.reportIconWrapper}>
              <Ionicons
                name={focused ? 'add-circle' : 'add-circle-outline'}
                size={28}
                color={focused ? colors.primary : colors.textSecondary}
              />
            </View>
          ),
          tabBarLabel: ({ color }) => (
            <Text style={[styles.tabBarLabel, { color, marginBottom: 4 }]}>Report</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarBadge: 3,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="notifications-outline"
              focusedName="notifications"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" focusedName="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabBarItem: {
    paddingTop: 4,
  },
  badge: {
    backgroundColor: colors.danger,
    fontSize: 10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    lineHeight: 16,
  },
  reportIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
