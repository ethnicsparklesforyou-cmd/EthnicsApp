import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { getFirstImageUrl } from '../utils/imageUtils';
import type { MainStackParamList } from '../navigation/types';
import { AppIcon, AppGradient } from './common';

type Props = { product: any; onPress: () => void };

const PRODUCT_BADGES = [
  { label: 'BESTSELLER', bg: '#BE123C' },
  { label: 'FEATURED', bg: '#D97706' },
  { label: 'TRENDING', bg: '#7C3AED' },
];

function ProductCardComponent({ product, onPress }: Props) {
  const { theme, isDark } = useTheme();
  const { colors, fontFamily, fontSize, radius } = theme;
  const { isWishlisted, toggle } = useWishlist();
  const { addItem, updateQty, removeItem, items } = useCart();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const basePrice = parseFloat(product.basePrice || '0');
  const discount = parseFloat(product.discountPrice || '0');
  const finalPrice = basePrice - discount;
  const hasDiscount = discount > 0;
  const discountPct = hasDiscount ? Math.round((discount / basePrice) * 100) : 0;
  const imageUrl = getFirstImageUrl(product);
  const cartItem = items.find(i => String(i.productId) === String(product.id));
  const qtyInCart = cartItem ? cartItem.quantity : 0;
  const wishlisted = isWishlisted(product.id);
  const outOfStock = (product.stockQuantity ?? 1) === 0;
  const rating = parseFloat(product.avgRating || '0');
  const reviewCount = product.reviewCount || 0;

  // Dynamic Tag vs Rotating Badge
  const rawTag = product.productTag !== undefined && product.productTag !== null ? String(product.productTag).trim() : null;
  const isExplicitNone = rawTag !== null && (rawTag === '' || rawTag.toLowerCase() === 'none');
  const hasCustomTag = rawTag !== null && !isExplicitNone;

  const getCustomBadge = (tag: string) => {
    const t = tag.trim().toUpperCase();
    if (t === 'BESTSELLER' || t === 'BEST SELLER') return { label: 'BESTSELLER', bg: '#BE123C' };
    if (t === 'FEATURED') return { label: 'FEATURED', bg: '#D97706' };
    if (t === 'TRENDING') return { label: 'TRENDING', bg: '#7C3AED' };
    if (t === 'HOT' || t === 'HOT DEAL') return { label: 'HOT', bg: '#DC2626' };
    if (t === 'NEW' || t === 'NEW ARRIVAL') return { label: 'NEW', bg: '#059669' };
    if (t === 'EXCLUSIVE') return { label: 'EXCLUSIVE', bg: '#0D9488' };
    return { label: t, bg: '#7C3AED' };
  };

  // Rotating Badge state & animation (every 3 seconds) for products without custom tag
  const initialBadgeIdx = (Number(product.id) || 0) % PRODUCT_BADGES.length;
  const [badgeIdx, setBadgeIdx] = useState(initialBadgeIdx);
  const badgeAnim = useRef(new Animated.Value(1)).current;
  const badgeTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasCustomTag || isExplicitNone) return;
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(badgeAnim, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(badgeTranslateY, {
          toValue: -4,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setBadgeIdx(prev => (prev + 1) % PRODUCT_BADGES.length);
        badgeTranslateY.setValue(4);
        Animated.parallel([
          Animated.timing(badgeAnim, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(badgeTranslateY, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [badgeAnim, badgeTranslateY, hasCustomTag, isExplicitNone]);

  const currentBadge = hasCustomTag
    ? getCustomBadge(rawTag!)
    : (isExplicitNone ? null : PRODUCT_BADGES[badgeIdx]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceElevated,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: colors.border + '55',
        }
      ]}>

      {/* Hero Edge-to-Edge Image Container (Clean & Unobstructed) */}
      <View style={[styles.imgWrap, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={[styles.img, { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
            <AppIcon name="diamond-stone" size={32} color={colors.primary} />
          </View>
        )}

        {/* Dynamic / Rotating Top-Left Tag Badge */}
        {!outOfStock && currentBadge && (
          <Animated.View
            style={[
              styles.animatedBadge,
              {
                backgroundColor: currentBadge.bg,
                opacity: hasCustomTag ? 1 : badgeAnim,
                transform: [{ translateY: hasCustomTag ? 0 : badgeTranslateY }],
              },
            ]}>
            <Text style={styles.animatedBadgeText}>
              {currentBadge.label}
            </Text>
          </Animated.View>
        )}

        {/* Out of Stock Overlay */}
        {outOfStock && (
          <View style={styles.oosBanner}>
            <Text style={styles.oosText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Info Content: Compact, Elegant, Zero Wasted Space */}
      <View style={styles.info}>
        {/* Title & Wishlist Button Row (Heart sits beside title, NOT on image) */}
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.productTitle,
              {
                color: colors.textPrimary,
                fontFamily: fontFamily.sansMedium,
              }
            ]}
            numberOfLines={1}>
            {product.name}
          </Text>

          <TouchableOpacity
            onPress={() => toggle(product.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            style={styles.wishBtn}>
            <AppIcon
              name={wishlisted ? 'heart' : 'heart-outline'}
              size={18}
              color={wishlisted ? '#FF4B5C' : (isDark ? '#A1A1AA' : '#71717A')}
            />
          </TouchableOpacity>
        </View>

        {/* Price Row & Add to Cart / Qty Control */}
        <View style={styles.bottomRow}>
          <View style={{ flex: 1, paddingRight: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontFamily: fontFamily.sansBold,
                  fontSize: 14.5,
                  fontWeight: '700',
                }}
                numberOfLines={1}>
                ₹{finalPrice.toLocaleString('en-IN')}
              </Text>
              {hasDiscount && (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontFamily: fontFamily.sans,
                    fontSize: 10,
                    textDecorationLine: 'line-through',
                  }}
                  numberOfLines={1}>
                  ₹{basePrice.toLocaleString('en-IN')}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
              {hasDiscount && (
                <Text style={{ color: '#059669', fontFamily: fontFamily.sansBold, fontSize: 10, fontWeight: '700' }}>
                  {discountPct}% OFF
                </Text>
              )}
              {rating > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <AppIcon name="star" size={10} color="#F59E0B" />
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: fontFamily.sansBold }}>
                    {rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Add or Qty Counter */}
          {!outOfStock && (
            qtyInCart > 0 ? (
              <View style={[styles.qtyControl, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                <TouchableOpacity
                  onPress={() => {
                    const targetId = cartItem ? cartItem.productId : product.id;
                    if (qtyInCart <= 1) {
                      removeItem(targetId);
                    } else {
                      updateQty(targetId, qtyInCart - 1);
                    }
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <AppGradient style={styles.qtyBtn}>
                    <AppIcon name="minus" size={11} color="#fff" />
                  </AppGradient>
                </TouchableOpacity>

                <Text style={[styles.qtyText, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]}>
                  {qtyInCart}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    const targetId = cartItem ? cartItem.productId : product.id;
                    const maxStock = product.stockQuantity ?? 99;
                    if (qtyInCart < maxStock) {
                      updateQty(targetId, qtyInCart + 1);
                    }
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <AppGradient style={styles.qtyBtn}>
                    <AppIcon name="plus" size={11} color="#fff" />
                  </AppGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  addItem({ productId: product.id, name: product.name, price: finalPrice, quantity: 1, image: imageUrl || undefined });
                }}
                activeOpacity={0.8}>
                <AppGradient style={styles.quickAddBtnOuter}>
                  <AppIcon name="plus" size={14} color="#fff" />
                </AppGradient>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    flex: 1,
    position: 'relative',
    marginBottom: 10,
    padding: 0,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  imgWrap: {
    position: 'relative',
    aspectRatio: 0.75, // Extra tall 3:4 portrait ratio for bigger, stunning jewellery presentation
    overflow: 'hidden',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  oosBanner: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oosText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 10.5,
    letterSpacing: 0.5,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  animatedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.2,
    shadowRadius: 2.5,
    elevation: 3,
  },
  animatedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  info: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  productTitle: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
  },
  wishBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  quickAddBtnOuter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 3,
    gap: 3,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 12.5,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
});
