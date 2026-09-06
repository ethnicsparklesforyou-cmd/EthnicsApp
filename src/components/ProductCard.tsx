import React, { memo, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { getFirstImageUrl } from '../utils/imageUtils';
import type { MainStackParamList } from '../navigation/types';
import { AppIcon } from './common';

type Props = { product: any; onPress: () => void };

const PRODUCT_BADGES = [
  { label: 'BESTSELLER', bg: '#BE123C' },
  { label: 'FEATURED', bg: '#D97706' },
  { label: 'TRENDING', bg: '#7C3AED' },
];

function ProductCardComponent({ product, onPress }: Props) {
  const { theme } = useTheme();
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

  // Rotating Badge state & animation (every 3 seconds)
  const initialBadgeIdx = (Number(product.id) || 0) % PRODUCT_BADGES.length;
  const [badgeIdx, setBadgeIdx] = useState(initialBadgeIdx);
  const badgeAnim = useRef(new Animated.Value(1)).current;
  const badgeTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, [badgeAnim, badgeTranslateY]);

  const currentBadge = PRODUCT_BADGES[badgeIdx];

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
          borderColor: colors.border + '60',
        }
      ]}>

      {/* Image Container */}
      <View style={[styles.imgWrap, { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={[styles.img, { backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }]}>
            <AppIcon name="diamond-stone" size={28} color={colors.primary} />
          </View>
        )}

        {/* Morphing Rotating Top Badge */}
        {!outOfStock && (
          <Animated.View
            style={[
              styles.animatedBadge,
              {
                backgroundColor: currentBadge.bg,
                opacity: badgeAnim,
                transform: [{ translateY: badgeTranslateY }],
              },
            ]}>
            <Text style={styles.animatedBadgeText}>
              {currentBadge.label}
            </Text>
          </Animated.View>
        )}

        {outOfStock && (
          <View style={styles.oosBanner}>
            <Text style={styles.oosText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Info Content */}
      <View style={styles.info}>
        {/* Rating & Like Row */}
        <View style={styles.metaRow}>
          {rating > 0 ? (
            <View style={styles.starsRow}>
              <AppIcon name="star" size={11} color={colors.primary} />
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 10.5, marginLeft: 2 }}>
                {rating.toFixed(1)}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, marginLeft: 2 }}>
                ({reviewCount})
              </Text>
            </View>
          ) : (
            <View />
          )}

          {/* Like / Wishlist Button */}
          <TouchableOpacity
            onPress={() => toggle(product.id)}
            style={[
              styles.infoWishBtn,
              {
                backgroundColor: wishlisted ? '#FF4B5C18' : colors.surface,
                borderColor: wishlisted ? '#FF4B5C40' : colors.border + '80',
              }
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <AppIcon name={wishlisted ? 'heart' : 'heart-outline'} size={14} color={wishlisted ? '#FF4B5C' : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Product Name */}
        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: 12.5, lineHeight: 16, minHeight: 32, marginTop: 1 }} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price Row & Add / Qty Control */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <View style={{ flex: 1, paddingRight: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 13.5 }} numberOfLines={1}>
                ₹{finalPrice.toLocaleString('en-IN')}
              </Text>
              {hasDiscount && (
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 9.5, textDecorationLine: 'line-through' }} numberOfLines={1}>
                  ₹{basePrice.toLocaleString('en-IN')}
                </Text>
              )}
            </View>
            {hasDiscount && (
              <View style={{
                alignSelf: 'flex-start',
                backgroundColor: '#05966914',
                borderColor: '#05966938',
                borderWidth: 1,
                paddingHorizontal: 5,
                paddingVertical: 1.5,
                borderRadius: 4,
                marginTop: 3,
              }}>
                <Text style={{ color: '#059669', fontFamily: fontFamily.sansBold, fontSize: 9, letterSpacing: 0.2 }}>
                  {discountPct}% OFF
                </Text>
              </View>
            )}
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
                  style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <AppIcon name="minus" size={11} color="#fff" />
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
                  style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <AppIcon name="plus" size={11} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  addItem({ productId: product.id, name: product.name, price: finalPrice, quantity: 1, image: imageUrl || undefined });
                }}
                style={[
                  styles.quickAddBtnOuter,
                  { backgroundColor: colors.primary }
                ]}
                activeOpacity={0.8}>
                <AppIcon name="plus" size={14} color="#fff" />
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
  card: { overflow: 'hidden', flex: 1, position: 'relative', marginBottom: 12, padding: 6 },
  imgWrap: { position: 'relative', aspectRatio: 0.85, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  oosBanner: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  oosText: { color: '#fff', fontWeight: '700', fontSize: 10, letterSpacing: 0.5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  animatedBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  animatedBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  discBadge: {
    position: 'absolute',
    bottom: 7,
    left: 7,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  discText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
    marginTop: 4,
  },
  infoWishBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddBtnOuter: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 28, borderRadius: 14, borderWidth: 1, paddingHorizontal: 3, gap: 2 },
  qtyBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 12, minWidth: 16, textAlign: 'center' },
  info: { paddingVertical: 4, paddingHorizontal: 2, gap: 2 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
});
