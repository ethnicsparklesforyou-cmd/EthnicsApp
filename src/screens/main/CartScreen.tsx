import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PageHeader, Screen, useAppModal } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAddresses } from '../../services/address';
import { fetchCartEstimation, fetchServerCart, normalizeCartEstimationResponse, removeFromServerCart } from '../../services/cart';
import { getFirstImageUrl } from '../../utils/imageUtils';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Cart'> };

const B2B_MIN_ORDER = 3000;

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

function unwrapObject<T>(res: any): T | null {
  const data = res?.data ?? res?.result ?? res?.payload ?? res;
  return data?.data ?? data ?? null;
}

/** Normalize full cart items from server (same as web's normalizeCartItems) */
function normalizeServerItems(res: any): any[] {
  let arr: any[] = [];
  if (Array.isArray(res?.data?.data)) arr = res.data.data;
  else if (Array.isArray(res?.data)) arr = res.data;
  else if (Array.isArray(res?.data?.data?.items)) arr = res.data.data.items;
  else if (Array.isArray(res?.data?.items)) arr = res.data.items;
  else if (Array.isArray(res?.data?.data?.cart?.items)) arr = res.data.data.cart.items;
  return arr.map((it: any, idx: number) => ({
    id: it.id ?? it.productId ?? idx + 1,
    productId: it.productId ?? it.id ?? idx + 1,
    cartItemId: it.id ?? it.cartItemId ?? it.itemId,
    name: it.name ?? it.productName ?? it.product?.name ?? 'Product',
    price: Number(it.price ?? it.product?.basePrice ?? 0),
    basePrice: Number(it.basePrice ?? it.product?.basePrice ?? it.price ?? 0),
    discountPrice: Number(it.discountPrice ?? it.product?.discountPrice ?? 0),
    b2bPrice: Number(it.b2bPrice ?? it.product?.b2bPrice ?? 0),
    isB2b: it.isB2b ?? it.product?.isB2b ?? false,
    isBoth: it.isBoth ?? it.product?.isBoth ?? false,
    stockQuantity: Number(it.stockQuantity ?? it.product?.stockQuantity ?? 99),
    minQuantity: Number(it.minQuantity ?? it.product?.minQuantity ?? 1),
    quantity: Number(it.quantity ?? 1),
    image: it.imageUrl ?? it.image ?? it.productImage ?? it.product?.imageUrl ?? getFirstImageUrl(it) ?? getFirstImageUrl(it.product),
    size: it.selectedSize ?? it.size ?? null,
    weight: it.weight ?? it.product?.weight ?? '',
    discount: it.discount ?? 0,
  }));
}

export function CartScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { items: ctxItems, totalItems, updateQty, removeItem } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { show } = useAppModal();

  const [serverItems, setServerItems] = useState<any[]>([]);
  const [estimation, setEstimation] = useState<any>(null);
  const [loadingEst, setLoadingEst] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [hasAddress, setHasAddress] = useState(false);
  const [shippingPincode, setShippingPincode] = useState<string>('');
  const pendingRemovals = useRef<Set<string>>(new Set());

  const isB2bUser = user?.userRole === 2 || user?.roleName === 'B2b Customer';

  const getEffectiveUnitPrice = (item: any) => {
    const isB2bProduct = item?.isB2b || item?.isBoth;
    if (isB2bUser && isB2bProduct && item?.b2bPrice) return Number(item.b2bPrice);
    const basePrice = Number(item?.basePrice || item?.price || 0);
    const discountPrice = Number(item?.discountPrice || 0);
    if (basePrice > 0 && discountPrice > 0 && discountPrice < basePrice) return basePrice - discountPrice;
    return basePrice;
  };

  const serverItemMap = useMemo(() => {
    const map = new Map<string, any>();
    serverItems.forEach(item => map.set(String(item.productId), item));
    return map;
  }, [serverItems]);

  // Local cart state is the source of truth for quantity and removal.
  // Server items are used only to enrich the local rows with full product data.
  const items = useMemo(
    () => ctxItems
      .map(item => {
        const serverItem = serverItemMap.get(String(item.productId));
        return {
          ...serverItem,
          ...item,
          cartItemId: serverItem?.cartItemId ?? item.cartItemId,
          basePrice: serverItem?.basePrice ?? serverItem?.price ?? item.price,
          discountPrice: serverItem?.discountPrice ?? item.discountPrice ?? 0,
          b2bPrice: serverItem?.b2bPrice ?? item.b2bPrice,
          isB2b: serverItem?.isB2b ?? item.isB2b,
          isBoth: serverItem?.isBoth ?? item.isBoth,
          stockQuantity: serverItem?.stockQuantity ?? item.stockQuantity,
          minQuantity: serverItem?.minQuantity ?? item.minQuantity,
          image: item.image || serverItem?.image,
          name: item.name || serverItem?.name,
          weight: serverItem?.weight ?? item.weight,
          size: item.size ?? serverItem?.size ?? null,
        };
      })
      .filter(item => !pendingRemovals.current.has(String(item.id ?? item.productId))),
    [ctxItems, serverItemMap]
  );
  const optimisticTotalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const optimisticTotalAmount = useMemo(() => items.reduce((sum, item) => sum + getEffectiveUnitPrice(item) * item.quantity, 0), [items]);

  const refreshEstimation = async (pincode?: string) => {
    if (!user?.id) return;
    const estRes = await fetchCartEstimation(user.id, pincode).catch(() => null);
    const estimation = normalizeCartEstimationResponse(estRes);
    if (estimation) setEstimation({ ...estimation, addressFound: Boolean(pincode) });
  };

  useEffect(() => {
    if (!isAuthenticated || !user || ctxItems.length === 0) {
      setEstimation(null);
      setServerItems([]);
      setHasAddress(false);
      return;
    }
    setLoadingEst(true);
    setLoadingItems(true);

    Promise.all([
      fetchAddresses(user.id),
      fetchServerCart(user.id),
    ])
      .then(async ([addrRes, cartRes]) => {
        const fullItems = normalizeServerItems(cartRes);
        if (fullItems.length > 0) setServerItems(fullItems);
        setLoadingItems(false);

        const addresses = unwrapList<any>(addrRes);
        const hasAddr = addresses.length > 0;
        setHasAddress(hasAddr);

        if (hasAddr) {
          const defaultAddress = addresses.find((addr: any) => addr.isDefault) || addresses[0];
          const pin = getPostalCode(defaultAddress);
          setShippingPincode(pin);
          await refreshEstimation(pin || undefined);
        } else {
          setShippingPincode('');
          await refreshEstimation();
        }
      })
      .catch(() => { setLoadingItems(false); })
      .finally(() => setLoadingEst(false));
  }, [isAuthenticated, user?.id, ctxItems.length]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || items.length === 0) return;
    const timer = setTimeout(() => {
      void refreshEstimation(shippingPincode || undefined);
    }, 250);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user?.id, items.length, shippingPincode]);

  const subtotal = optimisticTotalAmount;
  const gstRate = estimation?.gstRate ?? 3;
  const gstAmount = subtotal * gstRate / 100;
  const shipping = estimation?.shippingCharge ?? estimation?.deliveryEstimate?.freight_charge ?? 0;
  const shippingPartner = estimation?.shippingPartner ?? estimation?.deliveryEstimate?.courier_name ?? null;
  const finalAmount = subtotal + gstAmount + shipping;

  const handleRemove = (item: any) => {
    show({
      type: 'confirm',
      title: 'Remove Item',
      message: `Remove "${item.name}" from your cart?`,
      actions: [
        { label: 'Cancel', onPress: () => {}, variant: 'outline' },
        { label: 'Remove', variant: 'danger', onPress: async () => {
          pendingRemovals.current.add(String(item.id));
          if (isAuthenticated && item.cartItemId) await removeFromServerCart(item.cartItemId).catch(() => {});
          removeItem(item.productId);
          setServerItems(prev => prev.filter(i => i.productId !== item.productId));
          pendingRemovals.current.delete(String(item.id));
          void refreshEstimation(shippingPincode || undefined);
        }},
      ],
    });
  };

  const handleQtyChange = async (item: any, newQty: number) => {
    if (newQty < 1) return;
    const maxQty = Number(item.stockQuantity ?? 99);
    if (newQty > maxQty) return;
    if (isB2bUser && (item.isB2b || item.isBoth) && newQty < (item.minQuantity || 1)) {
      show({ type: 'warning', title: 'Minimum Quantity', message: `Minimum quantity required: ${item.minQuantity}` });
      return;
    }
    await updateQty(item.productId, newQty);
    setServerItems(prev => prev.map(i => i.productId === item.productId ? { ...i, quantity: newQty } : i));
    void refreshEstimation(shippingPincode || undefined);
  };

  if (items.length === 0 && !loadingItems) {
    return (
      <Screen>
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated, borderRadius: radius.full }]}>
            <View style={[styles.emptyBag, { borderColor: colors.textMuted }]} />
            <View style={[styles.emptyHandle, { borderColor: colors.textMuted }]} />
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xl, marginTop: 20, textAlign: 'center' }}>
            Your cart is empty
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Discover our exquisite jewellery collection
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('HomeTabs', { screen: 'Shop' } as any)}
            style={[styles.shopBtn, { backgroundColor: colors.primary, borderRadius: radius.xl, marginTop: 24 }]}>
            <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
              Explore Collection
            </Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title="Shopping Cart"
        subtitle={`${totalItems} ${totalItems === 1 ? 'item' : 'items'} ready for checkout`}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={items}
        keyExtractor={item => String(item.productId)}
        contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const effectivePrice = getEffectiveUnitPrice(item);
          const originalPrice = Number(item.basePrice || item.price || 0);
          const hasDiscount = !isB2bUser && item.discountPrice > 0 && item.discountPrice < originalPrice;
          const maxQty = Number(item.stockQuantity ?? 99);
          const isOutOfStock = maxQty === 0;
          const isLowStock = !isOutOfStock && item.quantity >= maxQty;
          const imageUrl = item.image || getFirstImageUrl(item);

          return (
            <View style={[styles.cartItem, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
              {/* Image with out-of-stock overlay */}
              <View>
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={[styles.itemImg, { borderRadius: radius.lg, opacity: isOutOfStock ? 0.5 : 1 }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemImg, { backgroundColor: colors.surfaceElevated, borderRadius: radius.lg }]} />
                )}
                {isOutOfStock && (
                  <View style={[styles.outOfStockOverlay, { borderRadius: radius.lg }]}>
                    <Text style={styles.outOfStockText}>Out of Stock</Text>
                  </View>
                )}
                {/* Discount badge */}
                {hasDiscount && !isOutOfStock && (
                  <View style={[styles.discountBadge, { backgroundColor: colors.error }]}>
                    <Text style={styles.discountBadgeText}>
                      -{Math.round((item.discountPrice / originalPrice) * 100)}%
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm, lineHeight: 18 }} numberOfLines={2}>
                  {item.name}
                </Text>

                {/* Size + weight tags */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {item.size && (
                    <View style={[styles.tag, { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm }]}>
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10 }}>Size: {item.size}</Text>
                    </View>
                  )}
                  {item.weight ? (
                    <View style={[styles.tag, { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm }]}>
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10 }}>{item.weight}g</Text>
                    </View>
                  ) : null}
                  {isB2bUser && (item.isB2b || item.isBoth) && (item.minQuantity || 1) > 1 && (
                    <View style={[styles.tag, { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm }]}>
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10 }}>{item.minQuantity} units/pkg</Text>
                    </View>
                  )}
                </View>

                {/* Stock warnings */}
                {isOutOfStock ? (
                  <Text style={{ color: colors.error, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 4 }}>
                    Currently unavailable
                  </Text>
                ) : isLowStock ? (
                  <Text style={{ color: '#D97706', fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 4 }}>
                    Only {item.stockQuantity} left
                  </Text>
                ) : null}

                {/* Price */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
                    ₹{(effectivePrice * item.quantity).toLocaleString('en-IN')}
                  </Text>
                  {hasDiscount && (
                    <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, textDecorationLine: 'line-through' }}>
                      ₹{(originalPrice * item.quantity).toLocaleString('en-IN')}
                    </Text>
                  )}
                </View>

                {/* Qty stepper + remove */}
                <View style={styles.qtyRow}>
                  <View style={[styles.qtyControl, { borderColor: colors.border, borderRadius: radius.lg }]}>
                    <TouchableOpacity
                      onPress={() => item.quantity > 1 ? handleQtyChange(item, item.quantity - 1) : handleRemove(item)}
                      style={styles.qtyBtn}>
                      <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '600', lineHeight: 20 }}>−</Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm, minWidth: 24, textAlign: 'center' }}>
                      {item.quantity}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleQtyChange(item, item.quantity + 1)}
                      disabled={item.quantity >= maxQty}
                      style={[styles.qtyBtn, { opacity: item.quantity >= maxQty ? 0.3 : 1 }]}>
                      <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '600', lineHeight: 20 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn}>
                    <Text style={{ color: colors.error, fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs }}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
                {maxQty > 0 && (
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, marginTop: 6 }}>
                    Max {maxQty} in cart
                  </Text>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl }]}>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base, marginBottom: 4 }}>
              Order Summary
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginBottom: 12 }}>
              Review totals before checkout
            </Text>

            <>
              <SumRow label={`Subtotal (${optimisticTotalItems} items)`} value={`₹${subtotal.toLocaleString('en-IN')}`} colors={colors} fontFamily={fontFamily} fontSize={fontSize} />
              <SumRow label={`GST (${gstRate}%)`} value={`₹${gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} colors={colors} fontFamily={fontFamily} fontSize={fontSize} />
              <SumRow
                label={`Shipping${shippingPartner ? ` (${shippingPartner})` : ''}`}
                value={!hasAddress ? 'Add address' : shipping === 0 ? 'Free' : `₹${shipping.toLocaleString('en-IN')}`}
                valueColor={shipping === 0 && hasAddress ? '#16A34A' : undefined}
                colors={colors} fontFamily={fontFamily} fontSize={fontSize}
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <SumRow label="Total" value={`₹${finalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} bold colors={colors} fontFamily={fontFamily} fontSize={fontSize} />

              {loadingEst && (
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 8 }}>
                  Updating summary...
                </Text>
              )}

              {/* B2B shipping note */}
              {estimation?.deliveryEstimate?.b2b_shipping && (
                <View style={[styles.infoBanner, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderRadius: radius.lg, marginTop: 10 }]}>
                  <Text style={{ color: '#1E40AF', fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>
                    B2B shipping applies
                  </Text>
                  <Text style={{ color: '#3B82F6', fontFamily: fontFamily.sans, fontSize: 10, marginTop: 2 }}>
                    First 1 kg is ₹{estimation.deliveryEstimate.base_charge}. Extra weight charged separately.
                  </Text>
                </View>
              )}

              {/* Free shipping threshold (B2C only) */}
              {!isB2bUser && subtotal > 0 && subtotal <= 1000 && (
                <View style={[styles.infoBanner, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4', borderRadius: radius.lg, marginTop: 10 }]}>
                  <Text style={{ color: '#0F766E', fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>
                    Add ₹{(1001 - subtotal).toLocaleString('en-IN')} more for free shipping!
                  </Text>
                </View>
              )}
              {!isB2bUser && shipping === 0 && subtotal > 1000 && hasAddress && (
                <View style={[styles.infoBanner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderRadius: radius.lg, marginTop: 10 }]}>
                  <Text style={{ color: '#16A34A', fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>
                    ✓ Free shipping applied on orders above ₹1,000!
                  </Text>
                </View>
              )}

              {isB2bUser && subtotal > 0 && subtotal < B2B_MIN_ORDER && (
                <View style={[styles.b2bBanner, { backgroundColor: '#F0FDFA', borderColor: '#99F6E4', borderRadius: radius.lg, marginTop: 10 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#134E4A', fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>
                        You're almost there
                      </Text>
                      <Text style={{ color: '#0F766E', fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 2 }}>
                        Spend ₹{(B2B_MIN_ORDER - subtotal).toLocaleString('en-IN')} more to reach the ₹3,000 B2B minimum.
                      </Text>
                    </View>
                    <View style={[styles.b2bPill, { borderColor: '#99F6E4' }]}>
                      <Text style={{ color: '#134E4A', fontFamily: fontFamily.sansBold, fontSize: 10 }}>B2B</Text>
                    </View>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: '#CCFBF1', borderRadius: radius.full, marginTop: 8 }]}>
                    <View style={[styles.progressFill, { backgroundColor: '#0D9488', borderRadius: radius.full, width: `${Math.min((subtotal / B2B_MIN_ORDER) * 100, 100)}%` as any }]} />
                  </View>
                </View>
              )}
            </>

            <TouchableOpacity
              onPress={() => {
                if (!isAuthenticated) {
                  setShowGuestModal(true);
                  return;
                }
                if (isB2bUser && subtotal < B2B_MIN_ORDER) {
                  show({ type: 'warning', title: 'Minimum Order Required', message: `B2B orders require a minimum of ₹${B2B_MIN_ORDER.toLocaleString('en-IN')}.` });
                  return;
                }
                navigation.navigate('Checkout');
              }}
              style={[styles.checkoutBtn, {
                backgroundColor: (isB2bUser && subtotal < B2B_MIN_ORDER) ? colors.border : colors.primary,
                borderRadius: radius.xl,
                marginTop: 16,
                opacity: (isB2bUser && subtotal < B2B_MIN_ORDER) ? 0.6 : 1,
              }]}>
              <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
                Proceed to Checkout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('HomeTabs', { screen: 'Shop' } as any)}
              style={[styles.continueBtn, { borderColor: colors.border, borderRadius: radius.xl, marginTop: 10 }]}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>
                Continue Shopping
              </Text>
            </TouchableOpacity>

            <View style={[styles.secureRow, { marginTop: 14 }]}>
              {['Secure Checkout', 'SSL Encrypted', 'PCI Compliant'].map(t => (
                <View key={t} style={[styles.securePill, { backgroundColor: colors.surfaceElevated, borderRadius: radius.full }]}>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10 }}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        }
      />

      {showGuestModal && (
        <GuestCheckoutModal
          onClose={() => setShowGuestModal(false)}
          onSuccess={() => {
            setShowGuestModal(false);
            navigation.navigate('Checkout');
          }}
          colors={colors}
          fontFamily={fontFamily}
          fontSize={fontSize}
          radius={radius}
        />
      )}
    </Screen>
  );
}

function SumRow({ label, value, bold, valueColor, colors, fontFamily, fontSize }: any) {
  return (
    <View style={styles.sumRow}>
      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>{label}</Text>
      <Text style={{ color: valueColor || colors.textPrimary, fontFamily: bold ? fontFamily.sansBold : fontFamily.sansMedium, fontSize: bold ? fontSize.base : fontSize.sm }}>
        {value}
      </Text>
    </View>
  );
}

function GuestCheckoutModal({ onClose, onSuccess, colors, fontFamily, fontSize, radius }: any) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { show } = useAppModal();

  const handleContinue = () => {
    if (phone.length !== 10) {
      show({ type: 'warning', title: 'Invalid Number', message: 'Please enter a valid 10-digit mobile number' });
      return;
    }
    show({
      type: 'info',
      title: 'Login Required',
      message: 'Please login or register to continue with checkout.',
      actions: [
        { label: 'Cancel', onPress: onClose, variant: 'outline' },
        { label: 'Login', onPress: onSuccess, variant: 'primary' },
      ],
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface, borderRadius: radius.xl }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg }}>
                Verify to checkout
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 2 }}>
                Enter your mobile number
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={{ color: colors.textMuted, fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <View style={[styles.countryCode, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.lg }]}>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>+91</Text>
              </View>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.placeholder}
                keyboardType="phone-pad"
                maxLength={10}
                style={[styles.phoneInput, {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  fontFamily: fontFamily.sans,
                  fontSize: fontSize.sm,
                  borderRadius: radius.lg,
                  flex: 1,
                }]}
              />
            </View>

            <TouchableOpacity
              onPress={handleContinue}
              disabled={loading || phone.length < 10}
              style={[styles.continueBtn2, {
                backgroundColor: phone.length >= 10 ? colors.primary : colors.border,
                borderRadius: radius.xl,
                opacity: loading ? 0.7 : 1,
              }]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
                  Continue
                </Text>
              )}
            </TouchableOpacity>

            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, textAlign: 'center', marginTop: 12 }}>
              Your cart items are safe and will be preserved
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  emptyBag: { width: 32, height: 24, borderWidth: 2, borderRadius: 4, marginTop: 10 },
  emptyHandle: { position: 'absolute', top: 14, width: 16, height: 12, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 2, borderBottomWidth: 0 },
  shopBtn: { paddingHorizontal: 28, paddingVertical: 14 },
  cartItem: { flexDirection: 'row', borderWidth: 1, padding: 14, marginBottom: 12, gap: 12 },
  itemImg: { width: 86, height: 86 },
  outOfStockOverlay: { position: 'absolute', top: 0, left: 0, width: 86, height: 86, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  outOfStockText: { color: '#fff', fontSize: 9, fontWeight: '700', textAlign: 'center', textTransform: 'uppercase' },
  discountBadge: { position: 'absolute', top: -4, right: -4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 10 },
  discountBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  tag: { paddingHorizontal: 8, paddingVertical: 3 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: 2 },
  qtyBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  summary: { borderWidth: 1, padding: 16, marginTop: 4 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  divider: { height: 1, marginVertical: 10 },
  infoBanner: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  b2bBanner: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  b2bPill: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  progressTrack: { height: 8, overflow: 'hidden' },
  progressFill: { height: 8 },
  checkoutBtn: { paddingVertical: 15, alignItems: 'center' },
  continueBtn: { paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  secureRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  securePill: { paddingHorizontal: 8, paddingVertical: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, borderBottomWidth: 1, gap: 12 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  countryCode: { paddingHorizontal: 16, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 8 },
  phoneInput: { height: 48, paddingHorizontal: 14, borderWidth: 1 },
  continueBtn2: { paddingVertical: 14, alignItems: 'center' },
});
