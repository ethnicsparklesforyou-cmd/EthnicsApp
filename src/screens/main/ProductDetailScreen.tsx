import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, Screen, useAppModal } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { fetchProductById, fetchProducts } from '../../services/products';
import { addToServerCart } from '../../services/cart';
import { getFirstImageUrl } from '../../utils/imageUtils';
import { ProductCard } from '../../components/ProductCard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';

const { width: W } = Dimensions.get('window');
const HERO_H = Math.round(W * 1.08);

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ProductDetail'>;
  route: RouteProp<MainStackParamList, 'ProductDetail'>;
};

export function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const insets = useSafeAreaInsets();
  const topOffset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 44);

  const { theme, isDark } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { user, isAuthenticated } = useAuth();
  const { items: cartItems, addItem } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();
  const { show } = useAppModal();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [related, setRelated] = useState<any[]>([]);
  const galleryListRef = useRef<FlatList>(null);

  const cartItem = useMemo(() => cartItems.find(i => i.productId === productId), [cartItems, productId]);
  const wishlisted = isWishlisted(productId);

  useEffect(() => {
    setLoading(true);
    setProduct(null);
    setSelectedImage(0);
    setSelectedSize('');
    setQuantity(1);
    fetchProductById(productId)
      .then(res => {
        const p = res?.data;
        if (p) {
          setProduct(p);
          if (p.size?.length) setSelectedSize(p.size[0].name);
        }
      })
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    if (product.subcategoryId) {
      const firstSubcatId = parseInt(String(product.subcategoryId).split(',')[0], 10);
      fetchProducts({ subcategoryId: [firstSubcatId], limit: 8 }).then(res =>
        setRelated((res?.data?.products || []).filter((p: any) => p.id !== product.id)),
      );
    }
  }, [product?.id]);

  const rawBase = parseFloat(product?.basePrice || product?.price || '0');
  const rawDiscount = parseFloat(product?.discountPrice || '0');

  const price = rawBase > 0 ? (rawDiscount > 0 ? rawBase - rawDiscount : rawBase) : 0;
  const originalPrice = rawBase > 0 ? rawBase : price;
  const hasDiscount = rawDiscount > 0 && originalPrice > price;
  const discountPct = hasDiscount ? Math.round((rawDiscount / originalPrice) * 100) : 0;
  const savings = rawDiscount;
  const stockQty = typeof product?.stockQuantity === 'number'
    ? product.stockQuantity
    : (parseInt(String(product?.stockQuantity || '0'), 10) || 0);
  const outOfStock = stockQty <= 0;

  const currentInCart = cartItem?.quantity || 0;
  const maxAvailableToAdd = Math.max(0, stockQty - currentInCart);
  const isMaxInCart = stockQty > 0 && currentInCart >= stockQty;

  const images: string[] = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      const list = product.images.map((img: any) => (typeof img === 'string' ? img : img?.imageUrl || '')).filter(Boolean);
      if (list.length > 0) return list;
    }
    const fallback = getFirstImageUrl(product);
    return fallback ? [fallback] : [];
  }, [product]);

  const addCurrentProduct = () => {
    if (!product) return false;
    if (product.size?.length && !selectedSize) {
      show({ type: 'warning', title: 'Size Required', message: 'Please select a size before adding to bag.' });
      return false;
    }
    if (outOfStock) {
      show({ type: 'error', title: 'Out of Stock', message: 'This item is currently out of stock.' });
      return false;
    }
    if (isMaxInCart) {
      show({ type: 'warning', title: 'Max Stock in Bag', message: `You already have ${currentInCart} ${currentInCart === 1 ? 'item' : 'items'} in your bag, which is the total available in stock (${stockQty}).` });
      return false;
    }
    if (quantity > maxAvailableToAdd) {
      show({ type: 'warning', title: 'Limited Stock', message: `Only ${stockQty} available in stock. You already have ${currentInCart} in your bag. You can add at most ${maxAvailableToAdd} more.` });
      return false;
    }

    const finalPrice = rawDiscount > 0 ? rawBase - rawDiscount : rawBase;
    const imageUrl = images[0] || getFirstImageUrl(product);
    addItem({
      productId: product.id,
      name: product.name,
      price: finalPrice,
      quantity,
      image: imageUrl || undefined,
      size: selectedSize || null,
      stockQuantity: stockQty,
    });
    if (isAuthenticated && user) {
      addToServerCart({ userId: user.id, productId: product.id, quantity, size: selectedSize || null }).catch(() => { });
    }
    return true;
  };

  const handleAddToCart = () => {
    addCurrentProduct();
  };

  const handleBuyNow = () => {
    const ok = addCurrentProduct();
    if (!ok) return;
    if (!isAuthenticated) {
      navigation.getParent()?.navigate('Auth' as never);
    } else {
      navigation.navigate('Checkout');
    }
  };

  if (loading) {
    return (
      <Screen style={{ backgroundColor: colors.background }}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen style={{ backgroundColor: colors.background }}>
        <View style={styles.center}>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg }}>Creation not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.primary }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* ── Fixed Floating Top Navigation Bar ── */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: topOffset + 6,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingHorizontal: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.85}
          style={[
            styles.floatingNavBtn,
            {
              backgroundColor: isDark ? 'rgba(24, 20, 36, 0.82)' : 'rgba(255, 255, 255, 0.88)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
              borderRadius: radius.full,
            }
          ]}
        >
          <AppIcon name="chevron-left" color={colors.textPrimary} size={22} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => toggleWishlist(product.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.85}
            style={[
              styles.floatingNavBtn,
              {
                backgroundColor: isDark ? 'rgba(24, 20, 36, 0.82)' : 'rgba(255, 255, 255, 0.88)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                borderRadius: radius.full,
              }
            ]}
          >
            <AppIcon name={wishlisted ? 'heart' : 'heart-outline'} color={wishlisted ? '#EF4444' : colors.textPrimary} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>

        {/* ── Hero Swipable Image Gallery ── */}
        <View style={[styles.heroContainer, { backgroundColor: isDark ? '#1C1929' : '#F7F4EF', height: HERO_H }]}>
          {images.length > 0 ? (
            <FlatList
              ref={galleryListRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => `gallery-img-${i}`}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / W);
                setSelectedImage(idx);
              }}
              renderItem={({ item }) => (
                <View style={{ width: W, height: HERO_H }}>
                  <Image
                    source={{ uri: item }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              )}
            />
          ) : (
            <View style={[styles.center, { width: W, height: HERO_H }]}>
              <AppIcon name="diamond-stone" size={64} color={colors.primary} />
            </View>
          )}

          {outOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          )}

          {/* Floating Image Counter Badge */}
          {images.length > 1 && (
            <View style={[styles.counterBadge, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
              <Text style={styles.counterText}>
                {selectedImage + 1} / {images.length}
              </Text>
            </View>
          )}
        </View>

        {/* ── Thumbnails Strip ── */}
        {images.length > 1 && (
          <View style={{ marginTop: 10, paddingHorizontal: 16 }}>
            <FlatList
              data={images}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
              keyExtractor={(_, i) => `thumb-${i}`}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedImage(index);
                    galleryListRef.current?.scrollToIndex({ index, animated: true });
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.thumbWrap,
                      {
                        borderColor: selectedImage === index ? colors.primary : colors.border,
                        borderWidth: selectedImage === index ? 2 : 1,
                        borderRadius: radius.md,
                      }
                    ]}
                  >
                    <Image source={{ uri: item }} style={styles.thumb} resizeMode="cover" />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ── Main Details Content ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 14 }}>

          {/* Product Title & Stock Status */}
          <View>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 22, lineHeight: 28, letterSpacing: 0.2 }}>
              {product.name}
            </Text>

            {/* In-Stock Pill */}
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {!outOfStock ? (
                <View style={[styles.stockPill, { backgroundColor: '#05966914', borderColor: '#05966935' }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669' }} />
                  <Text style={{ color: '#059669', fontFamily: fontFamily.sansBold, fontSize: 11 }}>
                    In Stock ({stockQty} available)
                  </Text>
                </View>
              ) : (
                <View style={[styles.stockPill, { backgroundColor: '#EF444414', borderColor: '#EF444435' }]}>
                  <Text style={{ color: '#EF4444', fontFamily: fontFamily.sansBold, fontSize: 11 }}>
                    Out of Stock
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Modern Luxury Price Box ── */}
          <View style={[styles.priceBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.xl, marginTop: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 30, letterSpacing: -0.5 }}>
                ₹{price.toLocaleString('en-IN')}
              </Text>
              {hasDiscount && (
                <>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 15, textDecorationLine: 'line-through' }}>
                    MRP ₹{originalPrice.toLocaleString('en-IN')}
                  </Text>
                  <View style={[styles.savePillBadge, { backgroundColor: '#05966914', borderColor: '#05966935' }]}>
                    <Text style={{ color: '#059669', fontFamily: fontFamily.sansBold, fontSize: 11, letterSpacing: 0.2 }}>
                      {discountPct}% OFF
                    </Text>
                  </View>
                </>
              )}
            </View>

            {hasDiscount && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <View style={[styles.savingsTag, { backgroundColor: '#05966914', borderColor: '#05966940' }]}>
                  <Text style={{ color: '#059669', fontFamily: fontFamily.sansBold, fontSize: 10.5, letterSpacing: 0.6 }}>
                    ⚡ SPECIAL OFFER • SAVE ₹{savings.toLocaleString('en-IN')} TODAY
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Size Selector (If Available) ── */}
          {product.size?.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 13, marginBottom: 10, letterSpacing: 0.3 }}>
                SELECT SIZE: <Text style={{ color: colors.primary }}>{selectedSize}</Text>
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {product.size.map((s: any) => {
                  const isSel = selectedSize === String(s.name);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      onPress={() => setSelectedSize(String(s.name))}
                      activeOpacity={0.8}
                      style={[
                        styles.sizeBtn,
                        {
                          borderColor: isSel ? colors.primary : colors.border,
                          backgroundColor: isSel ? colors.primary + '16' : colors.surfaceElevated,
                          borderRadius: radius.md,
                        }
                      ]}
                    >
                      <Text style={{ color: isSel ? colors.primary : colors.textPrimary, fontFamily: isSel ? fontFamily.sansBold : fontFamily.sansMedium, fontSize: 13 }}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Quantity Stepper ── */}
          <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surfaceElevated, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: isMaxInCart ? '#EF4444' : colors.border }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 13 }}>
                QUANTITY
              </Text>
              <Text style={{ color: isMaxInCart ? '#EF4444' : colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 2 }}>
                {isMaxInCart ? `Max ${stockQty} already in bag` : `Max ${stockQty} in stock${currentInCart > 0 ? ` (${currentInCart} in bag)` : ''}`}
              </Text>
            </View>

            <View style={[styles.qtyControl, { borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, opacity: isMaxInCart ? 0.6 : 1 }]}>
              <TouchableOpacity
                onPress={() => setQuantity(q => Math.max(1, q - 1))}
                disabled={isMaxInCart}
                style={styles.qtyBtn}
                activeOpacity={0.7}
              >
                <Text style={{ color: isMaxInCart ? colors.textMuted : colors.primary, fontSize: 18, fontWeight: '700', lineHeight: 20 }}>−</Text>
              </TouchableOpacity>
              <TextInput
                value={String(isMaxInCart ? 0 : quantity)}
                onChangeText={v => setQuantity(Math.max(1, Math.min(Math.max(1, maxAvailableToAdd), parseInt(v) || 1)))}
                editable={!isMaxInCart}
                keyboardType="number-pad"
                style={[styles.qtyInput, { color: colors.textPrimary, fontFamily: fontFamily.sansBold, borderColor: colors.border }]}
              />
              <TouchableOpacity
                onPress={() => setQuantity(q => Math.min(Math.max(1, maxAvailableToAdd), q + 1))}
                disabled={isMaxInCart || quantity >= maxAvailableToAdd}
                style={styles.qtyBtn}
                activeOpacity={0.7}
              >
                <Text style={{ color: (isMaxInCart || quantity >= maxAvailableToAdd) ? colors.textMuted : colors.primary, fontSize: 18, fontWeight: '700', lineHeight: 20 }}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Real Specifications & Highlights Grid (Only actual values from product) ── */}
          {(() => {
            const realAttrs: { icon: string; label: string; value: string }[] = [];
            const metal = product.metalType?.[0]?.name || (typeof product.metal === 'string' ? product.metal : null);
            if (metal) realAttrs.push({ icon: 'diamond-stone', label: 'Metal', value: metal });

            const purity = product.purity?.[0]?.name || (typeof product.purity === 'string' ? product.purity : null);
            if (purity) realAttrs.push({ icon: 'seal', label: 'Purity', value: purity });

            const occasion = product.occasion?.[0]?.name || (typeof product.occasion === 'string' ? product.occasion : null);
            if (occasion) realAttrs.push({ icon: 'white-balance-sunny', label: 'Occasion', value: occasion });

            if (product.weight) {
              realAttrs.push({ icon: 'scale-balance', label: 'Weight', value: `${product.weight}g` });
            }

            const warranty = product.warranty?.[0]?.name || (typeof product.warranty === 'string' ? product.warranty : null);
            if (warranty) realAttrs.push({ icon: 'certificate-outline', label: 'Warranty', value: warranty });

            if (realAttrs.length === 0) return null;

            return (
              <View style={{ marginTop: 24 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 14, marginBottom: 12, letterSpacing: 0.3 }}>
                  PRODUCT HIGHLIGHTS
                </Text>
                <View style={styles.attrsGrid}>
                  {realAttrs.map(attr => (
                    <View
                      key={attr.label}
                      style={[
                        styles.attrCard,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                          borderRadius: radius.lg,
                        }
                      ]}
                    >
                      <View style={[styles.attrIconWrap, { backgroundColor: colors.primary + '14' }]}>
                        <AppIcon name={attr.icon as any} size={15} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {attr.label}
                        </Text>
                        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {attr.value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

          {/* ── Product Description ── */}
          {product.description ? (
            <View style={{ marginTop: 24 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 14, marginBottom: 10, letterSpacing: 0.3 }}>
                DESCRIPTION
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.sans, fontSize: 13.5, lineHeight: 22 }}>
                {product.description}
              </Text>
            </View>
          ) : null}

          {/* ── Related Recommendations ── */}
          {related.length > 0 && (
            <View style={{ marginTop: 36 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 17, marginBottom: 4 }}>
                You May Also Like
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 12, marginBottom: 14 }}>
                Handcrafted pieces matching your selection
              </Text>
              <View style={styles.relatedGrid}>
                {related.slice(0, 4).map(p => (
                  <View key={p.id} style={{ width: '48%' }}>
                    <ProductCard product={p} onPress={() => navigation.push('ProductDetail', { productId: p.id })} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Sticky Bottom CTA Bar ── */}
      {!outOfStock && (
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: isDark ? '#1C1929' : '#FFFFFF',
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 14),
            }
          ]}
        >
          <View style={{ justifyContent: 'center', paddingRight: 10 }}>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10.5 }}>
              TOTAL PRICE
            </Text>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 17 }}>
              ₹{(price * quantity).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flex: 1, gap: 8 }}>
            <TouchableOpacity
              onPress={handleAddToCart}
              disabled={outOfStock || isMaxInCart || (product.size?.length > 0 && !selectedSize)}
              activeOpacity={0.85}
              style={[
                styles.addToCartBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: (outOfStock || isMaxInCart) ? colors.border : colors.primary,
                  borderRadius: radius.lg,
                  opacity: (outOfStock || isMaxInCart) ? 0.6 : 1,
                }
              ]}
            >
              <AppIcon name="shopping-outline" size={17} color={(outOfStock || isMaxInCart) ? colors.textMuted : colors.primary} />
              <Text style={{ color: (outOfStock || isMaxInCart) ? colors.textMuted : colors.primary, fontFamily: fontFamily.sansBold, fontSize: 13.5, marginLeft: 4 }}>
                {outOfStock ? 'Out of Stock' : isMaxInCart ? `Max in Bag (${currentInCart})` : cartItem ? `In Bag (${currentInCart}) +` : 'Add to Bag'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBuyNow}
              disabled={outOfStock || isMaxInCart || (product.size?.length > 0 && !selectedSize)}
              activeOpacity={0.85}
              style={[
                styles.buyNowBtn,
                {
                  backgroundColor: (outOfStock || isMaxInCart) ? colors.border : colors.primary,
                  borderRadius: radius.lg,
                  opacity: (outOfStock || isMaxInCart) ? 0.6 : 1,
                  shadowColor: colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.35,
                  shadowRadius: 6,
                  elevation: 3,
                }
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 13.5 }}>
                Buy Now
              </Text>
              <AppIcon name="chevron-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroContainer: { width: W, position: 'relative', overflow: 'hidden' },
  floatingNavBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  counterBadge: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  counterText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  outOfStockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockText: { color: '#FFF', fontWeight: '800', fontSize: 16, letterSpacing: 1.5 },
  thumbWrap: { width: 54, height: 54, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryPillText: { fontSize: 10, letterSpacing: 0.8 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  priceBox: {
    padding: 16,
    borderWidth: 1,
  },
  savePillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  savingsTag: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  sizeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1.5,
    minWidth: 44,
    alignItems: 'center',
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  qtyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  qtyInput: {
    width: 40,
    textAlign: 'center',
    fontSize: 14,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingVertical: 6,
  },
  attrsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attrCard: {
    width: (W - 42) / 2,
    padding: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attrIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: { fontSize: 11 },
  trustDivider: { width: 1, height: 16 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reviewCard: {
    padding: 12,
    borderWidth: 1,
  },
  relatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 10,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  buyNowBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});

