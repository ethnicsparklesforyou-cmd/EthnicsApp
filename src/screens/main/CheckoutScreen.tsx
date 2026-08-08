import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppIcon, PageHeader, Screen } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAddresses, createAddress } from '../../services/address';
import { fetchCartEstimation, applyCoupon, clearServerCart, normalizeCartEstimationResponse, fetchServerCart } from '../../services/cart';
import { fetchActiveCoupons } from '../../services/products';
import { verifyContactCheckout, verifyEmailCheckout, checkoutOrder, cancelPayment, createCodChargeOrder } from '../../services/order';
import { getFirstImageUrl } from '../../utils/imageUtils';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

import RazorpayCheckout from 'react-native-razorpay';

const RAZORPAY_KEY = 'rzp_live_SFvkkQiyUi8jlv';

const show = ({ title, message }: { type?: string; title: string; message: string }) => {
  Alert.alert(title, message);
};

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Checkout'> };

type Address = { id: number; line1: string; line2?: string; cityName: string; postal_code: string; AddType: string };

function getPostalCode(addr: any) {
  return String(
    addr?.postal_code ??
    addr?.postalCode ??
    addr?.pincode ??
    addr?.pinCode ??
    addr?.zipCode ??
    '',
  ).trim();
}

function unwrapList<T>(res: any): T[] {
  const data = res?.data ?? res?.result ?? res?.payload ?? res;
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
}

function getCouponDiscountFromResponse(res: any) {
  const body = res?.data ?? res?.result ?? res?.payload ?? res;
  const payload = body?.data ?? body?.coupon ?? body?.couponData ?? body?.result ?? body?.payload ?? body;
  return Number(
    payload?.discountAmount ??
    payload?.discount_amount ??
    payload?.discount ??
    payload?.amount ??
    payload?.couponDiscount ??
    0,
  );
}

export function CheckoutScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { items, clearCart } = useCart();
  const { user, token } = useAuth();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [estimation, setEstimation] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponTotal, setAppliedCouponTotal] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [showCouponList, setShowCouponList] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const [giftingItemKeys, setGiftingItemKeys] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const [processingCodCharge, setProcessingCodCharge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAddress, setHasAddress] = useState(false);
  const [serverItems, setServerItems] = useState<any[]>([]);
  const [form, setForm] = useState<{ line1: string; line2: string; cityName: string; postal_code: string; Addtype: string }>({ line1: '', line2: '', cityName: '', postal_code: '', Addtype: '1' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getGiftKey = (item: any) => String(item.cartItemId ?? item.id ?? item.productId);

  const refreshEstimation = async (pincode?: string) => {
    if (!user?.id) return;
    const res = await fetchCartEstimation(user.id, pincode).catch(() => null);
    const nextEstimation = normalizeCartEstimationResponse(res);
    if (nextEstimation) setEstimation({ ...nextEstimation, addressFound: Boolean(pincode) });
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    const userType = (user?.userRole === 2 || user?.roleName === 'B2b Customer') ? 'b2b' : 'retail';
    fetchActiveCoupons(userType).then(res => {
      const coupons = unwrapList<any>(res);
      setAvailableCoupons(coupons);
    }).catch(() => {});
  }, [user?.id, user?.userRole, user?.roleName]);

  useEffect(() => {
    if (!user?.id || items.length === 0) return;
    const pin = selectedAddress ? getPostalCode(selectedAddress) : undefined;
    const timer = setTimeout(() => {
      void refreshEstimation(pin);
    }, 250);
    return () => clearTimeout(timer);
  }, [user?.id, items.length, selectedAddress?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [addrRes, cartRes] = await Promise.allSettled([
        fetchAddresses(user!.id),
        fetchServerCart(user!.id),
      ]);

      // Populate full server items for display
      if (cartRes.status === 'fulfilled') {
        const raw = cartRes.value;
        let arr: any[] = [];
        if (Array.isArray(raw?.data?.data)) arr = raw.data.data;
        else if (Array.isArray(raw?.data?.items)) arr = raw.data.items;
        else if (Array.isArray(raw?.data?.data?.items)) arr = raw.data.data.items;
        else if (Array.isArray(raw?.data?.data?.cart?.items)) arr = raw.data.data.cart.items;
        else if (Array.isArray(raw?.data)) arr = raw.data;
        const normalized = arr.map((it: any, idx: number) => ({
          id: it.id ?? it.productId ?? idx,
          productId: it.productId ?? it.id ?? idx,
          cartItemId: it.id ?? it.cartItemId,
          name: it.name ?? it.productName ?? it.product?.name ?? 'Product',
          description: it.description ?? it.product?.description ?? '',
          price: Number(it.price ?? it.product?.basePrice ?? 0),
          basePrice: Number(it.basePrice ?? it.product?.basePrice ?? it.price ?? 0),
          discountPrice: Number(it.discountPrice ?? it.product?.discountPrice ?? 0),
          b2bPrice: Number(it.b2bPrice ?? it.product?.b2bPrice ?? 0),
          isB2b: it.isB2b ?? it.product?.isB2b ?? false,
          isBoth: it.isBoth ?? it.product?.isBoth ?? false,
          quantity: Number(it.quantity ?? 1),
          image: it.imageUrl ?? it.image ?? it.productImage ?? it.product?.imageUrl ?? getFirstImageUrl(it) ?? getFirstImageUrl(it.product),
          size: it.selectedSize ?? it.size ?? null,
          weight: it.weight ?? it.product?.weight ?? '',
          purity: it.purity ?? it.product?.purity ?? '',
          minQuantity: Number(it.minQuantity ?? it.product?.minQuantity ?? 1),
        }));
        if (normalized.length > 0) setServerItems(normalized);
      }

      if (addrRes.status === 'fulfilled') {
        const addrs = unwrapList<Address>(addrRes.value);
        setAddresses(addrs);
        const hasAddr = addrs.length > 0;
        setHasAddress(hasAddr);
        if (hasAddr) {
          const defaultAddress = addrs.find((addr: any) => addr.isDefault) || addrs[0];
          setSelectedAddress(defaultAddress);
          setShowAddForm(false);
          const pin = getPostalCode(defaultAddress);
          await refreshEstimation(pin || undefined);
        } else {
          setSelectedAddress(null);
          setShowAddForm(true);
          await refreshEstimation();
        }
      }
    } finally {
      setLoading(false);
    }
  };



  const handleAddressSelect = async (addr: Address) => {
    setSelectedAddress(addr);
    const pin = getPostalCode(addr);
    if (pin) {
      await refreshEstimation(pin);
      if (couponApplied) {
        setCouponApplied(false);
        setCouponCode('');
        setCouponInput('');
        setDiscount(0);
        setAppliedCouponTotal(null);
      }
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!form.line1.trim()) errors.line1 = 'Address is required';
    if (!form.cityName.trim()) errors.cityName = 'City is required';
    if (!/^\d{6}$/.test(form.postal_code)) errors.postal_code = 'Enter valid 6-digit PIN';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) return;
    try {
      const res = await createAddress({ ...form, userId: user!.id, countryId: 1, createdBy: user!.id });
      if (res?.data) {
        await loadData();
        setShowAddForm(false);
      }
    } catch { show({ type: 'error', title: 'Save Failed', message: 'Failed to save address. Please try again.' }); }
  };

  const handleApplyCouponCode = async (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setCouponInput(trimmed);
    setApplyingCoupon(true);
    try {
      const authToken = token || user?.token || null;
      if (!authToken) {
        show({ type: 'warning', title: 'Login Required', message: 'Please log in to apply coupons.' });
        setApplyingCoupon(false);
        return;
      }
      const res = await applyCoupon({ couponCode: trimmed, userId: user!.id, cartTotal: subtotal }, authToken);
      const status = res?.status ?? res?.statusCode;
      const message = res?.statusMessage ?? res?.message ?? res?.data?.message ?? 'Failed to apply coupon';
      const data = res?.data ?? res?.result;
      const discountAmount = Number(
        data?.discountAmount ??
        data?.discount_amount ??
        data?.discount ??
        data?.amount ??
        0
      );

      const isSuccess = (status === 200 || res?.success === true) && Boolean(data) && discountAmount >= 0;

      if (isSuccess && (discountAmount > 0 || data?.discountType)) {
        setCouponCode(trimmed);
        setDiscount(discountAmount);
        setCouponApplied(true);
        setAppliedCouponTotal(subtotal);
        setShowCouponList(false);
        setSelectedCoupon(trimmed);
        show({ type: 'success', title: 'Coupon Applied!', message: `Saved ₹${discountAmount.toLocaleString('en-IN')}` });
      } else {
        setCouponApplied(false);
        setDiscount(0);
        setCouponCode('');
        if (status === 401 || status === 403 || message?.toLowerCase?.().includes('token')) {
          show({ type: 'warning', title: 'Session Expired', message: 'Your login session has expired. Please log in again.' });
        } else {
          show({ type: 'warning', title: 'Cannot Apply Coupon', message: typeof message === 'string' ? message : 'This coupon is not valid or has expired.' });
        }
      }
    } catch {
      setCouponApplied(false);
      setDiscount(0);
      setCouponCode('');
      show({ type: 'error', title: 'Coupon Error', message: 'Failed to apply coupon. Please try again.' });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleCouponRemove = () => {
    setCouponApplied(false);
    setCouponCode('');
    setDiscount(0);
    setCouponInput('');
    setShowCouponList(false);
    setSelectedCoupon(null);
    setAppliedCouponTotal(null);
  };

  const handleApplySuggestedCoupon = (code: string) => {
    setCouponInput(code.toUpperCase());
    setSelectedCoupon(code.toUpperCase());
    handleApplyCouponCode(code);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { show({ type: 'warning', title: 'Address Required', message: 'Please select a delivery address before placing your order.' }); return; }

    // Check contact verification first (priority)
    try {
      const contactResponse = await verifyContactCheckout({ userId: user!.id });
      // postJson normalises so status lives at contactResponse.status or contactResponse.data.status
      const contactStatus = contactResponse?.status ?? contactResponse?.data?.status;
      if (contactStatus !== 200) {
        show({ type: 'warning', title: 'Verify Mobile Number', message: 'Please verify your mobile number before placing an order.' });
        return;
      }
    } catch (error) {
      console.error('Contact verification check failed:', error);
      show({ type: 'warning', title: 'Verify Mobile Number', message: 'Please verify your mobile number before placing an order.' });
      return;
    }

    // Check email verification if user has email
    if (user?.email && user.email.trim() && user.email !== 'null' && user.email !== 'undefined') {
      try {
        const emailResponse = await verifyEmailCheckout({ userId: user!.id });
        const emailStatus = emailResponse?.status ?? emailResponse?.data?.status;
        if (emailStatus !== 200) {
          show({ type: 'warning', title: 'Verify Email', message: 'Please verify your email address before placing an order.' });
          return;
        }
      } catch (error) {
        console.error('Email verification check failed:', error);
        // Don't block checkout if email verification API fails
      }
    }

    setPlacing(true);
    try {
      if (paymentMethod === 'cod') {
        await handleCodCheckout();
        return;
      }
      await handleOnlineCheckout();
    } finally {
      setPlacing(false);
    }
  };

  const handleOnlineCheckout = async () => {
    const giftingIds = giftingItemKeys.map(k => Number(k)).filter(n => !isNaN(n) && n > 0);
    const orderData = {
      userId: user!.id,
      paymentMethod: 20,
      addressId: selectedAddress!.id,
      couponCode: couponApplied ? couponCode : null,
      giftingItemIds: giftingIds,
      isCOD: false,
      shippingAmount: estimation?.shippingCharge ?? 0,
      shippingPartner: estimation?.shippingPartner || '',
    };

    const res = await checkoutOrder(orderData);
    // postJson normalises: res.data holds the backend payload
    const checkoutResult = res?.data ?? res;
    if (!checkoutResult?.orderId || !checkoutResult?.razorpayOrderId) {
      show({ type: 'error', title: 'Order Failed', message: checkoutResult?.statusMessage || res?.statusMessage || 'Please try again.' });
      return;
    }

    await openRazorpay({
      orderId: checkoutResult.orderId,
      invoiceNumber: checkoutResult.invoiceNumber,
      amount: Number(checkoutResult.amount),
      razorpayOrderId: checkoutResult.razorpayOrderId,
      isCod: false,
    });
  };

  const handleCodCheckout = async () => {
    setProcessingCodCharge(true);
    try {
      const codOrderRes = await createCodChargeOrder({ userId: user!.id });
      // postJson normalises: codOrderRes.data holds the backend payload
      const codBody = codOrderRes?.data ?? codOrderRes;
      if (!codBody?.razorpayOrderId || !codBody?.codCharges) {
        show({ type: 'error', title: 'COD Charge Failed', message: codBody?.statusMessage || codOrderRes?.statusMessage || 'Unable to initialize COD charge.' });
        return;
      }

      const codPayment = await openRazorpayPaymentOnly({
        amount: Math.round(Number(codBody.codCharges) * 100),
        razorpayOrderId: codBody.razorpayOrderId,
        description: 'COD Handling Charge',
      });

      if (!codPayment) return;

      const giftingIds = giftingItemKeys.map(k => Number(k)).filter(n => !isNaN(n) && n > 0);
      const orderData = {
        userId: user!.id,
        paymentMethod: 98,
        addressId: selectedAddress!.id,
        couponCode: couponApplied ? couponCode : null,
        giftingItemIds: giftingIds,
        isCOD: true,
        shippingAmount: estimation?.shippingCharge ?? 0,
        shippingPartner: estimation?.shippingPartner || '',
        codChargeRazorpayPaymentId: codPayment.razorpay_payment_id,
        codChargeRazorpayOrderId: codPayment.razorpay_order_id,
        codChargeRazorpaySignature: codPayment.razorpay_signature,
      };

      const res = await checkoutOrder(orderData);
      const checkoutResult = res?.data ?? res;
      if (!checkoutResult?.orderId) {
        show({ type: 'error', title: 'Order Failed', message: checkoutResult?.statusMessage || res?.statusMessage || 'Please try again.' });
        return;
      }

      await clearServerCart(estimation?.cartId || null).catch(() => {});
      await clearCart();
      navigation.replace('OrderSuccess', { invoiceNumber: checkoutResult.invoiceNumber, orderId: checkoutResult.orderId, isCod: true });
    } finally {
      setProcessingCodCharge(false);
    }
  };

  const openRazorpayPaymentOnly = async ({ amount, razorpayOrderId, description }: { amount: number; razorpayOrderId: string; description: string; }) => {
    try {
      const result = await RazorpayCheckout.open({
        key: RAZORPAY_KEY,
        amount: String(amount),
        currency: 'INR',
        name: 'Ethnics Retail',
        description,
        order_id: razorpayOrderId,
        theme: { color: '#026670' },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
      } as any);
      return result;
    } catch (error: any) {
      if (String(error?.description || error?.message || '').toLowerCase().includes('cancel')) {
        return null;
      }
      throw error;
    }
  };

  const openRazorpay = async ({
    orderId,
    invoiceNumber,
    amount,
    razorpayOrderId,
    isCod,
  }: {
    orderId: number;
    invoiceNumber: string;
    amount: number;
    razorpayOrderId: string;
    isCod: boolean;
  }) => {
    try {
      const result = await RazorpayCheckout.open({
        key: RAZORPAY_KEY,
        amount: String(amount),
        currency: 'INR',
        name: 'Ethnics Retail',
        description: 'Jewelry Purchase',
        order_id: razorpayOrderId,
        theme: { color: '#026670' },
        prefill: {
          name: user?.name || selectedAddress?.cityName || 'Customer',
          email: user?.email || '',
          contact: user?.phone || '',
        },
      } as any);

      // Payment succeeded — clear cart and navigate
      await clearServerCart(estimation?.cartId || null).catch(() => {});
      await clearCart();
      navigation.replace('OrderSuccess', { invoiceNumber, orderId, isCod });
      return result;
    } catch (error: any) {
      // Razorpay RN SDK rejects on BOTH cancel (code=0) and failure — always cancel the order
      await cancelPayment({ orderId, userId: user!.id }).catch(() => {});
      const code = error?.code ?? error?.error?.code;
      const isUserCancel = code === 0 || String(error?.description || error?.message || '').toLowerCase().includes('cancel');
      if (isUserCancel) {
        show({ type: 'warning', title: 'Payment Cancelled', message: 'Your payment was not completed. Your cart is safe — you can try again anytime.' });
      } else {
        show({ type: 'error', title: 'Payment Failed', message: error?.description || error?.message || 'Something went wrong. Please try again.' });
      }
      return null;
    }
  };

  const serverItemMap = new Map<string, any>();
  serverItems.forEach(item => serverItemMap.set(String(item.productId), item));
  const displayItems = items.map(item => {
    const serverItem = serverItemMap.get(String(item.productId));
    return {
      ...serverItem,
      ...item,
      cartItemId: serverItem?.cartItemId ?? item.cartItemId,
      basePrice: serverItem?.basePrice ?? serverItem?.price ?? item.basePrice ?? item.price,
      discountPrice: serverItem?.discountPrice ?? item.discountPrice ?? 0,
      b2bPrice: serverItem?.b2bPrice ?? item.b2bPrice,
      isB2b: serverItem?.isB2b ?? item.isB2b,
      isBoth: serverItem?.isBoth ?? item.isBoth,
      size: item.size ?? serverItem?.size ?? null,
      weight: serverItem?.weight ?? item.weight,
      purity: serverItem?.purity ?? item.purity,
      image: item.image || serverItem?.image,
      description: item.description || serverItem?.description,
      minQuantity: serverItem?.minQuantity ?? item.minQuantity,
    };
  });
  const localSubtotal = displayItems.reduce((sum, item) => {
    const base = Number(item.basePrice || item.price || 0);
    const disc = Number(item.discountPrice || 0);
    const effective = (!isB2bUser && disc > 0 && disc < base) ? base - disc : base;
    return sum + effective * item.quantity;
  }, 0);
  const subtotal = estimation?.subtotal ?? localSubtotal;

  useEffect(() => {
    if (!couponApplied) return;
    if (appliedCouponTotal !== null && Math.abs(appliedCouponTotal - subtotal) > 0.01) {
      setCouponApplied(false);
      setCouponCode('');
      setCouponInput('');
      setDiscount(0);
      setAppliedCouponTotal(null);
    }
  }, [subtotal, couponApplied, appliedCouponTotal]);
  const gstRate = estimation?.gstRate ?? 3;
  const gstAmount = estimation?.gstAmount ?? (subtotal * gstRate / 100);
  const shipping = estimation?.shippingCharge ?? estimation?.deliveryEstimate?.freight_charge ?? 0;
  const shippingPartner = estimation?.shippingPartner ?? estimation?.deliveryEstimate?.courier_name ?? null;
  const codCharge = paymentMethod === 'cod' ? (estimation?.codCharges ?? 75) : 0;
  const GIFTING_CHARGE = 50;
  const giftingTotal = giftingItemKeys.length * GIFTING_CHARGE;
  const effectiveDiscount = couponApplied ? discount : 0;
  const finalAmount = subtotal + gstAmount + shipping + codCharge + giftingTotal - effectiveDiscount;
  const visibleCoupons = availableCoupons.slice(0, 4);
  const isB2bUser = user?.userRole === 2 || user?.roleName === 'B2b Customer';
  const B2B_MIN_ORDER = 3000;
  const isB2bBelowMinOrder = isB2bUser && subtotal < B2B_MIN_ORDER;

  if (loading) {
    return <Screen><View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View></Screen>;
  }

  return (
    <Screen>
      <PageHeader title="Checkout" subtitle="Review address, payment, and summary" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: 40 }}>
        {/* Delivery Address */}
        <SectionCard title="Delivery Address" subtitle="Where should we ship this order?" colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius}
          action={addresses.length > 0 && !showAddForm ? { label: '+ Add New', onPress: () => setShowAddForm(true) } : undefined}>
          {showAddForm ? (
            <View style={{ gap: 10 }}>
              <FieldInput label="Address Line 1 *" value={form.line1} onChangeText={(v: string) => setForm(p => ({ ...p, line1: v }))} error={formErrors.line1} placeholder="House, Street, Area" colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius} />
              <FieldInput label="Address Line 2" value={form.line2} onChangeText={(v: string) => setForm(p => ({ ...p, line2: v }))} placeholder="Landmark (optional)" colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <FieldInput label="City *" value={form.cityName} onChangeText={(v: string) => setForm(p => ({ ...p, cityName: v }))} error={formErrors.cityName} placeholder="City" colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius} />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldInput label="PIN Code *" value={form.postal_code} onChangeText={(v: string) => setForm(p => ({ ...p, postal_code: v }))} error={formErrors.postal_code} placeholder="6-digit PIN" keyboardType="number-pad" maxLength={6} colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity onPress={handleSaveAddress} style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: radius.lg, flex: 1 }]}>
                  <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>Save Address</Text>
                </TouchableOpacity>
                {addresses.length > 0 && (
                  <TouchableOpacity onPress={() => setShowAddForm(false)} style={[styles.cancelBtn, { borderColor: colors.border, borderRadius: radius.lg }]}>
                    <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : addresses.length > 0 ? (
            <View style={{ gap: 8 }}>
              {addresses.map(addr => {
                const selected = selectedAddress?.id === addr.id;
                return (
                  <TouchableOpacity
                    key={addr.id}
                    onPress={() => handleAddressSelect(addr)}
                    style={[styles.addrCard, {
                      borderColor: selected ? colors.primary : colors.border,
                      backgroundColor: selected ? colors.primary + '0D' : colors.surface,
                      borderRadius: radius.lg,
                    }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                        {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: selected ? colors.primary : colors.textMuted, fontFamily: fontFamily.sansBold, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {addr.AddType || 'Address'}
                        </Text>
                        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm, marginTop: 2 }}>
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 1 }}>
                          {addr.cityName} — {addr.postal_code}
                        </Text>
                      </View>
                      {selected && <AppIcon name="check" color={colors.primary} size={18} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: 8 }}>
              No saved addresses. Add one above.
            </Text>
          )}
        </SectionCard>

        {/* Order Items */}
        <SectionCard title="Order Items" subtitle={`${displayItems.length} ${displayItems.length === 1 ? 'item' : 'items'} in your bag`} colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius}>
          {displayItems.map(item => {
            const imageUrl = item.image || getFirstImageUrl(item);
            const base = Number(item.basePrice || item.price || 0);
            const disc = Number(item.discountPrice || 0);
            const effectivePrice = (!isB2bUser && disc > 0 && disc < base) ? base - disc : base;
            const originalPrice = base;
            const hasDiscount = !isB2bUser && disc > 0 && disc < base;
            const giftKey = getGiftKey(item);
            const isGiftSelected = giftingItemKeys.includes(giftKey);

            return (
              <View key={String(item.productId ?? item.id)} style={[styles.orderItem, { borderColor: colors.border, borderRadius: radius.lg }]}>
                {/* Image */}
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={[styles.orderItemImg, { borderRadius: radius.md }]} resizeMode="cover" />
                ) : (
                  <View style={[styles.orderItemImg, { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' }]}>
                    <AppIcon name="diamond-stone" color={colors.primary} size={20} />
                  </View>
                )}

                {/* Details */}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm, lineHeight: 18 }} numberOfLines={2}>
                    {item.name}
                  </Text>

                  {!!item.description && (
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, lineHeight: 16 }} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}

                  {/* Qty + tags row */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>Qty: {item.quantity}</Text>
                    {item.size && (
                      <View style={[styles.pill, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '10' }]}>
                        <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: 10 }}>Size: {item.size}</Text>
                      </View>
                    )}
                    {!!item.weight && (
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>• {item.weight}g</Text>
                    )}
                    {!!item.purity && (
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>• {item.purity}</Text>
                    )}
                    {isB2bUser && (item.isB2b || item.isBoth) && (item.minQuantity || 1) > 1 && (
                      <View style={[styles.pill, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '10' }]}>
                        <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: 10 }}>{item.minQuantity} units/pkg</Text>
                      </View>
                    )}
                  </View>

                  {/* Gift wrap */}
                  <TouchableOpacity
                    onPress={() => setGiftingItemKeys(prev => prev.includes(giftKey) ? prev.filter(k => k !== giftKey) : [...prev, giftKey])}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <View style={[styles.checkbox, {
                      borderColor: isGiftSelected ? colors.primary : colors.border,
                      backgroundColor: isGiftSelected ? colors.primary : 'transparent',
                    }]}>
                      {isGiftSelected && <AppIcon name="check" color="#fff" size={10} />}
                    </View>
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10 }}>
                      Gift wrap{' '}
                      <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium }}>(+₹{GIFTING_CHARGE})</Text>
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Price */}
                <View style={{ alignItems: 'flex-end', justifyContent: 'flex-start' }}>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>
                    ₹{(effectivePrice * item.quantity).toLocaleString('en-IN')}
                  </Text>
                  {hasDiscount && (
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, textDecorationLine: 'line-through', marginTop: 2 }}>
                      ₹{(originalPrice * item.quantity).toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </SectionCard>

        {/* Payment Method */}
        <SectionCard title="Payment Method" subtitle="Choose how you want to pay" colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius}>
          {[
            { key: 'online', label: 'Online Payment', sub: 'UPI, Cards, Net Banking via Razorpay' },
            ...(!isB2bUser && estimation?.deliveryEstimate?.cod_available !== false ? [{ key: 'cod', label: 'Cash on Delivery', sub: `Pay COD charge ₹${estimation?.codCharges ?? 75} online first` }] : []),
          ].map(opt => {
            const selected = paymentMethod === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setPaymentMethod(opt.key as any)}
                style={[styles.paymentOpt, {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary + '0D' : colors.surface,
                  borderRadius: radius.lg,
                }]}>
                <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
                  {selected && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                </View>
                <View style={[styles.optionIcon, { backgroundColor: selected ? colors.primary : colors.border }]} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>{opt.label}</Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>{opt.sub}</Text>
                </View>
                {selected && <AppIcon name="check" color={colors.primary} size={18} />}
              </TouchableOpacity>
            );
          })}
        </SectionCard>

        {/* Coupon — retail users only */}
        {!isB2bUser && (
        <SectionCard
          title="Coupon Code"
          subtitle="Apply a promo code or pick a saved offer"
          colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius}
          action={!couponApplied && availableCoupons.length > 0
            ? { label: showCouponList ? 'Hide offers ▲' : 'View offers ▼', onPress: () => { setShowCouponList(v => !v); setShowManualInput(false); } }
            : undefined}>

          {/* Applied state */}
          {couponApplied ? (
            <View style={[styles.appliedBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderRadius: radius.xl }]}>
              <View style={styles.appliedBannerTop}>
                <View style={styles.appliedMark}>
                  <AppIcon name="check" color="#166534" size={12} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#166534', fontFamily: fontFamily.sansBold, fontSize: fontSize.sm, letterSpacing: 0.8 }}>
                    {couponCode}
                  </Text>
                  <Text style={{ color: '#16A34A', fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 2 }}>
                    Saved ₹{discount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCouponRemove}
                  style={[styles.removePill, { borderRadius: radius.full }]}>
                  <Text style={{ color: '#B91C1C', fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              {/* Available coupons list */}
              {showCouponList && availableCoupons.length > 0 && (
                <View style={[styles.offerPanel, { borderColor: colors.border, backgroundColor: colors.surfaceElevated, borderRadius: radius.xl, marginBottom: 10 }]}>
                  <View style={styles.offerHeader}>
                    <View>
                      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>
                        Popular offers
                      </Text>
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 2 }}>
                        Tap one to fill the code instantly
                      </Text>
                    </View>
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: 11 }}>
                      {availableCoupons.length} offers
                    </Text>
                  </View>
                  {visibleCoupons.map((c, i) => {
                    const code = String(c.code || '').toUpperCase();
                    const isSelected = selectedCoupon === code;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        activeOpacity={0.86}
                        onPress={() => handleApplySuggestedCoupon(code)}
                        style={[
                          styles.offerRow,
                          {
                            borderBottomWidth: i < visibleCoupons.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                            backgroundColor: isSelected ? colors.surface : 'transparent',
                            borderLeftColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.couponCodeRow}>
                            <View style={[styles.couponCodePill, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}>
                              <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 11, letterSpacing: 1 }}>
                                {code}
                              </Text>
                            </View>
                            <View style={[styles.discountPill, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
                              <Text style={{ color: '#C2410C', fontFamily: fontFamily.sansBold, fontSize: 10 }}>
                                {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                              </Text>
                            </View>
                          </View>
                          {c.minOrderAmount && Number(c.minOrderAmount) > 0 && (
                            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, marginTop: 3 }}>
                              Min. order ₹{Number(c.minOrderAmount).toLocaleString('en-IN')}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.offerActionPill, { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: isSelected ? colors.primary : colors.border }]}>
                          {applyingCoupon && isSelected
                            ? <ActivityIndicator color={isSelected ? '#fff' : colors.primary} size="small" />
                            : <Text style={{ color: isSelected ? '#fff' : colors.primary, fontFamily: fontFamily.sansBold, fontSize: 11 }}>Apply</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {availableCoupons.length > visibleCoupons.length && (
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10 }}>
                        {availableCoupons.length - visibleCoupons.length} more offers available
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => { setShowManualInput(true); setShowCouponList(false); }}
                    style={{ paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: 10 }}>
                      + Enter code manually
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Manual input - shown when no dropdown coupons or user chose manual */}
              {(showManualInput || availableCoupons.length === 0 || (!showCouponList && !showManualInput)) && (
                <View style={[styles.couponInputShell, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.xl }]}>
                  <TextInput
                    value={couponInput}
                    onChangeText={v => setCouponInput(v.toUpperCase())}
                    onSubmitEditing={() => handleApplyCouponCode(couponInput)}
                    placeholder="Enter coupon code"
                    placeholderTextColor={colors.placeholder}
                    autoCapitalize="characters"
                    returnKeyType="done"
                    style={[styles.couponInput, {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      fontFamily: fontFamily.sansMedium,
                      fontSize: fontSize.sm,
                      borderRadius: radius.lg,
                      flex: 1,
                      letterSpacing: 1,
                    }]}
                  />
                  <TouchableOpacity
                    onPress={() => handleApplyCouponCode(couponInput)}
                    disabled={applyingCoupon || !couponInput.trim()}
                    style={[styles.applyBtn, {
                      backgroundColor: couponInput.trim() ? colors.primary : colors.border,
                      borderRadius: radius.lg,
                      opacity: applyingCoupon ? 0.7 : 1,
                    }]}>
                    {applyingCoupon
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>Apply</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </SectionCard>
        )}

        {/* Order Summary */}
        <SectionCard title="Order Summary" subtitle="Final amount based on your selection" colors={colors} fontFamily={fontFamily} fontSize={fontSize} radius={radius}>
          <SumRow label={`Subtotal (${items.length} items)`} value={`₹${subtotal.toLocaleString('en-IN')}`} colors={colors} fontFamily={fontFamily} fontSize={fontSize} />
          <SumRow label={`GST (${gstRate}%)`} value={`₹${gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} colors={colors} fontFamily={fontFamily} fontSize={fontSize} />
          <SumRow
            label={`Shipping${shippingPartner ? ` (${shippingPartner})` : ''}`}
            value={!estimation?.addressFound ? 'Add address' : shipping === 0 ? 'Free' : `₹${shipping.toLocaleString('en-IN')}`}
            valueColor={shipping === 0 && estimation?.addressFound ? '#16A34A' : undefined}
            colors={colors} fontFamily={fontFamily} fontSize={fontSize}
          />
          {paymentMethod === 'cod' && <SumRow label="COD Charge" value={`₹${codCharge.toLocaleString('en-IN')}`} colors={colors} fontFamily={fontFamily} fontSize={fontSize} />}
          {giftingTotal > 0 && <SumRow label={`Gift Wrapping (${giftingItemKeys.length} item${giftingItemKeys.length > 1 ? 's' : ''})`} value={`₹${giftingTotal.toLocaleString('en-IN')}`} colors={colors} fontFamily={fontFamily} fontSize={fontSize} />}
          {effectiveDiscount > 0 && <SumRow label={`Coupon (${couponCode})`} value={`-₹${effectiveDiscount.toLocaleString('en-IN')}`} valueColor="#16A34A" colors={colors} fontFamily={fontFamily} fontSize={fontSize} />}
          <View style={[styles.divider, { borderColor: colors.border }]} />
          <SumRow label="Total Payable" value={`₹${finalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} bold colors={colors} fontFamily={fontFamily} fontSize={fontSize} />

          {/* B2B minimum order warning */}
          {isB2bBelowMinOrder && (
            <View style={[styles.b2bWarning, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4', borderRadius: radius.lg, marginTop: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#134E4A', fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>
                    You're almost there
                  </Text>
                  <Text style={{ color: '#0F766E', fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 2 }}>
                    Spend ₹{(B2B_MIN_ORDER - subtotal).toLocaleString('en-IN')} more to unlock B2B checkout.
                  </Text>
                </View>
                <View style={[styles.b2bPill, { backgroundColor: '#CCFBF1', borderColor: '#99F6E4', borderRadius: radius.full }]}>
                  <Text style={{ color: '#134E4A', fontFamily: fontFamily.sansBold, fontSize: 10 }}>B2B</Text>
                </View>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: '#CCFBF1', borderRadius: radius.full, marginTop: 8 }]}>
                <View style={[styles.progressFill, { backgroundColor: '#0D9488', borderRadius: radius.full, width: `${Math.min((subtotal / B2B_MIN_ORDER) * 100, 100)}%` as any }]} />
              </View>
            </View>
          )}

          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 12, lineHeight: 18 }}>
            By placing an order, you agree to our refund policy where refunds are issued as store credit.
          </Text>

          <TouchableOpacity
            onPress={handlePlaceOrder}
            disabled={placing || !selectedAddress || isB2bBelowMinOrder}
            style={[styles.placeOrderBtn, {
              backgroundColor: (!selectedAddress || isB2bBelowMinOrder) ? colors.border : colors.primary,
              borderRadius: radius.xl,
              marginTop: 14,
              opacity: (placing || isB2bBelowMinOrder) ? 0.6 : 1,
            }]}>
            {placing || processingCodCharge ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.md }}>
                {isB2bBelowMinOrder
                  ? `Min Order ₹${B2B_MIN_ORDER.toLocaleString('en-IN')} Required`
                  : paymentMethod === 'cod'
                  ? 'Place COD Order'
                  : 'Place Order & Pay'}
              </Text>
            )}
          </TouchableOpacity>

          {!selectedAddress && (
            <Text style={{ color: colors.error, fontFamily: fontFamily.sans, fontSize: fontSize.xs, textAlign: 'center', marginTop: 8 }}>
              Please select a delivery address
            </Text>
          )}

          <View style={[styles.securityRow, { marginTop: 14 }]}>
            <View style={[styles.securityPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: 10 }}>Secure checkout</Text>
            </View>
            <View style={[styles.securityPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: 10 }}>Safe payment</Text>
            </View>
            <View style={[styles.securityPill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: 10 }}>Verified order</Text>
            </View>
          </View>
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}

function SectionCard({ title, subtitle, children, action, colors, fontFamily, fontSize, radius }: any) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.md }}>{title}</Text>
          {subtitle ? (
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 3, lineHeight: 16 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action && (
          <TouchableOpacity onPress={action.onPress}>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>{action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function BackArrow({ color }: { color: string }) {
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 9, height: 9, borderLeftWidth: 2, borderBottomWidth: 2, borderColor: color, transform: [{ rotate: '45deg' }] }} />
    </View>
  );
}

function FieldInput({ label, error, colors, fontFamily, fontSize, radius, ...props }: any) {
  return (
    <View>
      <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs, marginBottom: 4 }}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.textMuted}
        style={[styles.fieldInput, {
          backgroundColor: error ? '#FEF2F2' : colors.background,
          borderColor: error ? '#FCA5A5' : colors.border,
          color: colors.textPrimary,
          fontFamily: fontFamily.sans,
          fontSize: fontSize.sm,
          borderRadius: radius.lg,
        }]}
      />
      {error && <Text style={{ color: colors.error, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 2 }}>{error}</Text>}
    </View>
  );
}

function SumRow({ label, value, bold, valueColor, colors, fontFamily, fontSize }: any) {
  return (
    <View style={styles.sumRow}>
      <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>{label}</Text>
      <Text style={{ color: valueColor || colors.textPrimary, fontFamily: bold ? fontFamily.sansBold : fontFamily.sansMedium, fontSize: bold ? fontSize.md : fontSize.sm }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionCard: { borderWidth: 1, padding: 16, marginBottom: 14, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  addrCard: { borderWidth: 1.5, padding: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  optionIcon: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 10 },
  saveBtn: { paddingVertical: 11, alignItems: 'center' },
  cancelBtn: { paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1 },
  fieldInput: { height: 44, paddingHorizontal: 12, borderWidth: 1 },
  orderItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  orderItemImg: { width: 72, height: 72, flexShrink: 0 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  paymentOpt: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, padding: 12, marginBottom: 8 },
  couponInputShell: { flexDirection: 'row', gap: 8, borderWidth: 1, padding: 10, alignItems: 'center', marginHorizontal: 14, marginBottom: 12 },
  couponInput: { height: 46, paddingHorizontal: 14, borderWidth: 0, flex: 1 },
  applyBtn: { paddingHorizontal: 18, height: 46, alignItems: 'center', justifyContent: 'center' },
  appliedBanner: { borderWidth: 1, padding: 12, marginBottom: 10 },
  appliedBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appliedMark: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A' },
  appliedMarkText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  removePill: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  offerPanel: { borderWidth: 1, overflow: 'hidden' },
  offerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 12 },
  offerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, gap: 10, borderLeftWidth: 3 },
  couponCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  couponCodePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  discountPill: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  offerActionPill: { minWidth: 58, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderRadius: 999 },
  itemTag: { paddingHorizontal: 6, paddingVertical: 2 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  b2bWarning: { borderWidth: 1, padding: 12 },
  b2bPill: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  progressTrack: { height: 8, overflow: 'hidden' },
  progressFill: { height: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  divider: { borderTopWidth: 1, marginVertical: 10 },
  placeOrderBtn: { paddingVertical: 15, alignItems: 'center' },
  securityRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  securityPill: { flex: 1, minWidth: 92, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 9999, alignItems: 'center' },
});
