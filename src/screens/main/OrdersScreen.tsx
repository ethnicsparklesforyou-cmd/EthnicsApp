import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon, PageHeader, Screen } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fetchOrders } from '../../services/order';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Orders'> };

export function OrdersScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchOrders(user.id)
      .then(res => {
        const list = res?.data;
        setOrders(Array.isArray(list) ? list : []);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  if (!user) return null;

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <PageHeader
        title="My Orders"
        subtitle={!loading && orders.length > 0 ? `${orders.length} order${orders.length > 1 ? 's' : ''}` : undefined}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 12 }}>
            Loading your orders...
          </Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated, borderRadius: 40 }]}>
            <AppIcon name="package-variant-closed" color={colors.primary} size={38} />
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xl, marginTop: 20 }}>
            No orders yet
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
            Your order history will appear here once you place your first order.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('HomeTabs', { screen: 'Shop' } as any)}
            style={[styles.shopBtn, { backgroundColor: colors.primary, borderRadius: radius.xl, marginTop: 24 }]}
          >
            <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 48, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const date = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—';
            const amount = Number(item.finalAmount ?? item.totalAmount ?? 0);
            const isCOD = item.isCOD === 1 || item.isCOD === true || item.paymentMethod === 'Cash On Delivery';

            return (
              <TouchableOpacity
                onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
                activeOpacity={0.82}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}
              >
                {/* Order ID */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Order ID
                    </Text>
                    <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
                      #{item.invoiceNumber ?? item.id}
                    </Text>
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {/* Date + Amount */}
                <View style={styles.cardMid}>
                  <View style={{ gap: 5 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <AppIcon name="calendar-outline" color={colors.textMuted} size={12} />
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>{date}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <AppIcon name="truck-fast-outline" color={colors.textMuted} size={12} />
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>
                        {item.shippingPartner ?? 'Standard Delivery'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 5 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg }}>
                      ₹{amount.toLocaleString('en-IN')}
                    </Text>
                    <View style={[styles.payPill, { backgroundColor: isCOD ? '#FEF3C7' : '#EDE9FE', borderRadius: radius.sm }]}>
                      <Text style={{ color: isCOD ? '#92400E' : '#5B21B6', fontFamily: fontFamily.sansBold, fontSize: 10 }}>
                        {isCOD ? 'COD' : 'Online'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* CTA */}
                <View style={[styles.viewRow, { borderTopColor: colors.border }]}>
                  <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs }}>View Details</Text>
                  <AppIcon name="chevron-right" color={colors.primary} size={15} />
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  shopBtn: { paddingHorizontal: 32, paddingVertical: 14 },
  card: { borderWidth: StyleSheet.hairlineWidth, marginBottom: 14, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 14 },
  payPill: { paddingHorizontal: 8, paddingVertical: 3 },
  viewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
