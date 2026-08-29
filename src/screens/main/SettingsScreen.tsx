import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon, ConfirmModal, PageHeader, Screen, useAppModal } from '../../components/common';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { deleteAccount, resetPassword } from '../../services/user';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Settings'> };

export function SettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { user, logout } = useAuth();
  const { show } = useAppModal();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  if (!user) {
    return (
      <Screen style={{ backgroundColor: colors.background }}>
        <PageHeader title="Security & Settings" onBack={() => navigation.goBack()} />
        <View style={styles.guestCenter}>
          <AppIcon name="shield-lock-outline" color={colors.primary} size={48} />
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg, marginTop: 16 }}>
            Sign In Required
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
            Please sign in to manage your account security and password.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('Auth' as never)}
            style={[styles.guestBtn, { backgroundColor: colors.primary, borderRadius: radius.xl, marginTop: 24 }]}
          >
            <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const handleSave = async () => {
    if (!user) return;
    if (form.newPassword.length < 6) {
      show({ type: 'warning', title: 'Too Short', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      show({ type: 'warning', title: 'Password Mismatch', message: 'New password and confirm password must match.' });
      return;
    }
    setLoading(true);
    try {
      await resetPassword(user.id, { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      show({ type: 'success', title: 'Password Updated', message: 'Your password has been changed successfully.' });
    } catch (e: any) {
      show({ type: 'error', title: 'Update Failed', message: e?.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setDeletingAccount(true);
    try {
      await deleteAccount(user.id);
      setShowDeleteModal(false);
      await logout();
      navigation.goBack();
      show({ type: 'success', title: 'Account Deleted', message: 'Your account has been deleted successfully.' });
    } catch {
      show({ type: 'error', title: 'Deletion Failed', message: 'Failed to delete account. Please try again.' });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <PageHeader title="Security & Settings" subtitle="Keep your account safe" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Header banner */}
        <View style={[styles.banner, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30', borderRadius: radius.xl, marginTop: 8 }]}>
          <AppIcon name="shield-lock-outline" color={colors.primary} size={30} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Change Password</Text>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 }}>
              Use a strong combination of letters, numbers and symbols.
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, marginTop: spacing[4] }]}>
          <View style={{ padding: 16 }}>
            <Input
              label="Current Password"
              value={form.currentPassword}
              onChangeText={v => setForm(s => ({ ...s, currentPassword: v }))}
              secureTextEntry
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              value={form.newPassword}
              onChangeText={v => setForm(s => ({ ...s, newPassword: v }))}
              secureTextEntry
              placeholder="Min. 6 characters"
            />
            <Input
              label="Confirm New Password"
              value={form.confirmPassword}
              onChangeText={v => setForm(s => ({ ...s, confirmPassword: v }))}
              secureTextEntry
              placeholder="Re-enter new password"
            />
            <Button label="Update Password" onPress={handleSave} loading={loading} />
          </View>
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.surfaceElevated, borderRadius: radius.xl, marginTop: spacing[4] }]}>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansBold, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Password Tips
          </Text>
          {[
            '• At least 8 characters long',
            '• Mix uppercase and lowercase letters',
            '• Include at least one number',
            '• Add a special character (!, @, #...)',
          ].map(tip => (
            <Text key={tip} style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, lineHeight: 20 }}>{tip}</Text>
          ))}
        </View>

        {/* Danger Zone */}
        <View style={[styles.dangerCard, { backgroundColor: colors.surface, borderColor: '#FCA5A5', borderRadius: radius.xl, marginTop: spacing[5], padding: 16 }]}>
          <Text style={{ color: '#DC2626', fontFamily: fontFamily.sansBold, fontSize: fontSize.sm, marginBottom: 4 }}>Delete Account</Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginBottom: 14, lineHeight: 18 }}>
            Permanently erase your account and all associated personal data. This cannot be undone.
          </Text>
          <TouchableOpacity
            onPress={() => setShowDeleteModal(true)}
            activeOpacity={0.8}
            style={[styles.dangerBtn, { borderColor: '#DC2626', borderRadius: radius.lg }]}
          >
            <AppIcon name="trash-can-outline" color="#DC2626" size={16} />
            <Text style={{ color: '#DC2626', fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>Delete Account</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Account?"
        message="Are you sure you want to permanently delete your account? All your profile data, addresses, wishlist, and cart will be erased."
        confirmLabel="Delete My Account"
        cancelLabel="Keep Account"
        danger
        loading={deletingAccount}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        icon={<AppIcon name="alert-circle-outline" color="#DC2626" size={22} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  guestCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  guestBtn: { paddingHorizontal: 32, paddingVertical: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1 },
  card: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  tipsCard: { padding: 16 },
  dangerCard: { borderWidth: 1 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderWidth: 1, backgroundColor: '#FEF2F2' },
});

