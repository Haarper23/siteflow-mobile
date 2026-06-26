import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/src/theme/colors';
import { useAuth } from '@/src/context/AuthContext';

type SettingsIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface SettingsRow {
  id: string;
  label: string;
  icon: SettingsIconName;
}

const SETTINGS_ROWS: SettingsRow[] = [
  { id: 'account', label: 'Account Settings', icon: 'account-cog-outline' },
  { id: 'notifications', label: 'Notification Preferences', icon: 'bell-cog-outline' },
  { id: 'offline', label: 'Offline Data', icon: 'database-sync-outline' },
  { id: 'help', label: 'Help and Support', icon: 'help-circle-outline' },
  { id: 'about', label: 'About SiteFlow AI', icon: 'information-outline' },
];

function handleSettingPress(label: string) {
  Alert.alert(label, 'This settings page will be available in a future update.', [
    { text: 'OK', style: 'default' },
  ]);
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of SiteFlow AI?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          // Clear the local demo session, then return to login. `signOut` always
          // resolves (it clears in-memory auth even if secure deletion fails),
          // so navigation is guaranteed. Business records are left untouched.
          void signOut().then(() => router.replace('/login'));
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={[styles.profileHeader, { paddingTop: insets.top + 24 }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>BD</Text>
        </View>
        <Text style={styles.displayName}>Berke Deveci</Text>
        <Text style={styles.role}>Site Engineer</Text>
        <Text style={styles.email}>demo@siteflow.ai</Text>
      </View>

      {/* Account Info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account Information</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="office-building-outline" label="Company" value="SiteFlow Demo Construction" />
          <View style={styles.infoSep} />
          <InfoRow icon="badge-account-outline" label="Employee ID" value="SF-ENG-024" />
          <View style={styles.infoSep} />
          <InfoRow icon="briefcase-outline" label="Active Projects" value="4" />
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Settings</Text>
        <View style={styles.settingsCard}>
          {SETTINGS_ROWS.map((row, index) => (
            <React.Fragment key={row.id}>
              <TouchableOpacity
                style={styles.settingsRow}
                onPress={() => handleSettingPress(row.label)}
                activeOpacity={0.7}
              >
                <View style={styles.settingsRowIcon}>
                  <MaterialCommunityIcons name={row.icon} size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.settingsRowLabel}>{row.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.border} />
              </TouchableOpacity>
              {index < SETTINGS_ROWS.length - 1 && <View style={styles.settingsSep} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>SiteFlow AI v1.0.0 · Built for modern construction teams</Text>
      </View>
    </ScrollView>
  );
}

interface InfoRowProps {
  icon: SettingsIconName;
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.textSecondary} style={styles.infoRowIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 32,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 6,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.background,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  role: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  email: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  infoRowIcon: {
    flexShrink: 0,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    maxWidth: '50%',
    textAlign: 'right',
  },
  infoSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 46,
  },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingsRowIcon: {
    width: 32,
    alignItems: 'center',
  },
  settingsRowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  settingsSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 60,
  },
  logoutSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 20,
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 50,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger + '50',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  versionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
