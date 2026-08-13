import React, { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon, PageHeader, Screen, useAppModal } from '../../components/common';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { createAddress, deleteAddress, fetchAddresses, fetchStates, updateAddress } from '../../services/address';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Addresses'> };

const ADDR_TYPES: Record<string, { label: string; icon: React.ComponentProps<typeof AppIcon>['name']; color: string }> = {
  '1': { label: 'Home', icon: 'home-outline', color: '#3B82F6' },
  '2': { label: 'Work', icon: 'office-building-outline', color: '#8B5CF6' },
  '3': { label: 'Other', icon: 'map-marker-outline', color: '#F59E0B' },
};

export function AddressesScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { user } = useAuth();
  const { show } = useAppModal();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ Addtype: '1', line1: '', line2: '', cityName: '', stateId: '', postal_code: '' });

  const refresh = async () => {
    if (!user) return;
    const a = await fetchAddresses(user.id);
    const d = a?.data?.data ?? a?.data ?? a?.result?.data ?? a?.result ?? [];
    setAddresses(Array.isArray(d) ? d : []);
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchAddresses(user.id), fetchStates()]).then(([a, s]) => {
      const addrData = a?.data?.data ?? a?.data ?? a?.result?.data ?? a?.result ?? [];
      const stateData = s?.data?.data ?? s?.data ?? s?.result?.data ?? s?.result ?? [];
      setAddresses(Array.isArray(addrData) ? addrData : []);
      setStates(Array.isArray(stateData) ? stateData : []);
    });
  }, [user]);

  if (!user) return null;

  const resetForm = () => {
    setForm({ Addtype: '1', line1: '', line2: '', cityName: '', stateId: '', postal_code: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.line1.trim() || !form.cityName.trim() || !form.postal_code.trim()) {
      show({ type: 'warning', title: 'Missing Fields', message: 'Please fill in Address Line 1, City, and Postal Code.' });
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, userId: user.id, stateId: Number(form.stateId), Addtype: Number(form.Addtype), countryId: 1, createdBy: user.id, updatedBy: user.id };
      if (editing) await updateAddress(editing.id, payload);
      else await createAddress(payload);
      await refresh();
      resetForm();
      show({ type: 'success', title: 'Saved', message: editing ? 'Address updated.' : 'Address added.' });
    } catch {
      show({ type: 'error', title: 'Save Failed', message: 'Failed to save address. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (address: any) => {
    setEditing(address);
    setForm({
      Addtype: String(address.AddTypeId ?? address.Addtype ?? 1),
      line1: address.line1 || '',
      line2: address.line2 || '',
      cityName: address.cityName || '',
      stateId: String(address.stateId ?? ''),
      postal_code: address.postal_code || '',
    });
    setShowForm(true);
  };

  const handleSetDefault = async (address: any) => {
    setLoading(true);
    try {
      await updateAddress(address.id, { ...address, isDefault: true, userId: user.id });
      await refresh();
      show({ type: 'success', title: 'Default Updated', message: 'Set as default delivery address.' });
    } catch {
      show({ type: 'error', title: 'Update Failed', message: 'Failed to set default address.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    show({
      type: 'confirm',
      title: 'Delete Address',
      message: 'Remove this address from your account?',
      actions: [
        { label: 'Cancel', onPress: () => { }, variant: 'outline' },
        {
          label: 'Delete', variant: 'danger', onPress: async () => {
            setLoading(true);
            try {
              await deleteAddress(id);
              await refresh();
              show({ type: 'success', title: 'Deleted', message: 'Address removed.' });
            } catch {
              show({ type: 'error', title: 'Delete Failed', message: 'Failed to delete address.' });
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    });
  };

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <PageHeader
        title="Addresses"
        subtitle={addresses.length > 0 ? `${addresses.length} saved address${addresses.length > 1 ? 'es' : ''}` : 'Manage delivery locations'}
        onBack={() => navigation.goBack()}
        actions={[{ label: '+ Add', onPress: () => { resetForm(); setShowForm(true); }, accessibilityLabel: 'Add address' }]}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* ── Form Sheet ── */}
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, marginBottom: spacing[4], marginTop: 8 }]}>
            <View style={[styles.formHeader, { borderBottomColor: colors.border }]}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
                {editing ? 'Edit Address' : 'New Address'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <AppIcon name="close" color={colors.textMuted} size={20} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              {/* Address Type Selector */}
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Address Type
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                {Object.entries(ADDR_TYPES).map(([key, t]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setForm(s => ({ ...s, Addtype: key }))}
                    style={[styles.typeBtn, {
                      borderColor: form.Addtype === key ? t.color : colors.border,
                      backgroundColor: form.Addtype === key ? t.color + '15' : colors.surfaceElevated,
                      borderRadius: radius.lg,
                    }]}
                  >
                    <AppIcon name={t.icon} color={form.Addtype === key ? t.color : colors.textMuted} size={16} />
                    <Text style={{ color: form.Addtype === key ? t.color : colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input label="Address Line 1 *" value={form.line1} onChangeText={v => setForm(s => ({ ...s, line1: v }))} placeholder="House/Flat no, Street" />
              <Input label="Address Line 2" value={form.line2} onChangeText={v => setForm(s => ({ ...s, line2: v }))} placeholder="Area, Landmark (optional)" />
              <Input label="City *" value={form.cityName} onChangeText={v => setForm(s => ({ ...s, cityName: v }))} placeholder="City" />
              <Input label="Postal Code *" value={form.postal_code} onChangeText={v => setForm(s => ({ ...s, postal_code: v }))} keyboardType="number-pad" placeholder="6-digit PIN code" maxLength={6} />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button label={editing ? 'Update' : 'Save Address'} onPress={handleSave} loading={loading} style={{ flex: 1 }} />
                <Button label="Cancel" onPress={resetForm} variant="outline" style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        )}

        {/* ── Empty State ── */}
        {addresses.length === 0 && !showForm ? (
          <View style={styles.emptyWrap}>
            <AppIcon name="map-marker-outline" color={colors.primary} size={42} />
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xl, marginTop: 16 }}>
              No saved addresses
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
              Add a delivery address to speed up your checkout experience.
            </Text>
            <TouchableOpacity
              onPress={() => setShowForm(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary, borderRadius: radius.xl, marginTop: 24 }]}
            >
              <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>+ Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={addresses}
            keyExtractor={item => String(item.id)}
            scrollEnabled={false}
            contentContainerStyle={{ gap: 12, paddingTop: showForm ? 0 : 8 }}
            renderItem={({ item }) => {
              const typeKey = String(item.AddTypeId ?? item.Addtype ?? 1);
              const t = ADDR_TYPES[typeKey] || ADDR_TYPES['1'];
              return (
                <View style={[styles.addrCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
                  <View style={styles.addrTop}>
                    <View style={[styles.typeBadge, { backgroundColor: t.color + '18', borderRadius: radius.sm }]}>
                      <AppIcon name={t.icon} color={t.color} size={13} />
                      <Text style={{ color: t.color, fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>{t.label}</Text>
                    </View>
                    {item.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: '#DCFCE7', borderRadius: radius.sm }]}>
                        <Text style={{ color: '#166534', fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>✓ Default</Text>
                      </View>
                    )}
                  </View>

                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.base, marginTop: 10 }}>
                    {item.line1}
                  </Text>
                  {item.line2 ? (
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 2 }}>{item.line2}</Text>
                  ) : null}
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 2 }}>
                    {[item.cityName, item.postal_code].filter(Boolean).join(' — ')}
                  </Text>

                  <View style={[styles.addrActions, { borderTopColor: colors.border }]}>
                    {!item.isDefault && (
                      <>
                        <TouchableOpacity onPress={() => handleSetDefault(item)} style={styles.actionBtn}>
                          <AppIcon name="check-circle-outline" color={colors.primary} size={14} />
                          <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>Make Default</Text>
                        </TouchableOpacity>
                        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
                      </>
                    )}
                    <TouchableOpacity onPress={() => startEdit(item)} style={styles.actionBtn}>
                      <AppIcon name="pencil-outline" color={colors.primary} size={14} />
                      <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>Edit</Text>
                    </TouchableOpacity>
                    <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn}>
                      <AppIcon name="delete-outline" color={colors.error} size={14} />
                      <Text style={{ color: colors.error, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formCard: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1.5 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  addBtn: { paddingHorizontal: 32, paddingVertical: 14 },
  addrCard: { borderWidth: StyleSheet.hairlineWidth, padding: 16, overflow: 'hidden' },
  addrTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 4 },
  addrActions: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
});
