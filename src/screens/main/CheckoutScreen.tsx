import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppIcon, PageHeader, Screen, useAppModal } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAddresses, createAddress } from '../../services/address';
import { fetchCartEstimation, applyCoupon, clearServerCart, normalizeCartEstimationResponse, fetchServerCart } from '../../services/cart';
import { fetchActiveCoupons } from '../../services/products';
import { verifyContactCheckout, verifyEmailCheckout, checkoutOrder, cancelPayment, createCodChargeOrder } from '../../services/order';
import { updateUser as updateUserApi } from '../../services/user';
import { getFirstImageUrl } from '../../utils/imageUtils';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

import RazorpayCheckout from 'react-native-razorpay';

const { width: W } = Dimensions.get('window');
const RAZORPAY_KEY = 'rzp_live_SFvkkQiyUi8jlv';
const B2B_MIN_ORDER = 3000;
const GIFTING_CHARGE = 50;

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Checkout'> };
type Address = { id: number; line1: string; line2?: string; cityName: string; postal_code: string; AddType?: string; Addtype?: number; isDefault?: boolean };

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
  const data = res?.data?.data ?? res?.data ?? res?.result?.data ?? res?.result ?? res?.payload ?? res;
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
}

const getAddrTypeLabel = (addr: any) => {
  const typeVal = String(addr?.AddType || addr?.Addtype || addr?.AddTypeId || '').trim().toLowerCase();
  if (typeVal === '2' || typeVal === '5' || typeVal === 'work' || typeVal === 'office' || typeVal === 'b2b customer') {
    return 'WORK';
  }
  if (typeVal === '3' || typeVal === 'other') {
    return 'OTHER';
  }
  return 'HOME';
};

export function CheckoutScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { items, updateQty, removeItem, clearCart } = useCart();
  const { user, token, updateUser } = useAuth();
  const { show } = useAppModal();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [estimation, setEstimation] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCouponTotal, setAppliedCouponTotal] = useState<number | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [showCouponList, setShowCouponList] = useState(true);
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const [giftingItemKeys, setGiftingItemKeys] = useState<string[]>([]);
  const [placing, setPlacing] = useState(false);
  const [processingCodCharge, setProcessingCodCharge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serverItems, setServerItems] = useState<any[]>([]);

  // Recipient / Profile Name state
  const [profileName, setProfileName] = useState(user?.name && user.name.trim() !== 'Customer' ? user.name.trim() : '');
  const [savingName, setSavingName] = useState(false);
  const [nameSavedSuccess, setNameSavedSuccess] = useState(false);

  const [form, setForm] = useState<{ recipientName: string; line1: string; line2: string; cityName: string; postal_code: string; Addtype: string }>({
    recipientName: user?.name && user.name.trim() !== 'Customer' ? user.name.trim() : '',
    line1: '',
    line2: '',
    cityName: '',
    postal_code: '',
    Addtype: '1',
  });
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
    const userType = 'retail';
    fetchActiveCoupons(userType).then(res => {
      const coupons = unwrapList<any>(res);
      setAvailableCoupons(coupons);
    }).catch(() => { });
  }, [user?.id]);

  useEffect(() => {
    if (user?.name && user.name.trim() !== 'Customer') {
      setProfileName(user.name.trim());
      setForm(prev => ({ ...prev, recipientName: user.name.trim() }));
    }
  }, [user?.name]);

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
        setServerItems(normalized);
      }

      if (addrRes.status === 'fulfilled') {
        const list = unwrapList<Address>(addrRes.value);
        setAddresses(list);
        if (list.length > 0) {
          const def = list.find((a: any) => a.isDefault) || list[0];
          setSelectedAddress(def);
          const pin = getPostalCode(def);
          if (pin) await refreshEstimation(pin);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (addr: Address) => {
    setSelectedAddress(addr);
    setShowSelectModal(false);
    const pin = getPostalCode(addr);
    if (pin) void refreshEstimation(pin);
  };

  const validateAddressForm = () => {
    const errs: Record<string, string> = {};
    if (!form.recipientName.trim()) errs.recipientName = 'Recipient name is required';
    if (!form.line1.trim()) errs.line1 = 'Address line 1 is required';
    if (!form.cityName.trim()) errs.cityName = 'City is required';
    if (!form.postal_code.trim()) errs.postal_code = 'PIN code is required';
    else if (!/^\d{6}$/.test(form.postal_code.trim())) errs.postal_code = 'Enter a valid 6-digit PIN';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProfileName = async () => {
    if (!profileName.trim()) {
      show({ type: 'warning', title: 'Name Required', message: 'Please enter your full name.' });
      return;
    }
    setSavingName(true);
    try {
      if (user?.id) {
        await updateUserApi(user.id, { name: profileName.trim() });
      }
      await updateUser({ name: profileName.trim() });
      setNameSavedSuccess(true);
      setTimeout(() => setNameSavedSuccess(false), 3000);
    } catch {
      show({ type: 'error', title: 'Update Failed', message: 'Could not update name. Please try again.' });
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!validateAddressForm()) return;
    setSavingAddress(true);
    try {
      const recipientName = form.recipientName.trim();
      if (recipientName && (!user?.name || user.name.trim() === 'Customer')) {
        if (user?.id) {
          await updateUserApi(user.id, { name: recipientName }).catch(() => { });
        }
        await updateUser({ name: recipientName });
        setProfileName(recipientName);
      }

      const payload = {
        userId: user!.id,
        line1: form.line1.trim(),
        line2: form.line2.trim(),
        cityName: form.cityName.trim(),
        postal_code: form.postal_code.trim(),
        stateId: 1,
        countryId: 1,
        Addtype: Number(form.Addtype || 1),
        createdBy: user!.id,
        updatedBy: user!.id,
      };

      const createRes = await createAddress(payload);

      // Re-fetch all user addresses directly to ensure full data sync
      const fetchRes = await fetchAddresses(user!.id);
      const list = unwrapList<Address>(fetchRes);

      if (list && list.length > 0) {
        setAddresses(list);
        const newest = list[list.length - 1];
        setSelectedAddress(newest);
        setShowAddModal(false);
        setForm({
          recipientName: recipientName || profileName || '',
          line1: '',
          line2: '',
          cityName: '',
          postal_code: '',
          Addtype: '1',
        });
        const pin = getPostalCode(newest);
        if (pin) await refreshEstimation(pin);
      } else {
        const createdAddr: Address = {
          id: createRes?.data?.id ?? createRes?.data?.data?.id ?? Date.now(),
          line1: form.line1.trim(),
          line2: form.line2.trim(),
          cityName: form.cityName.trim(),
          postal_code: form.postal_code.trim(),
          AddType: form.Addtype === '2' ? 'Work' : form.Addtype === '3' ? 'Other' : 'Home',
        };
        setAddresses([createdAddr]);
        setSelectedAddress(createdAddr);
        setShowAddModal(false);
        const pin = getPostalCode(createdAddr);
        if (pin) await refreshEstimation(pin);
      }
    } catch (e: any) {
      show({ type: 'error', title: 'Save Failed', message: e?.message || 'Failed to save address. Please try again.' });
    } finally {
      setSavingAddress(false);
    }
  };

  const isB2bUser = user?.userRole === 2 || user?.roleName === 'B2b Customer';

  // Build merged display items with accurate pricing
  const serverItemMap = useMemo(() => {
    const map = new Map<string, any>();
    serverItems.forEach(item => map.set(String(item.productId), item));
    return map;
  }, [serverItems]);

  const displayItems = useMemo(() => {
    return items.map(item => {
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
  }, [items, serverItemMap]);

  const getEffectiveUnitPrice = (item: any) => {
    const isB2bProduct = item?.isB2b || item?.isBoth;
    if (isB2bUser && isB2bProduct && item?.b2bPrice) return Number(item.b2bPrice);
    const basePrice = Number(item?.basePrice || item?.price || 0);
    const discountPrice = Number(item?.discountPrice || 0);
    if (basePrice > 0 && discountPrice > 0 && discountPrice < basePrice) return basePrice - discountPrice;
    return basePrice;
  };

  const getOriginalUnitPrice = (item: any) => {
    return Number(item?.basePrice || item?.price || 0);
  };

  const totalItemCount = useMemo(() => displayItems.reduce((sum, item) => sum + item.quantity, 0), [displayItems]);
  const subtotal = useMemo(() => displayItems.reduce((sum, item) => sum + getEffectiveUnitPrice(item) * item.quantity, 0), [displayItems]);
  const originalSubtotal = useMemo(() => displayItems.reduce((sum, item) => sum + getOriginalUnitPrice(item) * item.quantity, 0), [displayItems]);

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
  const gstAmount = Number(((subtotal * gstRate) / 100).toFixed(2));
  const rawShipping = estimation?.shippingCharge ?? estimation?.deliveryEstimate?.freight_charge ?? 80;
  const shipping = selectedAddress
    ? (!isB2bUser
        ? (subtotal >= 1000 ? 0 : rawShipping)
        : (estimation?.shippingCharge ?? estimation?.deliveryEstimate?.freight_charge ?? 0))
    : 0;
  const shippingPartner = estimation?.shippingPartner ?? estimation?.deliveryEstimate?.courier_name ?? null;
  const codCharge = paymentMethod === 'cod' ? (estimation?.codCharges ?? 75) : 0;
  const giftingTotal = giftingItemKeys.length * GIFTING_CHARGE;
  const effectiveDiscount = couponApplied ? Number(discount || 0) : 0;
  const finalAmount = Math.max(0, Number((subtotal + gstAmount + shipping + codCharge + giftingTotal - effectiveDiscount).toFixed(2)));

  const isB2bBelowMinOrder = isB2bUser && subtotal < B2B_MIN_ORDER;
  const needsName = !profileName.trim() || profileName.trim().toLowerCase() === 'customer';

  const handleQtyChange = useCallback((item: any, newQty: number) => {
    const pId = item.productId ?? item.id;
    const maxQty = Number(item.stockQuantity ?? 99);
    const minQty = isB2bUser && item.minQuantity ? Number(item.minQuantity) : 1;

    if (newQty < minQty) {
      show({
        type: 'warning',
        title: 'Remove Item?',
        message: `Remove "${item.name}" from your order?`,
        actions: [
          { label: 'Cancel', onPress: () => { }, variant: 'outline' },
          {
            label: 'Remove',
            onPress: () => {
              removeItem(pId);
              if (displayItems.length <= 1) {
                navigation.goBack();
              }
            },
            variant: 'danger',
          },
        ],
      });
      return;
    }

    if (newQty > maxQty) {
      show({
        type: 'warning',
        title: 'Stock Limit',
        message: `Only ${maxQty} units available in stock.`,
      });
      return;
    }

    updateQty(pId, newQty);
    if (selectedAddress) {
      const pin = getPostalCode(selectedAddress);
      if (pin) void refreshEstimation(pin);
    }
  }, [displayItems.length, isB2bUser, navigation, removeItem, selectedAddress, show, updateQty]);

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const allCheckoutItemsSelected = displayItems.length > 0 && selectedItemIds.size === displayItems.length;

  const toggleSelectCheckoutItem = (pId: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(pId)) {
        next.delete(pId);
      } else {
        next.add(pId);
      }
      return next;
    });
  };

  const toggleSelectAllCheckoutItems = () => {
    if (allCheckoutItemsSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(displayItems.map(i => String(i.productId ?? i.id))));
    }
  };

  const handleBulkRemoveCheckoutItems = () => {
    if (selectedItemIds.size === 0) return;
    const count = selectedItemIds.size;
    show({
      type: 'confirm',
      title: 'Remove Items',
      message: `Remove ${count} selected ${count === 1 ? 'item' : 'items'} from your order?`,
      actions: [
        { label: 'Cancel', onPress: () => {}, variant: 'outline' },
        {
          label: `Remove (${count})`,
          variant: 'danger',
          onPress: () => {
            const idsToRemove = Array.from(selectedItemIds);
            idsToRemove.forEach(strPid => {
              const itemObj = displayItems.find(i => String(i.productId ?? i.id) === strPid);
              const pIdNum = (itemObj?.productId ?? Number(strPid)) || strPid;
              removeItem(pIdNum);
            });
            setSelectedItemIds(new Set());
            if (idsToRemove.length >= displayItems.length) {
              navigation.goBack();
            } else if (selectedAddress) {
              const pin = getPostalCode(selectedAddress);
              if (pin) void refreshEstimation(pin);
            }
          },
        },
      ],
    });
  };

  const toggleGiftWrap = (giftKey: string) => {
    setGiftingItemKeys(prev => prev.includes(giftKey) ? prev.filter(k => k !== giftKey) : [...prev, giftKey]);
  };

  const handleApplyCouponCode = async (codeToApply: string) => {
    const trimmed = codeToApply.trim().toUpperCase();
    if (!trimmed) {
      show({ type: 'warning', title: 'Coupon Code Required', message: 'Please enter a coupon code.' });
      return;
    }
    const authToken = token || undefined;
    setApplyingCoupon(true);
    try {
      const res = await applyCoupon({ couponCode: trimmed, userId: user!.id, cartTotal: subtotal }, authToken);
      const data = res?.data?.data ?? res?.data ?? res;
      const discountVal = Number(data?.discountAmount ?? data?.discount ?? res?.discountAmount ?? res?.discount ?? 0);
      const isSuccess = (res?.status === 200 || res?.status === 201 || res?.success) && discountVal > 0;

      if (isSuccess) {
        setDiscount(discountVal);
        setCouponCode(trimmed);
        setCouponApplied(true);
        setAppliedCouponTotal(subtotal);
        setSelectedCoupon(trimmed);
        setShowCouponList(false);
        show({
          type: 'success',
          title: 'Coupon Applied!',
          message: data?.message || res?.statusMessage || res?.message || `You saved ₹${discountVal.toLocaleString('en-IN')} with code ${trimmed}.`
        });
      } else {
        setCouponApplied(false);
        setDiscount(0);
        const errMsg = res?.statusMessage || res?.message || data?.statusMessage || data?.message || 'This coupon is not valid for your order.';
        show({
          type: 'error',
          title: 'Invalid Coupon',
          message: errMsg
        });
      }
    } catch (e: any) {
      setCouponApplied(false);
      setDiscount(0);
      show({
        type: 'error',
        title: 'Coupon Error',
        message: e?.response?.data?.statusMessage || e?.response?.data?.message || e?.message || 'Could not apply coupon.'
      });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleCouponRemove = () => {
    setCouponApplied(false);
    setCouponCode('');
    setCouponInput('');
    setDiscount(0);
    setAppliedCouponTotal(null);
    setSelectedCoupon(null);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      if (addresses.length > 0) {
        setShowSelectModal(true);
      } else {
        setShowAddModal(true);
      }
      return;
    }
    if (needsName) {
      show({ type: 'warning', title: 'Name Required', message: 'Please enter your full name for order delivery.' });
      return;
    }
    if (isB2bBelowMinOrder) {
      show({ type: 'warning', title: 'Minimum Order Required', message: `B2B orders require a minimum order value of ₹${B2B_MIN_ORDER.toLocaleString('en-IN')}. Please add more items.` });
      return;
    }

    // Auto-sync profile name to backend so email/SMS/invoice notifications have proper name
    if (profileName.trim() && profileName.trim() !== user?.name && user?.id) {
      try {
        await updateUserApi(user.id, { name: profileName.trim() });
        await updateUser({ name: profileName.trim() });
      } catch {}
    }

    if (paymentMethod === 'cod') {
      await handleCodOrderFlow();
      return;
    }
    await handleOnlinePaymentFlow();
  };

  const handleCodOrderFlow = async () => {
    setPlacing(true);
    try {
      const addressId = selectedAddress!.id;
      const effectivePin = getPostalCode(selectedAddress);
      const invoiceNumber = `INV-${Date.now()}`;
      const codRes = await createCodChargeOrder({
        userId: user!.id,
        addressId,
        pincode: effectivePin,
        cartTotal: subtotal,
      });
      const rawCod = codRes?.data?.data ?? codRes?.data ?? codRes;
      const razorpayOrderId = rawCod?.razorpayOrderId ?? rawCod?.orderId ?? codRes?.razorpayOrderId ?? codRes?.orderId;
      const codFeeAmount = Number(rawCod?.codCharges ?? codRes?.codCharges ?? codCharge ?? 75);

      if (!razorpayOrderId) {
        throw new Error(codRes?.statusMessage || codRes?.message || 'Failed to initiate COD charge order');
      }

      setProcessingCodCharge(true);
      const paymentResult = await openRazorpayModal({
        orderId: razorpayOrderId,
        amount: Math.round(codFeeAmount * 100),
        description: `COD Booking Charge for Order ${invoiceNumber}`,
        invoiceNumber,
        isCod: true,
      });

      if (!paymentResult) {
        setPlacing(false);
        setProcessingCodCharge(false);
        return;
      }

      const checkoutRes = await checkoutOrder({
        userId: user!.id,
        paymentMethod: 98,
        addressId,
        isCOD: true,
        shippingAmount: shipping,
        shippingPartner: shippingPartner || 'Standard Shipping',
        giftingItemIds: giftingItemKeys.map(k => Number(k)).filter(n => !isNaN(n)),
        couponCode: couponApplied ? couponCode : undefined,
        codChargeRazorpayPaymentId: paymentResult.razorpay_payment_id,
        codChargeRazorpayOrderId: paymentResult.razorpay_order_id,
        codChargeRazorpaySignature: paymentResult.razorpay_signature,
      });

      if (checkoutRes?.status === 400 || checkoutRes?.success === false) {
        throw new Error(checkoutRes?.statusMessage || checkoutRes?.message || 'Failed to complete COD order');
      }

      await clearServerCart(estimation?.cartId || null).catch(() => { });
      await clearCart();
      const raw = checkoutRes?.data?.data ?? checkoutRes?.data ?? checkoutRes;
      const orderIdNum = Number(raw?.order?.id ?? raw?.orderId ?? raw?.id ?? 0);
      const finalInv = raw?.invoiceNumber || invoiceNumber;
      navigation.replace('OrderSuccess', { invoiceNumber: finalInv, orderId: orderIdNum, isCod: true });
    } catch (e: any) {
      show({ type: 'error', title: 'Order Failed', message: e?.statusMessage || e?.message || 'Could not place COD order' });
    } finally {
      setPlacing(false);
      setProcessingCodCharge(false);
    }
  };

  const handleOnlinePaymentFlow = async () => {
    setPlacing(true);
    let createdOrderId: number | null = null;
    try {
      const addressId = selectedAddress!.id;

      // 1. Call CheckoutOrder directly to create order and generate Razorpay order (matching web)
      const orderData = {
        userId: user!.id,
        paymentMethod: 20,
        addressId,
        couponCode: couponApplied ? couponCode : null,
        isCOD: false,
        shippingAmount: shipping,
        shippingPartner: shippingPartner || 'Standard Shipping',
        giftingItemIds: giftingItemKeys.map(k => Number(k)).filter(n => !isNaN(n)),
      };

      const orderResponse = await checkoutOrder(orderData);
      if (orderResponse?.status === 400 || orderResponse?.success === false) {
        throw new Error(orderResponse?.statusMessage || orderResponse?.message || 'Failed to initialize order');
      }

      const raw = orderResponse?.data?.data ?? orderResponse?.data ?? orderResponse;
      const dbOrderId = Number(raw?.orderId ?? raw?.id ?? 0);
      const razorpayOrderId = raw?.razorpayOrderId ?? raw?.orderId ?? raw?.id;
      const invoiceNumber = raw?.invoiceNumber || `INV-${Date.now()}`;
      const payableAmount = Number(raw?.amount ?? Math.round(finalAmount * 100));

      if (!razorpayOrderId) {
        throw new Error(orderResponse?.statusMessage || orderResponse?.message || 'Payment gateway order could not be generated. Please try again.');
      }

      createdOrderId = dbOrderId;

      // 2. Open Razorpay Gateway
      const paymentResult = await openRazorpayModal({
        orderId: razorpayOrderId,
        amount: payableAmount,
        description: `Order Payment for ${invoiceNumber}`,
        invoiceNumber,
        isCod: false,
        dbOrderId,
      });

      if (!paymentResult) {
        setPlacing(false);
        return;
      }

      // 3. Payment succeeded -> clear cart and go to OrderSuccess
      await clearServerCart(estimation?.cartId || null).catch(() => { });
      await clearCart();
      navigation.replace('OrderSuccess', { invoiceNumber, orderId: dbOrderId, isCod: false });
    } catch (e: any) {
      if (createdOrderId) {
        await cancelPayment({ orderId: createdOrderId, userId: user!.id }).catch(() => { });
      }
      show({ type: 'error', title: 'Checkout Failed', message: e?.statusMessage || e?.message || 'An error occurred during checkout' });
    } finally {
      setPlacing(false);
    }
  };

  const openRazorpayModal = async ({
    orderId,
    amount,
    description,
    invoiceNumber,
    isCod,
    dbOrderId,
  }: {
    orderId: string;
    amount: number;
    description: string;
    invoiceNumber: string;
    isCod: boolean;
    dbOrderId?: number;
  }) => {
    try {
      const result = await RazorpayCheckout.open({
        key: RAZORPAY_KEY,
        amount: Number(amount),
        currency: 'INR',
        name: 'Ethnic Sparkles',
        description,
        order_id: orderId,
        theme: { color: colors.primary },
        prefill: {
          name: profileName || user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
      } as any);

      return result;
    } catch (error: any) {
      if (dbOrderId && !isCod) {
        await cancelPayment({ orderId: dbOrderId, userId: user!.id }).catch(() => { });
      }
      const code = error?.code ?? error?.error?.code;
      const isUserCancel = code === 0 || String(error?.description || error?.message || '').toLowerCase().includes('cancel');
      if (isUserCancel) {
        show({ type: 'warning', title: 'Payment Cancelled', message: 'Your payment was not completed. Your items are safe in your bag.' });
      } else {
        show({ type: 'error', title: 'Payment Failed', message: error?.description || error?.message || 'Something went wrong. Please try again.' });
      }
      return null;
    }
  };

  if (!user) {
    return (
      <Screen edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
        <PageHeader title="Checkout" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <AppIcon name="lock-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.authRequiredTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Please Sign In</Text>
          <Text style={[styles.authRequiredSub, { color: colors.textMuted, fontFamily: fontFamily.sans }]}>Sign in or register to complete your order.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login' as any)} activeOpacity={0.85} style={[styles.signInBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']} style={{ backgroundColor: colors.background }}>
        <PageHeader title="Checkout" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, marginTop: 12, fontSize: 13 }}>Preparing your order...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} keyboardAvoiding={Platform.OS === 'ios'} style={[styles.screenWrap, { backgroundColor: colors.background }]}>
      <PageHeader
        title="Checkout"
        subtitle={`${totalItemCount} ${totalItemCount === 1 ? 'item' : 'items'} • ₹${finalAmount.toLocaleString('en-IN')}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      >
        {/* ── 0. Recipient Contact Info ── */}
        <View style={[styles.nativeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '15' }]}>
                <AppIcon name="account-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                Recipient Contact Info
              </Text>
            </View>
            {user?.phone ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppIcon name="phone-outline" size={12} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: 11 }}>
                  {user.phone}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={{ marginTop: 10 }}>
            <View style={styles.nameInputRow}>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                onBlur={handleSaveProfileName}
                placeholder="Enter Recipient Full Name *"
                placeholderTextColor={colors.placeholder}
                style={[
                  styles.nameInput,
                  {
                    fontFamily: fontFamily.sansBold,
                    backgroundColor: colors.surfaceElevated,
                    borderColor: (!profileName.trim() || profileName.trim().toLowerCase() === 'customer') ? '#F59E0B' : colors.border,
                    color: colors.textPrimary,
                  }
                ]}
              />
              <TouchableOpacity
                onPress={handleSaveProfileName}
                disabled={savingName || !profileName.trim()}
                activeOpacity={0.85}
                style={[
                  styles.nameSaveBtn,
                  { backgroundColor: profileName.trim() ? colors.primary : colors.border }
                ]}
              >
                {savingName ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.nameSaveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
            {nameSavedSuccess ? (
              <Text style={styles.nameSavedSuccessText}>✓ Recipient name saved successfully!</Text>
            ) : (!profileName.trim() || profileName.trim().toLowerCase() === 'customer') ? (
              <Text style={{ color: '#D97706', fontFamily: fontFamily.sans, fontSize: 11, marginTop: 4 }}>
                * Full name is required on the courier shipping label.
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── 1. Delivery Address ── */}
        <View style={[styles.nativeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '15' }]}>
                <AppIcon name="map-marker-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Delivery Address</Text>
            </View>
            {addresses.length > 0 && selectedAddress && (
              <TouchableOpacity
                onPress={() => setShowSelectModal(true)}
                activeOpacity={0.7}
                style={[styles.changeAddressBtn, { borderColor: colors.primary + '50', backgroundColor: colors.primary + '0D' }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={[styles.changeAddressBtnText, { color: colors.primary, fontFamily: fontFamily.sansBold }]}>
                  CHANGE
                </Text>
                <AppIcon name="chevron-right" size={13} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {selectedAddress ? (
            <View style={[styles.addressCardSurface, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={styles.addressCardHeader}>
                <View style={styles.recipientNameWrapper}>
                  <Text style={[styles.recipientNameText, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                    {profileName || user?.name || 'Customer'}
                  </Text>
                  {user?.phone ? (
                    <Text style={[styles.recipientPhoneText, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>
                      • {user.phone}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.addressTypeBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                  <Text style={[styles.addressTypeBadgeText, { color: colors.primary, fontFamily: fontFamily.sansBold }]}>
                    {getAddrTypeLabel(selectedAddress)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.addressBodyText, { color: colors.textMuted, fontFamily: fontFamily.sans }]}>
                {selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}
              </Text>
              <Text style={[styles.addressCityPinText, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                {selectedAddress.cityName} - {selectedAddress.postal_code}
              </Text>

              <View style={[styles.deliveryPromiseRow, { borderTopColor: colors.border }]}>
                <AppIcon name="truck-fast-outline" size={14} color={colors.primary} />
                <Text style={[styles.deliveryPromiseText, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>
                  {estimation?.deliveryEstimate?.estimated_days
                    ? `Estimated delivery within ${estimation.deliveryEstimate.estimated_days} business days`
                    : 'Standard Express Insured Delivery'}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              activeOpacity={0.85}
              style={[styles.noAddressBox, { borderColor: colors.primary, backgroundColor: colors.primary + '08' }]}
            >
              <View style={[styles.addIconCircle, { backgroundColor: colors.primary }]}>
                <AppIcon name="plus" size={16} color="#fff" />
              </View>
              <View>
                <Text style={[styles.noAddressTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Add Delivery Address</Text>
                <Text style={[styles.noAddressSub, { color: colors.textMuted, fontFamily: fontFamily.sans }]}>Required to calculate delivery options and proceed</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 2. Order Items List ── */}
        <View style={[styles.nativeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '15' }]}>
                <AppIcon name="package-variant-closed" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                Order Items ({totalItemCount})
              </Text>
            </View>

            {displayItems.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TouchableOpacity
                  onPress={toggleSelectAllCheckoutItems}
                  style={styles.checkoutSelectAllBtn}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkoutMiniCheckbox,
                    {
                      borderColor: allCheckoutItemsSelected ? colors.primary : colors.border,
                      backgroundColor: allCheckoutItemsSelected ? colors.primary : 'transparent',
                      borderRadius: 4,
                    }
                  ]}>
                    {allCheckoutItemsSelected && <AppIcon name="check" size={10} color="#fff" />}
                  </View>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs, marginLeft: 4 }}>
                    Select All
                  </Text>
                </TouchableOpacity>

                {selectedItemIds.size > 0 && (
                  <TouchableOpacity
                    onPress={handleBulkRemoveCheckoutItems}
                    style={[styles.checkoutBulkRemoveBtn, { backgroundColor: '#FEE2E2', borderRadius: radius.md }]}
                    activeOpacity={0.7}
                  >
                    <AppIcon name="trash-can-outline" size={13} color="#DC2626" />
                    <Text style={{ color: '#DC2626', fontFamily: fontFamily.sansBold, fontSize: 11, marginLeft: 3 }}>
                      Remove ({selectedItemIds.size})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {displayItems.map((item, index) => {
            const pIdStr = String(item.productId ?? item.id);
            const isItemSelected = selectedItemIds.has(pIdStr);
            const giftKey = getGiftKey(item);
            const isGiftWrapped = giftingItemKeys.includes(giftKey);
            const effectivePrice = getEffectiveUnitPrice(item);
            const originalPrice = getOriginalUnitPrice(item);
            const hasDiscount = originalPrice > effectivePrice;
            const imageUrl = item.image ? { uri: item.image } : null;

            return (
              <View
                key={`${item.id}-${index}`}
                style={[
                  styles.itemRowContainer,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: index < displayItems.length - 1 ? 1 : 0,
                  }
                ]}
              >
                {imageUrl ? (
                  <Image source={imageUrl} style={[styles.itemThumbnail, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} resizeMode="cover" />
                ) : (
                  <View style={[styles.itemThumbnail, styles.itemThumbnailPlaceholder, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <AppIcon name="image-outline" size={24} color={colors.textMuted} />
                  </View>
                )}

                <View style={styles.itemContentCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Text numberOfLines={2} style={[styles.itemTitleText, { color: colors.textPrimary, fontFamily: fontFamily.sansBold, flex: 1, marginRight: 8 }]}>
                      {item.name}
                    </Text>

                    {/* Normal checkbox on right side of card */}
                    <TouchableOpacity
                      onPress={() => toggleSelectCheckoutItem(pIdStr)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      activeOpacity={0.7}
                      style={{ paddingTop: 1 }}
                    >
                      <View style={[
                        styles.checkoutMiniCheckbox,
                        {
                          borderColor: isItemSelected ? colors.primary : colors.border,
                          backgroundColor: isItemSelected ? colors.primary : 'transparent',
                          borderRadius: 4,
                        }
                      ]}>
                        {isItemSelected && <AppIcon name="check" size={10} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.itemMetaTagsRow}>
                    <View style={[styles.checkoutQtyStepper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <TouchableOpacity
                        onPress={() => handleQtyChange(item, item.quantity - 1)}
                        style={styles.checkoutQtyBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <AppIcon name={item.quantity === 1 ? 'trash-can-outline' : 'minus'} size={13} color={item.quantity === 1 ? '#EF4444' : colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={[styles.checkoutQtyText, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                        {item.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleQtyChange(item, item.quantity + 1)}
                        style={styles.checkoutQtyBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <AppIcon name="plus" size={13} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    {item.size && (
                      <View style={[styles.itemMetaBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.itemMetaBadgeText, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>
                          Size: {item.size}
                        </Text>
                      </View>
                    )}
                    {item.weight && (
                      <View style={[styles.itemMetaBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                        <Text style={[styles.itemMetaBadgeText, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>
                          {item.weight}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.itemFooterRow}>
                    <TouchableOpacity
                      onPress={() => toggleGiftWrap(giftKey)}
                      activeOpacity={0.75}
                      style={[styles.giftWrapPill, { backgroundColor: isGiftWrapped ? colors.primary + '12' : colors.surfaceElevated, borderColor: isGiftWrapped ? colors.primary : colors.border }]}
                    >
                      <AppIcon name="gift-outline" size={13} color={isGiftWrapped ? colors.primary : colors.textMuted} />
                      <Text style={[styles.giftWrapText, { color: isGiftWrapped ? colors.primary : colors.textMuted, fontFamily: isGiftWrapped ? fontFamily.sansBold : fontFamily.sansMedium }]}>
                        Gift Box <Text style={{ color: colors.primary }}>(+₹{GIFTING_CHARGE})</Text>
                      </Text>
                      <View style={[styles.miniCheckCircle, { borderColor: isGiftWrapped ? colors.primary : colors.border, backgroundColor: isGiftWrapped ? colors.primary : 'transparent' }]}>
                        {isGiftWrapped && <AppIcon name="check" size={9} color="#fff" />}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.itemPriceBlock}>
                      <Text style={[styles.itemFinalPriceText, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                        ₹{(effectivePrice * item.quantity).toLocaleString('en-IN')}
                      </Text>
                      {hasDiscount && (
                        <Text style={[styles.itemOriginalPriceText, { color: colors.textMuted, fontFamily: fontFamily.sans }]}>
                          ₹{(originalPrice * item.quantity).toLocaleString('en-IN')}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── 3. Payment Method ── */}
        <View style={[styles.nativeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '15' }]}>
                <AppIcon name="credit-card-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Payment Method</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setPaymentMethod('online')}
            activeOpacity={0.88}
            style={[
              styles.paymentOptionCard,
              {
                borderColor: paymentMethod === 'online' ? colors.primary : colors.border,
                backgroundColor: paymentMethod === 'online' ? colors.primary + '0A' : colors.surfaceElevated,
              }
            ]}
          >
            <View style={[styles.customRadioCircle, { borderColor: paymentMethod === 'online' ? colors.primary : colors.border }]}>
              {paymentMethod === 'online' && <View style={[styles.customRadioDot, { backgroundColor: colors.primary }]} />}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={styles.paymentMethodTitleRow}>
                <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Online Payment</Text>
                <View style={styles.instantBadge}>
                  <AppIcon name="lightning-bolt" size={11} color="#059669" />
                  <Text style={styles.instantBadgeText}>FAST & SECURE</Text>
                </View>
              </View>
              <Text style={[styles.paymentOptionSub, { color: colors.textMuted, fontFamily: fontFamily.sans }]}>
                UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking
              </Text>
            </View>
          </TouchableOpacity>

          {!isB2bUser && estimation?.deliveryEstimate?.cod_available !== false && (
            <TouchableOpacity
              onPress={() => setPaymentMethod('cod')}
              activeOpacity={0.88}
              style={[
                styles.paymentOptionCard,
                {
                  borderColor: paymentMethod === 'cod'
                    ? (isDark ? '#F59E0B' : '#D97706')
                    : (isDark ? '#4A351D' : '#E8D2B5'),
                  backgroundColor: paymentMethod === 'cod'
                    ? (isDark ? '#2B1A06' : '#FEF8EE')
                    : (isDark ? '#1C160F' : '#FFFDF9'),
                  borderWidth: paymentMethod === 'cod' ? 1.8 : 1.5,
                  marginTop: 10,
                }
              ]}
            >
              <View style={[styles.customRadioCircle, { borderColor: paymentMethod === 'cod' ? (isDark ? '#F59E0B' : '#D97706') : (isDark ? '#5A4329' : '#C7A981') }]}>
                {paymentMethod === 'cod' && <View style={[styles.customRadioDot, { backgroundColor: isDark ? '#F59E0B' : '#D97706' }]} />}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={styles.paymentMethodTitleRow}>
                  <Text style={[styles.paymentOptionTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Cash on Delivery</Text>
                  <View style={[styles.codBadge, { backgroundColor: isDark ? '#3D1A04' : '#FEF3C7', borderColor: isDark ? '#78350F' : '#FDE68A' }]}>
                    <AppIcon name="truck-delivery-outline" size={10} color={isDark ? '#FBBF24' : '#B45309'} />
                    <Text style={[styles.codBadgeText, { color: isDark ? '#FDE68A' : '#B45309' }]}>PAY ON DELIVERY</Text>
                  </View>
                </View>
                <Text style={[styles.paymentOptionSub, { color: colors.textMuted, fontFamily: fontFamily.sans }]}>
                  Advance booking verification charge of ₹{estimation?.codCharges ?? 75}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 4. Coupons & Offers ── */}
        <View style={[styles.nativeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '15' }]}>
                <AppIcon name="ticket-percent-outline" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Coupons & Offers</Text>
            </View>
            {!couponApplied && availableCoupons.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowCouponList(prev => !prev)}
                activeOpacity={0.75}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 8 }}
              >
                <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 12 }}>
                  {showCouponList ? 'Hide Offers' : `View Offers (${availableCoupons.length})`}
                </Text>
                <AppIcon name={showCouponList ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {couponApplied ? (
            <View style={[styles.appliedCouponCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <View style={styles.couponIconCircle}>
                <AppIcon name="check-circle" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.appliedCouponCode, { fontFamily: fontFamily.sansBold }]}>{couponCode} APPLIED</Text>
                <Text style={[styles.appliedCouponSavings, { fontFamily: fontFamily.sansMedium }]}>You saved ₹{discount.toLocaleString('en-IN')} on this order</Text>
              </View>
              <TouchableOpacity onPress={handleCouponRemove} activeOpacity={0.7} style={styles.removeCouponBtn}>
                <Text style={[styles.removeCouponText, { fontFamily: fontFamily.sansBold }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.couponNativeInputContainer}>
                <TextInput
                  value={couponInput}
                  onChangeText={v => setCouponInput(v.toUpperCase())}
                  placeholder="Enter Promo Code"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="characters"
                  style={[styles.couponNativeInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}
                />
                <TouchableOpacity
                  onPress={() => handleApplyCouponCode(couponInput)}
                  disabled={applyingCoupon || !couponInput.trim()}
                  activeOpacity={0.85}
                  style={[
                    styles.couponApplyButton,
                    {
                      backgroundColor: couponInput.trim()
                        ? colors.primary
                        : (isDark ? '#2A2242' : '#EDE8F5'),
                      borderWidth: couponInput.trim() ? 0 : 1,
                      borderColor: isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(124, 58, 237, 0.15)',
                    },
                  ]}
                >
                  {applyingCoupon ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.couponApplyButtonText,
                        {
                          color: couponInput.trim()
                            ? '#FFFFFF'
                            : (isDark ? '#94A3B8' : '#6B5E82'),
                          fontFamily: fontFamily.sansBold,
                        },
                      ]}
                    >
                      Apply
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Available Coupons Dropdown / List */}
              {showCouponList && availableCoupons.length > 0 && (
                <View style={[styles.availableCouponsWrapper, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                  <View style={[styles.availableCouponsHeader, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.availableCouponsTitle, { color: colors.textMuted, fontFamily: fontFamily.sansBold }]}>
                      AVAILABLE OFFERS FOR YOU
                    </Text>
                  </View>

                  {availableCoupons.map((c: any, cIdx: number) => {
                    const minOrder = Number(c.minOrderAmount || c.minOrderValue || 0);
                    const isMinMet = subtotal >= minOrder;
                    const discountLabel = c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`;

                    return (
                      <View
                        key={c.id || c.code || cIdx}
                        style={[
                          styles.couponOfferItem,
                          {
                            borderBottomColor: colors.border,
                            borderBottomWidth: cIdx < availableCoupons.length - 1 ? 1 : 0,
                          }
                        ]}
                      >
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <View style={[styles.couponCodePill, { borderColor: colors.primary + '60', backgroundColor: colors.primary + '10' }]}>
                              <Text style={[styles.couponCodePillText, { color: colors.primary, fontFamily: fontFamily.sansBold }]}>
                                {c.code}
                              </Text>
                            </View>
                            <View style={[styles.discountTagPill, { backgroundColor: '#FFEDD5' }]}>
                              <Text style={[styles.discountTagText, { color: '#C2410C', fontFamily: fontFamily.sansBold }]}>
                                {discountLabel}
                              </Text>
                            </View>
                          </View>

                          {c.description ? (
                            <Text style={[styles.couponDescText, { color: colors.textSecondary, fontFamily: fontFamily.sans }]} numberOfLines={2}>
                              {c.description}
                            </Text>
                          ) : null}

                          {minOrder > 0 && (
                            <Text style={[styles.couponMinOrderText, { color: isMinMet ? '#059669' : colors.textMuted, fontFamily: fontFamily.sansMedium }]}>
                              {isMinMet ? `✓ Valid on orders above ₹${minOrder.toLocaleString('en-IN')}` : `Min. order required ₹${minOrder.toLocaleString('en-IN')}`}
                            </Text>
                          )}
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            setCouponInput(c.code);
                            handleApplyCouponCode(c.code);
                          }}
                          disabled={applyingCoupon}
                          activeOpacity={0.8}
                          style={[
                            styles.couponItemApplyBtn,
                            {
                              borderColor: colors.primary,
                              backgroundColor: colors.primary + '10',
                            }
                          ]}
                        >
                          <Text style={[styles.couponItemApplyBtnText, { color: colors.primary, fontFamily: fontFamily.sansBold }]}>
                            APPLY
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── 5. Bill Details ── */}
        <View style={[styles.nativeSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.headerIconBox, { backgroundColor: colors.primary + '15' }]}>
                <AppIcon name="receipt" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Bill Details</Text>
            </View>
          </View>

          <View style={styles.billDetailRow}>
            <Text style={[styles.billDetailLabel, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>
              Item Total ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
            </Text>
            <Text style={[styles.billDetailValue, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
              ₹{subtotal.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.billDetailRow}>
            <Text style={[styles.billDetailLabel, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>GST ({gstRate}%)</Text>
            <Text style={[styles.billDetailValue, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
              ₹{gstAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.billDetailRow}>
            <Text style={[styles.billDetailLabel, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>Delivery Fee</Text>
            <Text style={[styles.billDetailValue, { color: selectedAddress ? (shipping === 0 ? '#10B981' : colors.textPrimary) : colors.textMuted, fontFamily: fontFamily.sansBold }]}>
              {selectedAddress ? (shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`) : 'Add address'}
            </Text>
          </View>

          {!isB2bUser && subtotal >= 1000 && (
            <View style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name="party-popper" size={15} color="#16A34A" />
              <Text style={{ color: '#15803D', fontFamily: fontFamily.sansMedium, fontSize: 11.5, flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.sansBold }}>Yay! Congratulations</Text>, you unlocked <Text style={{ fontFamily: fontFamily.sansBold, color: '#16A34A' }}>FREE Shipping</Text>! 🎉
              </Text>
            </View>
          )}

          {!isB2bUser && subtotal > 0 && subtotal < 1000 && (
            <View style={{ backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#99F6E4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppIcon name="truck-delivery-outline" size={15} color="#0D9488" />
              <Text style={{ color: '#0F766E', fontFamily: fontFamily.sansMedium, fontSize: 11.5, flex: 1 }}>
                Add ₹{(1000 - subtotal).toLocaleString('en-IN')} more to unlock <Text style={{ fontFamily: fontFamily.sansBold }}>FREE Shipping</Text>!
              </Text>
            </View>
          )}

          {giftingTotal > 0 && (
            <View style={styles.billDetailRow}>
              <Text style={[styles.billDetailLabel, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>
                Gift Packaging ({giftingItemKeys.length} {giftingItemKeys.length === 1 ? 'item' : 'items'})
              </Text>
              <Text style={[styles.billDetailValue, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                ₹{giftingTotal.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {paymentMethod === 'cod' && codCharge > 0 && (
            <View style={styles.billDetailRow}>
              <Text style={[styles.billDetailLabel, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>COD Handling Fee</Text>
              <Text style={[styles.billDetailValue, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                ₹{codCharge.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          {effectiveDiscount > 0 && (
            <View style={styles.billDetailRow}>
              <Text style={[styles.billDetailLabel, { color: '#059669', fontFamily: fontFamily.sansBold }]}>Coupon Discount</Text>
              <Text style={[styles.billDetailValue, { color: '#059669', fontFamily: fontFamily.sansBold }]}>
                -₹{effectiveDiscount.toLocaleString('en-IN')}
              </Text>
            </View>
          )}

          <View style={[styles.billDividerLine, { backgroundColor: colors.border }]} />

          <View style={styles.billGrandTotalRow}>
            <View>
              <Text style={[styles.billGrandTotalTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Total Payable</Text>
              <Text style={[styles.taxInclusiveNoteText, { color: colors.textMuted, fontFamily: fontFamily.sans }]}>Inclusive of all taxes</Text>
            </View>
            <Text style={[styles.billGrandTotalAmount, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
              ₹{finalAmount.toLocaleString('en-IN')}
            </Text>
          </View>

          {/* Wholesale B2B Min Order Warning */}
          {isB2bBelowMinOrder && (
            <View style={styles.b2bNoticeCard}>
              <View style={styles.b2bNoticeHeaderRow}>
                <AppIcon name="lock" size={15} color="#D97706" />
                <Text style={styles.b2bNoticeCardTitle}>Wholesale Minimum: ₹{B2B_MIN_ORDER.toLocaleString('en-IN')}</Text>
              </View>
              <Text style={styles.b2bNoticeCardSub}>
                Add ₹{(B2B_MIN_ORDER - subtotal).toLocaleString('en-IN')} more to unlock B2B checkout.
              </Text>
              <View style={styles.b2bProgressTrack}>
                <View style={[styles.b2bProgressFill, { width: `${Math.min((subtotal / B2B_MIN_ORDER) * 100, 100)}%` }]} />
              </View>
            </View>
          )}
        </View>

        {/* Safety & Trust Micro-Badges */}
        <View style={styles.trustBadgesRow}>
          <View style={styles.trustBadgeItem}>
            <AppIcon name="shield-check" size={16} color={colors.primary} />
            <Text style={[styles.trustBadgeText, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>100% Secure Payment</Text>
          </View>
          <View style={styles.trustBadgeDot} />
          <View style={styles.trustBadgeItem}>
            <AppIcon name="truck-fast-outline" size={16} color={colors.primary} />
            <Text style={[styles.trustBadgeText, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>Insured Delivery</Text>
          </View>
          <View style={styles.trustBadgeDot} />
          <View style={styles.trustBadgeItem}>
            <AppIcon name="certificate-outline" size={16} color={colors.primary} />
            <Text style={[styles.trustBadgeText, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>Authentic Quality</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Native Sticky Bottom Action Bar ── */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <View style={styles.bottomPriceCol}>
          <Text style={[styles.bottomTotalLabel, { color: colors.textMuted, fontFamily: fontFamily.sansBold }]}>TOTAL PAYABLE</Text>
          <Text style={[styles.bottomTotalPrice, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
            ₹{finalAmount.toLocaleString('en-IN')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={placing || processingCodCharge}
          activeOpacity={isB2bBelowMinOrder ? 0.8 : 0.88}
          style={[
            styles.bottomCtaBtn,
            {
              backgroundColor: isB2bBelowMinOrder
                ? (isDark ? '#2A2242' : '#EDE8F5')
                : colors.primary,
              borderWidth: isB2bBelowMinOrder ? 1 : 0,
              borderColor: isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(124, 58, 237, 0.15)',
            }
          ]}
        >
          {placing || processingCodCharge ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text
              style={[
                styles.bottomCtaBtnText,
                {
                  color: isB2bBelowMinOrder
                    ? (isDark ? '#94A3B8' : '#6B5E82')
                    : '#FFFFFF',
                  fontFamily: fontFamily.sansBold,
                }
              ]}
            >
              {isB2bBelowMinOrder
                ? `Min ₹3,000 Required`
                : paymentMethod === 'cod'
                  ? 'Confirm COD Order'
                  : 'Proceed to Pay'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Modal: Select Saved Delivery Address ── */}
      <Modal
        visible={showSelectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSelectModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowSelectModal(false)}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
          </TouchableOpacity>

          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.surface, maxHeight: '82%' }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: colors.primary + '18' }]}>
                  <AppIcon name="map-marker-radius-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitleText, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                  Select Delivery Address
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSelectModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceElevated }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppIcon name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Add New Address Row */}
            <TouchableOpacity
              onPress={() => {
                setShowSelectModal(false);
                setTimeout(() => setShowAddModal(true), 250);
              }}
              activeOpacity={0.8}
              style={[styles.addNewAddressBar, { borderColor: colors.primary, backgroundColor: colors.primary + '0A' }]}
            >
              <AppIcon name="plus-circle" size={19} color={colors.primary} />
              <Text style={[styles.addNewAddressBarText, { color: colors.primary, fontFamily: fontFamily.sansBold }]}>
                Add New Delivery Address
              </Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28, paddingTop: 10 }}>
              <View style={{ gap: 12 }}>
                {addresses.map(addr => {
                  const isSelected = selectedAddress?.id === addr.id;
                  const typeLabel = getAddrTypeLabel(addr);
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      onPress={() => handleAddressSelect(addr)}
                      activeOpacity={0.82}
                      style={[
                        styles.addressSelectCard,
                        {
                          backgroundColor: isSelected ? colors.primary + '0D' : colors.surfaceElevated,
                          borderColor: isSelected ? colors.primary : colors.border,
                        }
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Text style={[styles.selectCardName, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                            {profileName || user?.name || 'Recipient'}
                          </Text>
                          <View style={[styles.addressTypeBadge, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '40' }]}>
                            <Text style={[styles.addressTypeBadgeText, { color: colors.primary, fontFamily: fontFamily.sansBold }]}>
                              {typeLabel}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.selectCardDetails, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
                        </Text>
                        <Text style={[styles.selectCardCityPin, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                          {addr.cityName} - {addr.postal_code}
                        </Text>
                      </View>

                      {/* Radio Selector */}
                      <View style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        }
                      ]}>
                        {isSelected && <View style={styles.radioInnerDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Add New Delivery Address ── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowAddModal(false)}
          >
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
          </TouchableOpacity>

          <View style={[styles.bottomSheetContainer, { backgroundColor: colors.surface, maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.modalHeaderIconBox, { backgroundColor: colors.primary + '18' }]}>
                  <AppIcon name="plus" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitleText, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                  Add Delivery Address
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceElevated }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppIcon name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36, paddingTop: 10 }}>
              {/* Address Type Selector */}
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.inputLabel, { color: colors.textMuted, fontFamily: fontFamily.sansMedium, marginBottom: 8 }]}>
                  Address Type
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {[
                    { id: '1', label: 'Home', icon: 'home-outline' },
                    { id: '2', label: 'Work', icon: 'briefcase-outline' },
                    { id: '3', label: 'Other', icon: 'map-marker-outline' },
                  ].map(t => {
                    const isSel = form.Addtype === t.id;
                    return (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => setForm(p => ({ ...p, Addtype: t.id }))}
                        activeOpacity={0.8}
                        style={[
                          styles.typeChipBtn,
                          {
                            backgroundColor: isSel ? colors.primary + '18' : colors.surfaceElevated,
                            borderColor: isSel ? colors.primary : colors.border,
                            flex: 1,
                          }
                        ]}
                      >
                        <AppIcon name={t.icon as any} size={15} color={isSel ? colors.primary : colors.textMuted} />
                        <Text style={[styles.typeChipText, { color: isSel ? colors.primary : colors.textMuted, fontFamily: isSel ? fontFamily.sansBold : fontFamily.sansMedium }]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Recipient Full Name *</Text>
                <TextInput
                  value={form.recipientName}
                  onChangeText={v => setForm(p => ({ ...p, recipientName: v }))}
                  placeholder="Full name on courier package"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: formErrors.recipientName ? '#EF4444' : colors.border, color: colors.textPrimary, fontFamily: fontFamily.sansMedium }]}
                />
                {formErrors.recipientName && <Text style={styles.inputError}>{formErrors.recipientName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>Flat, House No., Building, Street *</Text>
                <TextInput
                  value={form.line1}
                  onChangeText={v => setForm(p => ({ ...p, line1: v }))}
                  placeholder="House / Flat No., Street name"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: formErrors.line1 ? '#EF4444' : colors.border, color: colors.textPrimary, fontFamily: fontFamily.sansMedium }]}
                />
                {formErrors.line1 && <Text style={styles.inputError}>{formErrors.line1}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted, fontFamily: fontFamily.sansMedium }]}>Area, Landmark (Optional)</Text>
                <TextInput
                  value={form.line2}
                  onChangeText={v => setForm(p => ({ ...p, line2: v }))}
                  placeholder="Nearby landmark, apartment name"
                  placeholderTextColor={colors.placeholder}
                  style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.textPrimary, fontFamily: fontFamily.sansMedium }]}
                />
              </View>

              <View style={styles.twoColRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>City *</Text>
                  <TextInput
                    value={form.cityName}
                    onChangeText={v => setForm(p => ({ ...p, cityName: v }))}
                    placeholder="City"
                    placeholderTextColor={colors.placeholder}
                    style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: formErrors.cityName ? '#EF4444' : colors.border, color: colors.textPrimary, fontFamily: fontFamily.sansMedium }]}
                  />
                  {formErrors.cityName && <Text style={styles.inputError}>{formErrors.cityName}</Text>}
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>PIN Code *</Text>
                  <TextInput
                    value={form.postal_code}
                    onChangeText={v => setForm(p => ({ ...p, postal_code: v }))}
                    placeholder="6-digit PIN"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: formErrors.postal_code ? '#EF4444' : colors.border, color: colors.textPrimary, fontFamily: fontFamily.sansMedium }]}
                  />
                  {formErrors.postal_code && <Text style={styles.inputError}>{formErrors.postal_code}</Text>}
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSaveAddress}
                disabled={savingAddress}
                activeOpacity={0.85}
                style={[styles.saveAddressBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              >
                {savingAddress ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[styles.saveAddressBtnText, { fontFamily: fontFamily.sansBold }]}>Save Address & Deliver Here</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  authRequiredTitle: {
    fontSize: 18,
    marginTop: 14,
  },
  authRequiredSub: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  signInBtn: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },

  /* Name Alert Banner */
  nameAlertBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  nameAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameAlertTitle: {
    fontSize: 13,
    color: '#92400E',
  },
  nameAlertSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 1,
  },
  nameInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  nameInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  nameSaveBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSaveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  nameSavedSuccessText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  /* Native Grouped Section */
  nativeSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14.5,
    letterSpacing: 0.2,
  },
  changeAddressBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 16,
  },
  changeAddressBtnText: {
    fontSize: 10.5,
    letterSpacing: 0.6,
  },

  /* Address Card Surface */
  addressCardSurface: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 3,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recipientNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  recipientNameText: {
    fontSize: 14,
  },
  recipientPhoneText: {
    fontSize: 12,
  },
  addressTypeBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addressTypeBadgeText: {
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressBodyText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  addressCityPinText: {
    fontSize: 13,
    marginTop: 2,
  },
  deliveryPromiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 8,
  },
  deliveryPromiseText: {
    fontSize: 11.5,
  },
  noAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAddressTitle: {
    fontSize: 13.5,
  },
  noAddressSub: {
    fontSize: 11.5,
    marginTop: 1,
  },

  /* Multi-select Header & Checkbox Controls */
  checkoutSelectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  checkoutMiniCheckbox: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBulkRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  checkoutItemCheckboxTouch: {
    paddingRight: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Item Row Container */
  itemRowContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
  },
  itemThumbnail: {
    width: 74,
    height: 74,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemThumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContentCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
    minHeight: 74,
  },
  itemTitleText: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  itemMetaTagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  checkoutQtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    gap: 4,
  },
  checkoutQtyBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutQtyText: {
    fontSize: 11.5,
    minWidth: 16,
    textAlign: 'center',
  },
  itemMetaBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  itemMetaBadgeText: {
    fontSize: 10.5,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  giftWrapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  giftWrapText: {
    fontSize: 11,
  },
  miniCheckCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  itemPriceBlock: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  itemFinalPriceText: {
    fontSize: 14.5,
  },
  itemOriginalPriceText: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },

  /* Payment Method */
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  customRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentMethodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentOptionTitle: {
    fontSize: 13.5,
  },
  instantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  instantBadgeText: {
    fontSize: 8.5,
    color: '#059669',
    fontWeight: '800',
  },
  codBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  codBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  paymentOptionSub: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },

  /* Coupons */
  appliedCouponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  couponIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appliedCouponCode: {
    fontSize: 13,
    color: '#065F46',
  },
  appliedCouponSavings: {
    fontSize: 11.5,
    color: '#047857',
    marginTop: 1,
  },
  removeCouponBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  removeCouponText: {
    color: '#DC2626',
    fontSize: 12,
  },
  couponNativeInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  couponNativeInput: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  couponApplyButton: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponApplyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  availableCouponsWrapper: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  availableCouponsHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  availableCouponsTitle: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  couponOfferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  couponCodePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  couponCodePillText: {
    fontSize: 12,
    letterSpacing: 0.8,
  },
  discountTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  discountTagText: {
    fontSize: 10.5,
  },
  couponDescText: {
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
  },
  couponMinOrderText: {
    fontSize: 10.5,
    marginTop: 3,
  },
  couponItemApplyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.2,
  },
  couponItemApplyBtnText: {
    fontSize: 11.5,
    letterSpacing: 0.5,
  },

  /* Bill Details */
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  billDetailLabel: {
    fontSize: 13,
  },
  billDetailValue: {
    fontSize: 13,
  },
  billDividerLine: {
    height: 1,
    marginVertical: 10,
  },
  billGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  billGrandTotalTitle: {
    fontSize: 15,
  },
  taxInclusiveNoteText: {
    fontSize: 11,
    marginTop: 1,
  },
  billGrandTotalAmount: {
    fontSize: 18,
  },

  /* B2B Minimum Order */
  b2bNoticeCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  b2bNoticeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  b2bNoticeCardTitle: {
    color: '#92400E',
    fontSize: 12.5,
    fontWeight: '700',
  },
  b2bNoticeCardSub: {
    color: '#B45309',
    fontSize: 11.5,
    marginTop: 2,
  },
  b2bProgressTrack: {
    height: 5,
    backgroundColor: '#FDE68A',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  b2bProgressFill: {
    height: '100%',
    backgroundColor: '#D97706',
  },

  /* Trust Badges */
  trustBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 8,
    gap: 8,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trustBadgeText: {
    fontSize: 11,
  },
  trustBadgeDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
  },

  /* Sticky Bottom Bar */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    borderTopWidth: 1,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  bottomPriceCol: {
    justifyContent: 'center',
  },
  bottomTotalLabel: {
    fontSize: 9.5,
    letterSpacing: 0.6,
  },
  bottomTotalPrice: {
    fontSize: 19,
    lineHeight: 24,
  },
  bottomCtaBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomCtaBtnText: {
    color: '#fff',
    fontSize: 14.5,
    letterSpacing: 0.4,
  },

  /* Bottom Sheet Modals */
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.3)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  modalHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleText: {
    fontSize: 16,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewAddressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 14,
    marginBottom: 6,
  },
  addNewAddressBarText: {
    fontSize: 13,
  },
  addressSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  selectCardName: {
    fontSize: 14,
  },
  selectCardDetails: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 2,
  },
  selectCardCityPin: {
    fontSize: 12.5,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },

  /* Address Form Inputs */
  typeChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 10,
  },
  typeChipText: {
    fontSize: 12.5,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 5,
  },
  textInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputError: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 3,
  },
  saveAddressBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAddressBtnText: {
    color: '#fff',
    fontSize: 14,
  },
});
