/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, ScrollView, Share,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { AppIcon, Screen, useAppModal } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { addReview, fetchInvoiceByOrderId, fetchOrderDetails, fetchOrders } from '../../services/order';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'OrderDetail'>;
  route: RouteProp<MainStackParamList, 'OrderDetail'>;
};

function isDeliveredStatus(raw: string): boolean {
  return (raw ?? '').trim().toUpperCase().startsWith('DELIVER');
}

export function OrderDetailScreen({ navigation, route }: Props) {
  const { orderId } = route.params;
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { user } = useAuth();
  const { show } = useAppModal();

  // orderMeta = the flat order row from listing API (has date, amounts, address fields)
  const [orderMeta, setOrderMeta] = useState<any>(null);
  // items + estimationSummary from detail API
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  // invoice base64
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [submittingReview, setSubmittingReview] = useState<number | null>(null);
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; reviewText: string }>>({});

  useEffect(() => {
    if (!user) return;
    Promise.all([
      // detail API: { data: { items, tracking, estimationSummary } }
      fetchOrderDetails(orderId, user.id),
      // listing API to get the order meta row (date, amounts, address)
      fetchOrders(user.id),
    ]).then(([detailRes, listRes]) => {
      const detail = detailRes?.data ?? {};
      setItems(Array.isArray(detail.items) ? detail.items : []);
      setSummary(detail.estimationSummary ?? null);

      const list: any[] = Array.isArray(listRes?.data) ? listRes.data : [];
      const meta = list.find((o: any) => o.id === orderId) ?? null;
      setOrderMeta(meta);
    }).finally(() => setLoading(false));
  }, [orderId, user?.id]);

  useEffect(() => {
    if (!user || !orderId) return;
    setInvoiceLoading(true);
    fetchInvoiceByOrderId(orderId)
      .then(res => {
        // API: { status, message, data: { invoiceNumber, pdfBase64, mimeType } }
        setInvoice(res?.data ?? null);
      })
      .catch(() => setInvoice(null))
      .finally(() => setInvoiceLoading(false));
  }, [orderId, user?.id]);

  const handleDownloadInvoice = async () => {
    setDownloadingPdf(true);
    try {
      await Share.share({
        message: [
          `Invoice: ${invoiceNumber}`,
          `Order Date: ${orderDate}`,
          `Payment: ${isCOD ? 'Cash on Delivery' : 'Online'}`,
          `Subtotal: ₹${subtotal.toLocaleString('en-IN')}`,
          gst > 0 ? `GST: ₹${gst.toLocaleString('en-IN')}` : '',
          shipping > 0 ? `Shipping: ₹${shipping.toLocaleString('en-IN')}` : '',
          codCharges > 0 ? `COD Charges: ₹${codCharges.toLocaleString('en-IN')}` : '',
          `Total Paid: ₹${finalAmt.toLocaleString('en-IN')}`,
        ].filter(Boolean).join('\n'),
        title: `Invoice ${invoiceNumber}`,
      });
    } catch {
      show({ type: 'error', title: 'Share Failed', message: 'Could not share invoice.' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: colors.background }}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 12 }}>
            Loading order...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!orderMeta && items.length === 0) {
    return (
      <Screen style={{ backgroundColor: colors.background }}>
        <View style={styles.center}>
          <AppIcon name="package-variant" size={40} color={colors.primary} />
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg, marginTop: 12 }}>
            Order not found
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  // ── Derived values from exact API fields ──
  const isDelivered = isDeliveredStatus(orderMeta?.deliveryStatus ?? orderMeta?.status ?? '');
  const isCOD = orderMeta?.isCOD === 1 || orderMeta?.isCOD === true || orderMeta?.paymentMethod === 'Cash On Delivery';

  const orderDate = orderMeta?.createdAt
    ? new Date(orderMeta.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  // Price breakdown — from estimationSummary (most accurate) with fallback to orderMeta
  const subtotal   = Number(summary?.subtotal        ?? orderMeta?.totalAmount    ?? 0);
  const gst        = Number(summary?.gstAmount       ?? orderMeta?.gstAmount      ?? 0);
  const shipping   = Number(summary?.shippingCharge  ?? orderMeta?.shippingAmount ?? 0);
  const codCharges = Number(summary?.codCharges      ?? orderMeta?.codCharges     ?? 0);
  const finalAmt   = Number(summary?.finalAmount     ?? orderMeta?.finalAmount    ?? 0);
  const discount   = Number(orderMeta?.discount ?? orderMeta?.couponDiscount ?? 0);

  const invoiceNumber = invoice?.invoiceNumber ?? orderMeta?.invoiceNumber ?? `#${orderId}`;

  const shareOrder = async () => {
    await Share.share({
      message: [
        `Order #${invoiceNumber}`,
        `Total: ₹${finalAmt.toLocaleString('en-IN')}`,
        `Date: ${orderDate}`,
      ].join('\n'),
    });
  };

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: spacing[4], borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.full }]}
        >
          <AppIcon name="chevron-left" color={colors.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg }}>
          Order Details
        </Text>
        <TouchableOpacity
          onPress={shareOrder}
          style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.full }]}
        >
          <AppIcon name="share-variant-outline" color={colors.textPrimary} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 52 }}>

        {/* ── Order Summary ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, marginTop: 14 }]}>
          <View style={styles.row}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Order ID
              </Text>
              <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
                {invoiceNumber}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.metaGrid}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppIcon name="calendar-outline" color={colors.textMuted} size={12} />
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</Text>
              </View>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>{orderDate}</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppIcon name="credit-card-outline" color={colors.textMuted} size={12} />
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Payment</Text>
              </View>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>
                {isCOD ? 'Cash on Delivery' : 'Online'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Items ── */}
        {items.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base, marginBottom: 14 }}>
              Items ({items.length})
            </Text>
            {items.map((item: any, i: number) => {
              const pid = String(item.productId ?? i);
              const draft = reviewDrafts[pid] ?? { rating: 0, reviewText: '' };
              const itemPrice = Number(item.subtotal ?? item.price ?? 0);

              return (
                <View
                  key={i}
                  style={[styles.itemWrap, i < items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
                >
                  <View style={styles.itemRow}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={[styles.itemImg, { borderRadius: radius.lg }]} resizeMode="cover" />
                    ) : (
                      <View style={[styles.itemImg, { backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' }]}>
                        <AppIcon name="diamond-stone" size={22} color={colors.primary} />
                      </View>
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>
                        Qty: {item.quantity}
                      </Text>
                      <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>
                        ₹{itemPrice.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  {isDelivered && item.productId && (
                    <View style={[styles.reviewBox, { backgroundColor: colors.surfaceElevated, borderRadius: radius.lg }]}>
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansBold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                        Rate this item
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 10 }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <TouchableOpacity
                            key={star}
                            onPress={() => setReviewDrafts(prev => ({
                              ...prev,
                              [pid]: { ...(prev[pid] ?? { rating: 0, reviewText: '' }), rating: star },
                            }))}
                          >
                            <Text style={{ color: star <= draft.rating ? '#F59E0B' : colors.border, fontSize: 22 }}>★</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TextInput
                        value={draft.reviewText}
                        onChangeText={text => setReviewDrafts(prev => ({
                          ...prev,
                          [pid]: { ...(prev[pid] ?? { rating: 0, reviewText: '' }), reviewText: text },
                        }))}
                        placeholder="Share your experience (optional)..."
                        placeholderTextColor={colors.placeholder}
                        multiline
                        style={[styles.reviewInput, { borderColor: colors.border, color: colors.textPrimary, fontFamily: fontFamily.sans, backgroundColor: colors.surface, borderRadius: radius.md }]}
                      />
                      <TouchableOpacity
                        disabled={submittingReview === item.productId || draft.rating === 0}
                        onPress={async () => {
                          if (!draft.rating) return;
                          setSubmittingReview(item.productId);
                          try {
                            const res = await addReview({ productId: pid, userId: String(user?.id ?? ''), rating: draft.rating, reviewText: draft.reviewText.trim() });
                            const ok = res?.data?.status === 200 || res?.status === 200 || res?.success;
                            show({ type: ok ? 'success' : 'error', title: ok ? 'Review Added' : 'Error', message: ok ? 'Thanks for your feedback!' : 'Please try again.' });
                          } finally {
                            setSubmittingReview(null);
                          }
                        }}
                        style={[styles.reviewBtn, {
                          backgroundColor: draft.rating > 0 ? colors.primary : colors.border,
                          borderRadius: radius.md,
                          opacity: submittingReview === item.productId ? 0.7 : 1,
                        }]}
                      >
                        <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>
                          {submittingReview === item.productId ? 'Submitting...' : 'Submit Review'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Delivery Address ── */}
        {orderMeta?.line1 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AppIcon name="map-marker-outline" color={colors.primary} size={18} />
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
                Delivery Address
              </Text>
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>
              {orderMeta.line1}
            </Text>
            {orderMeta.line2 ? (
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 2 }}>
                {orderMeta.line2}
              </Text>
            ) : null}
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 2 }}>
              {[orderMeta.cityName, orderMeta.stateName, orderMeta.postal_code, orderMeta.countryName].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {/* ── Price Breakdown ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base, marginBottom: 14 }}>
            Price Breakdown
          </Text>
          {[
            { label: 'Subtotal',      value: subtotal,   show: subtotal > 0 },
            { label: 'GST',           value: gst,        show: gst > 0 },
            { label: 'Shipping',      value: shipping,   show: shipping > 0 },
            { label: 'COD Charges',   value: codCharges, show: codCharges > 0 },
            { label: 'Discount',      value: discount,   show: discount > 0, isDiscount: true },
          ].filter(r => r.show).map(r => (
            <View key={r.label} style={[styles.priceRow, { borderBottomColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>{r.label}</Text>
              <Text style={{ color: r.isDiscount ? '#16A34A' : colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>
                {r.isDiscount ? '−' : ''}₹{r.value.toLocaleString('en-IN')}
              </Text>
            </View>
          ))}
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Total Paid</Text>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xl }}>
              ₹{finalAmt.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* ── Invoice ── */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AppIcon name="receipt" color={colors.primary} size={18} />
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Invoice</Text>
          </View>

          {invoiceLoading ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <View style={{ gap: 2 }}>
              {[
                { label: 'Invoice No.',   value: invoiceNumber },
                { label: 'Total Amount',  value: `₹${finalAmt.toLocaleString('en-IN')}` },
                { label: 'Payment Mode',  value: isCOD ? 'Cash on Delivery' : 'Online Payment' },
                { label: 'Order Date',    value: orderDate },
              ].map(r => (
                <View key={r.label} style={[styles.priceRow, { borderBottomColor: colors.border }]}>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>{r.label}</Text>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>{r.value}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={handleDownloadInvoice}
            disabled={downloadingPdf || invoiceLoading}
            activeOpacity={0.85}
            style={[styles.downloadBtn, {
              backgroundColor: colors.primary + '12',
              borderColor: colors.primary + '40',
              borderRadius: radius.lg,
              marginTop: 16,
              opacity: downloadingPdf ? 0.6 : 1,
            }]}
          >
            {downloadingPdf
              ? <ActivityIndicator color={colors.primary} size="small" />
              : <AppIcon name="download-outline" color={colors.primary} size={18} />
            }
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>
              {downloadingPdf ? 'Preparing...' : 'Download Invoice'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 40, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: StyleSheet.hairlineWidth, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 14 },
  metaGrid: { flexDirection: 'row', gap: 16 },
  itemWrap: { paddingBottom: 14, marginBottom: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemImg: { width: 64, height: 64 },
  reviewBox: { marginTop: 12, padding: 12 },
  reviewInput: { minHeight: 68, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top', fontSize: 13, marginBottom: 10 },
  reviewBtn: { paddingVertical: 10, alignItems: 'center' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 4, borderTopWidth: 1.5 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderWidth: 1 },
});
