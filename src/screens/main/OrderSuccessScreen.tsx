import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon, Screen } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'OrderSuccess'>;
  route: RouteProp<MainStackParamList, 'OrderSuccess'>;
};

export function OrderSuccessScreen({ navigation, route }: Props) {
  const { invoiceNumber, orderId, isCod } = route.params;
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <View style={[styles.container, { paddingHorizontal: spacing[5] }]}>

        {/* Success animation circle */}
        <View style={[styles.successCircle, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
          <View style={[styles.innerCircle, { backgroundColor: '#DCFCE7', borderColor: '#4ADE80' }]}>
            <AppIcon name="check" color="#166534" size={34} />
          </View>
        </View>

        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize['2xl'], marginTop: 24, textAlign: 'center' }}>
          Order Placed!
        </Text>
        <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          {isCod
            ? 'Your order is confirmed. Keep the exact amount ready when it arrives.'
            : 'Payment received. Your order is being prepared with care.'}
        </Text>

        {/* Order card */}
        <View style={[styles.orderCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, marginTop: 28 }]}>
          <View style={styles.orderRow}>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>Order ID</Text>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>#{invoiceNumber}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.orderRow}>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>Payment</Text>
            <View style={[styles.payPill, { backgroundColor: isCod ? '#FFFBEB' : '#EFF6FF', borderRadius: radius.sm }]}>
              <Text style={{ color: isCod ? '#92400E' : '#1E40AF', fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>
                {isCod ? 'Cash on Delivery' : 'Online Payment'}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.orderRow}>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>Status</Text>
            <View style={[styles.payPill, { backgroundColor: '#DBEAFE', borderRadius: radius.sm }]}>
              <Text style={{ color: '#1E40AF', fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>CONFIRMED</Text>
            </View>
          </View>
        </View>

        {/* Feature pills */}
        <View style={[styles.featureRow, { marginTop: 24 }]}>
          {[
            { icon: 'email-outline', text: 'Confirmation\nEmail Sent' },
            { icon: 'truck-fast-outline', text: 'Express\nDelivery' },
            { icon: 'bell-outline', text: 'Live\nTracking' },
          ].map(f => (
            <View key={f.text} style={[styles.featurePill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.lg }]}>
              <AppIcon name={f.icon as any} color={colors.primary} size={18} />
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, textAlign: 'center', marginTop: 4, lineHeight: 14 }}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={{ gap: 12, marginTop: 32, width: '100%' }}>
          <TouchableOpacity
            onPress={() => navigation.replace('Orders')}
            style={[styles.btn, { backgroundColor: colors.primary, borderRadius: radius.xl }]}
          >
            <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Track My Order</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('HomeTabs', { screen: 'Shop' } as any)}
            style={[styles.btn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.xl }]}
          >
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.base }}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  successCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  innerCircle: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  orderCard: { width: '100%', borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  divider: { height: StyleSheet.hairlineWidth },
  payPill: { paddingHorizontal: 10, paddingVertical: 4 },
  featureRow: { flexDirection: 'row', gap: 10, width: '100%' },
  featurePill: { flex: 1, alignItems: 'center', paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth },
  btn: { paddingVertical: 15, alignItems: 'center' },
});
