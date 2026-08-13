import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppIcon } from './AppIcon';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAddresses, updateAddress } from '../../services/address';

export const LOCATION_STORAGE_KEY = '@user_selected_location';

interface LocationSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (label: string) => void;
  onAddNewAddress: () => void;
}

const ADDR_TYPES: Record<string, { label: string; icon: React.ComponentProps<typeof AppIcon>['name']; color: string }> = {
  '1': { label: 'Home', icon: 'home-outline', color: '#3B82F6' },
  '2': { label: 'Work', icon: 'office-building-outline', color: '#8B5CF6' },
  '3': { label: 'Other', icon: 'map-marker-outline', color: '#F59E0B' },
};

export function LocationSelectModal({
  visible,
  onClose,
  onSelectLocation,
  onAddNewAddress,
}: LocationSelectModalProps) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, radius, spacing } = theme;
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAddrId, setSelectedAddrId] = useState<number | null>(null);

  useEffect(() => {
    if (visible && user?.id) {
      setLoading(true);
      fetchAddresses(user.id)
        .then((res: any) => {
          const list = res?.data?.data ?? res?.data ?? res?.result?.data ?? res?.result ?? [];
          const addrList = Array.isArray(list) ? list : [];
          setAddresses(addrList);

          const defaultAddr = addrList.find((a: any) => a.isDefault || a.is_default || String(a.isDefault) === '1');
          if (defaultAddr) {
            setSelectedAddrId(defaultAddr.id);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible, user?.id]);

  const handleSelectAddress = async (item: any) => {
    setSelectedAddrId(item.id);
    const line1 = (item.line1 || item.addressLine1 || item.address_line1 || '').trim();
    const city = (item.cityName || item.city || '').trim();
    const state = (item.stateName || item.state_name || item.state || '').trim();
    const postal = String(item.postal_code || item.pincode || '').trim();

    let label = 'Select Location';
    if (line1 && city) label = `${line1}, ${city}`;
    else if (line1 && postal) label = `${line1}, ${postal}`;
    else if (city && state) label = `${city}, ${state}`;
    else if (city && postal) label = `${city} - ${postal}`;
    else if (city) label = city;
    else if (postal) label = `PIN ${postal}`;

    // Update backend to set as default address
    if (user?.id && item.id) {
      updateAddress(item.id, { ...item, isDefault: true, userId: user.id }).catch(() => {});
    }

    // Persist locally
    await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ label, addressId: item.id })).catch(() => {});
    onSelectLocation(label);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            },
          ]}
          onPress={e => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
                <AppIcon name="map-marker" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 18 }}>
                  Select Location
                </Text>
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 12, marginTop: 1 }}>
                  Choose delivery address for accurate availability
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}>
              <AppIcon name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 36 }}>
            {/* ── Saved Delivery Addresses ── */}
            <View style={{ marginTop: 12 }}>
              <View style={styles.sectionHeader}>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 14 }}>
                  Saved Delivery Addresses
                </Text>
                <TouchableOpacity onPress={onAddNewAddress}>
                  <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 13 }}>
                    + Add New
                  </Text>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} size="small" />
                </View>
              ) : addresses.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border, borderRadius: radius.lg }]}>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 13, textAlign: 'center' }}>
                    No saved addresses found.
                  </Text>
                  <TouchableOpacity onPress={onAddNewAddress} style={[styles.addInlineBtn, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 13 }}>+ Add Address</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {addresses.map(item => {
                    const isSelected = selectedAddrId === item.id || item.isDefault;
                    const typeKey = String(item.AddTypeId ?? item.Addtype ?? 1);
                    const t = ADDR_TYPES[typeKey] || ADDR_TYPES['1'];

                    return (
                      <TouchableOpacity
                        key={String(item.id)}
                        onPress={() => handleSelectAddress(item)}
                        activeOpacity={0.8}
                        style={[
                          styles.addrCard,
                          {
                            backgroundColor: isSelected ? colors.primary + '0D' : colors.surfaceElevated,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderRadius: radius.lg,
                          },
                        ]}
                      >
                        <View style={styles.radioOuter}>
                          <View
                            style={[
                              styles.radioCircle,
                              { borderColor: isSelected ? colors.primary : colors.border },
                            ]}
                          >
                            {isSelected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                          </View>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.addrRowTop}>
                            <View style={[styles.typeBadge, { backgroundColor: t.color + '18' }]}>
                              <AppIcon name={t.icon} color={t.color} size={12} />
                              <Text style={{ color: t.color, fontFamily: fontFamily.sansBold, fontSize: 11 }}>{t.label}</Text>
                            </View>
                            {isSelected && (
                              <View style={[styles.defaultBadge, { backgroundColor: '#DCFCE7' }]}>
                                <Text style={{ color: '#166534', fontFamily: fontFamily.sansBold, fontSize: 10 }}>✓ Default</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 14, marginTop: 6 }} numberOfLines={1}>
                            {item.line1}
                          </Text>
                          {item.line2 ? (
                            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                              {item.line2}
                            </Text>
                          ) : null}
                          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 12, marginTop: 2 }}>
                            {[item.cityName, item.postal_code].filter(Boolean).join(' — ')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 24 : 12 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  emptyBox: { borderWidth: 1, borderStyle: 'dashed', padding: 20, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  addInlineBtn: { marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18 },
  addrCard: { flexDirection: 'row', borderWidth: 1.5, padding: 14, gap: 12, alignItems: 'flex-start' },
  radioOuter: { paddingTop: 2 },
  radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 4.5 },
  addrRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
});
