import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon, ConfirmModal, Screen } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { getInitials } from '../../utils/helpers';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList> };

const MENU = [
  { icon: 'clipboard-text-outline', label: 'My Orders', sub: 'Track & manage your orders', route: 'Orders' },
  { icon: 'map-marker-outline', label: 'Saved Addresses', sub: 'Manage delivery locations', route: 'Addresses' },
  { icon: 'heart-outline', label: 'Wishlist', sub: 'Your saved favourites', route: 'Wishlist' },
  { icon: 'account-edit-outline', label: 'Edit Profile', sub: 'Update your personal info', route: 'Profile' },
];

export function AccountScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { user, logout, isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const { ids } = useWishlist();
  const [showLogout, setShowLogout] = useState(false);

  const name = user?.name?.trim() || 'Guest User';
  const phone = user?.phone || '';
  const roleLabel = user?.userRole === 2 ? 'Business Account' : 'Retail Account';
  if (!isAuthenticated) {
    return (
      <Screen style={{ backgroundColor: colors.background }}>
        <View style={[styles.guestHero, { paddingHorizontal: spacing[5] }]}>
          <View style={[styles.guestEmoji, { backgroundColor: colors.surfaceElevated, borderRadius: radius.full }]}>
            <AppIcon name="account-circle-outline" color={colors.primary} size={50} />
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize['2xl'], marginTop: 20, textAlign: 'center' }}>
            Welcome to Ethnics Retail
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
            Sign in to access orders, wishlist, saved addresses and exclusive member benefits.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.getParent()?.navigate('Auth' as never)}
            style={[styles.signInBtn, { backgroundColor: colors.primary, borderRadius: radius.xl, marginTop: 28 }]}
          >
            <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base, letterSpacing: 0.5 }}>
              Sign In / Register
            </Text>
          </TouchableOpacity>
          <View style={[styles.promoRow, { marginTop: 36 }]}>
            {[{ icon: 'truck-fast-outline', t: 'Free Delivery' }, { icon: 'shield-check-outline', t: 'BIS Hallmarked' }, { icon: 'refresh', t: '7-Day Returns' }].map(p => (
              <View key={p.t} style={styles.promoItem}>
                <AppIcon name={p.icon as any} color={colors.primary} size={20} />
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10.5, marginTop: 4, textAlign: 'center' }}>{p.t}</Text>
              </View>
            ))}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* ── Hero Profile Card ── */}
        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroInner}>
            <View style={[styles.avatarLg, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.5)' }]}>
              <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: 28 }}>{getInitials(name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.xl }} numberOfLines={1}>{name}</Text>
              {phone ? (
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 3 }}>
                  +91 {phone}
                </Text>
              ) : null}
              <View style={[styles.rolePill, { backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 8 }]}>
                <Text style={{ color: '#fff', fontFamily: fontFamily.sansMedium, fontSize: 11 }}>{roleLabel}</Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View style={[styles.statsRow, { borderTopColor: 'rgba(255,255,255,0.2)' }]}>
            {[
              { label: 'Cart Items', value: String(totalItems) },
              { label: 'Wishlist', value: String(ids.size) },
              { label: 'Member', value: user?.userRole === 2 ? 'B2B' : 'Retail' },
            ].map((s, i) => (
              <View key={s.label} style={[styles.statItem, i < 2 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.xl }}>{s.value}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: fontFamily.sans, fontSize: 11, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Menu List ── */}
        <View style={[styles.section, { marginHorizontal: spacing[4], marginTop: spacing[4], backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
          {MENU.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => navigation.navigate(item.route as any)}
              activeOpacity={0.7}
              style={[styles.menuRow, idx < MENU.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
            >
              <View style={[styles.menuIcon, { backgroundColor: colors.surfaceElevated, borderRadius: radius.lg }]}>
                <AppIcon name={item.icon as any} color={colors.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>{item.label}</Text>
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 2 }}>{item.sub}</Text>
              </View>
              <AppIcon name="chevron-right" color={colors.textMuted} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Sign Out ── */}
        <TouchableOpacity
          onPress={() => setShowLogout(true)}
          style={[styles.logoutBtn, { marginHorizontal: spacing[4], marginTop: spacing[3], borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: radius.xl }]}
        >
          <AppIcon name="logout" color="#DC2626" size={18} />
          <Text style={{ color: '#DC2626', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Sign Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, textAlign: 'center', marginTop: 24 }}>
          Ethnics Retail v1.0 · EEAS Lifestyle
        </Text>

      </ScrollView>

      <ConfirmModal
        visible={showLogout}
        title="Sign out?"
        message="You will be signed out from your account on this device."
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        danger
        onCancel={() => setShowLogout(false)}
        onConfirm={async () => { setShowLogout(false); await logout(); }}
        icon={<AppIcon name="logout" color="#DC2626" size={22} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  guestHero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  guestEmoji: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  signInBtn: { paddingVertical: 15, paddingHorizontal: 40, alignItems: 'center', width: '100%' },
  promoRow: { flexDirection: 'row', width: '100%' },
  promoItem: { flex: 1, alignItems: 'center', gap: 2 },

  heroCard: { paddingTop: 52, paddingBottom: 0 },
  heroInner: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 20 },
  avatarLg: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rolePill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1 },
  statItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },

  section: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  menuIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1 },
});
