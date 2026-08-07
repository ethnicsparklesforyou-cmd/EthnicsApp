import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppIcon, PageHeader, Screen, useAppModal } from '../../components/common';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { updateUser } from '../../services/user';
import { getInitials } from '../../utils/helpers';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Profile'> };

export function ProfileScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { user, updateUser: updateAuthUser } = useAuth();
  const { show } = useAppModal();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    if (user) setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateUser(user.id, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim(),
      });
      updateAuthUser({ name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() });
      setEditing(false);
      show({ type: 'success', title: 'Profile Updated', message: 'Your profile has been saved.' });
    } catch {
      show({ type: 'error', title: 'Update Failed', message: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = user.userRole === 2 ? 'Business Account' : 'Retail Account';

  const INFO_ROWS = [
    { icon: 'account-outline', label: 'Full Name', value: user.name || '—' },
    { icon: 'email-outline', label: 'Email', value: user.email || 'Not provided' },
    { icon: 'cellphone', label: 'Phone', value: user.phone ? `+91 ${user.phone}` : '—' },
    { icon: 'tag-outline', label: 'Account Type', value: roleLabel },
  ];

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <PageHeader
        title="Profile"
        subtitle="Your personal information"
        onBack={() => navigation.goBack()}
        actions={[{
          label: editing ? 'Cancel' : 'Edit',
          onPress: () => {
            if (editing) setForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' });
            setEditing(v => !v);
          },
          accessibilityLabel: editing ? 'Cancel editing' : 'Edit profile',
        }]}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Avatar Hero */}
        <View style={[styles.avatarCard, { backgroundColor: colors.surface, borderColor: colors.border, marginHorizontal: spacing[4], borderRadius: radius.xl, marginTop: 8 }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: 32 }}>
              {getInitials(user.name || 'U')}
            </Text>
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xl, marginTop: 14 }}>
            {user.name}
          </Text>
          <View style={[styles.rolePill, { backgroundColor: colors.primary + '18', borderRadius: radius.full, marginTop: 6 }]}>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs }}>{roleLabel}</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 8 }}>
            Member ID #{user.id}
          </Text>
        </View>

        {/* Info / Edit Card */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, marginHorizontal: spacing[4], marginTop: spacing[4], borderRadius: radius.xl }]}>
          {editing ? (
            <View style={{ padding: 16 }}>
              <Input label="Full Name" value={form.name} onChangeText={v => setForm(s => ({ ...s, name: v }))} />
              <Input label="Email Address" value={form.email} onChangeText={v => setForm(s => ({ ...s, email: v }))} keyboardType="email-address" autoCapitalize="none" />
              <Input label="Phone Number" value={form.phone} editable={false} keyboardType="phone-pad" />
              <Button label="Save Changes" onPress={handleSave} loading={loading} style={{ marginTop: 4 }} />
            </View>
          ) : (
            INFO_ROWS.map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  { borderBottomColor: colors.border },
                  i < INFO_ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth },
                ]}
              >
                <View style={[styles.infoIcon, { backgroundColor: colors.surfaceElevated, borderRadius: radius.md }]}>
                  <AppIcon name={row.icon as any} color={colors.primary} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {row.label}
                  </Text>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.base, marginTop: 3 }}>
                    {row.value}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarCard: { borderWidth: StyleSheet.hairlineWidth, padding: 24, alignItems: 'center' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  rolePill: { paddingHorizontal: 16, paddingVertical: 5 },
  infoCard: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  infoIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});
