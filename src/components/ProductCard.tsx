import React, { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { getFirstImageUrl } from '../utils/imageUtils';
import type { MainStackParamList } from '../navigation/types';
import { AppIcon } from './common';

type Props = { product: any; onPress: () => void };

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

        {outOfStock && (
          <View style={styles.oosBanner}>
            <Text style={styles.oosText}>Out of Stock</Text>
          </View>
        )}

        {hasDiscount && !outOfStock && (
          <View style={[styles.discBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.discText, { color: colors.textOnPrimary }]}>-{discountPct}%</Text>
          </View>
        )}

        {/* Translucent Wishlist Overlay Button */}
        <TouchableOpacity
          onPress={() => toggle(product.id)}
          style={[
            styles.wishBtn,
            {
              backgroundColor: wishlisted ? '#FF4B5C' : 'rgba(255, 255, 255, 0.9)',
              borderColor: 'transparent',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }
          ]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppIcon name={wishlisted ? 'heart' : 'heart-outline'} size={13} color={wishlisted ? '#fff' : '#1A1410'} />
        </TouchableOpacity>

      </View>

      {/* Info Content */}
      <View style={styles.info}>
        {/* Rating Stars */}
        {rating > 0 && (
          <View style={styles.starsRow}>
            <AppIcon name="star" size={10} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 10, marginLeft: 2 }}>
              {rating.toFixed(1)}
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, marginLeft: 3 }}>
              ({reviewCount})
            </Text>
          </View>
        )}

        {/* Product Name */}
        <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: 12.5, lineHeight: 16, minHeight: 32, marginTop: 2 }} numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price Row & Add / Qty Control */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <View style={{ flex: 1, paddingRight: 4 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 13.5 }} numberOfLines={1}>
              ₹{finalPrice.toLocaleString('en-IN')}
            </Text>
            {hasDiscount && (
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 9.5, textDecorationLine: 'line-through' }} numberOfLines={1}>
                ₹{basePrice.toLocaleString('en-IN')}
              </Text>
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
  imgWrap: { position: 'relative', aspectRatio: 1.05, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  oosBanner: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  oosText: { color: '#fff', fontWeight: '700', fontSize: 10, letterSpacing: 0.5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  discBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12 },
  discText: { fontSize: 9, fontWeight: '700' },
  wishBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickAddBtnOuter: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 28, borderRadius: 14, borderWidth: 1, paddingHorizontal: 3, gap: 2 },
  qtyBtn: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 12, minWidth: 16, textAlign: 'center' },
  info: { paddingVertical: 6, paddingHorizontal: 2, gap: 2 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
});
