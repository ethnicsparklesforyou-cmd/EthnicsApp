import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppIcon, Screen } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { fetchProductById, fetchProductReviews, fetchProducts } from '../../services/products';
import { addToServerCart } from '../../services/cart';
import { getFirstImageUrl } from '../../utils/imageUtils';
import { ProductCard } from '../../components/ProductCard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList } from '../../navigation/types';

const { width: W } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'ProductDetail'>;
  route: RouteProp<MainStackParamList, 'ProductDetail'>;
};

export function ProductDetailScreen({ navigation, route }: Props) {
  const { productId } = route.params;
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { user, isAuthenticated } = useAuth();
  const { items: cartItems, addItem } = useCart();
  const { isWishlisted, toggle: toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');

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
    fetchProductReviews(product.id).then(res => setReviews(res?.data?.reviews || res?.data || [])).catch(() => { });
    if (product.subcategoryId) {
      const firstSubcatId = parseInt(String(product.subcategoryId).split(',')[0], 10);
      fetchProducts({ subcategoryId: [firstSubcatId], limit: 8 }).then(res =>
        setRelated((res?.data?.products || []).filter((p: any) => p.id !== product.id)),
      );
    }
  }, [product?.id]);

  const addCurrentProduct = () => {
    if (!product) return;
    if (product.size?.length && !selectedSize) return;
    const price = parseFloat(product.basePrice || '0') - parseFloat(product.discountPrice || '0');
    const imageUrl = getFirstImageUrl(product);
    addItem({ productId: product.id, name: product.name, price, quantity, image: imageUrl || undefined, size: selectedSize || null });
    if (isAuthenticated && user) {
      addToServerCart({ userId: user.id, productId: product.id, quantity, size: selectedSize || null }).catch(() => { });
    }
  };

  const handleAddToCart = () => {
    addCurrentProduct();
  };

  const handleBuyNow = () => {
    addCurrentProduct();
    navigation.navigate('Checkout');
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

  const price = parseFloat(product.basePrice || '0') - parseFloat(product.discountPrice || '0');
  const originalPrice = parseFloat(product.basePrice || '0');
  const hasDiscount = parseFloat(product.discountPrice || '0') > 0;
  const discountPct = hasDiscount ? Math.round((parseFloat(product.discountPrice) / originalPrice) * 100) : 0;
  const images: string[] = Array.isArray(product.images)
    ? product.images.map((img: any) => (typeof img === 'string' ? img : img?.imageUrl || '')).filter(Boolean)
    : [];
  const outOfStock = (product.stockQuantity || 0) === 0;

  return (
    <Screen style={{ backgroundColor: colors.background }} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Hero Image Container with absolute overlays ── */}
        <View style={[styles.heroContainer, { backgroundColor: colors.surfaceElevated }]}>
          <Image
            source={{ uri: images[selectedImage] || '' }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />

          {/* Overlay headers */}
          <View style={styles.overlayHeader}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.overlayBtn, { borderRadius: radius.full }]}
            >
              <AppIcon name="chevron-left" color="#FFFFFF" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => toggleWishlist(product.id)}
              style={[styles.overlayBtn, { borderRadius: radius.full }]}
            >
              <AppIcon name={wishlisted ? 'heart' : 'heart-outline'} color={wishlisted ? '#EF4444' : '#FFFFFF'} size={18} />
            </TouchableOpacity>
          </View>

          {outOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}

          {hasDiscount && (
            <View style={[styles.discountBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.discountText, { color: colors.textOnPrimary }]}>-{discountPct}% OFF</Text>
            </View>
          )}
        </View>

        {/* ── Thumbnails ── */}
        {images.length > 1 && (
          <FlatList
            data={images}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing[5], gap: 8, paddingVertical: 12 }}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item, index }) => (
              <TouchableOpacity onPress={() => setSelectedImage(index)}>
                <Image
                  source={{ uri: item }}
                  style={[styles.thumb, {
                    borderColor: selectedImage === index ? colors.primary : colors.border,
                    borderRadius: radius.md,
                  }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />
        )}

        {/* ── Main Details Content ── */}
        <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[3] }}>
          {/* Breadcrumb / Category */}
          {product.subcategories?.[0] && (
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {product.subcategories[0].categoryName} / {product.subcategories[0].name}
            </Text>
          )}

          {/* Title */}
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize['2xl'], lineHeight: 32 }}>
            {product.name}
          </Text>

          {/* Stars & Reviews */}
          {parseFloat(product.avgRating) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 14 }}>
                {'★'.repeat(Math.round(parseFloat(product.avgRating)))}
                <Text style={{ color: '#333' }}>{'★'.repeat(5 - Math.round(parseFloat(product.avgRating)))}</Text>
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>
                {parseFloat(product.avgRating).toFixed(1)} ({product.reviewCount || 0} Reviews)
              </Text>
            </View>
          )}

          {/* Price Block */}
          <View style={[styles.priceBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.xl, marginTop: 18 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
              <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 28 }}>
                ₹{price.toLocaleString('en-IN')}
              </Text>
              {hasDiscount && (
                <>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.base, textDecorationLine: 'line-through' }}>
                    ₹{originalPrice.toLocaleString('en-IN')}
                  </Text>
                  <View style={[styles.saveBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xs }}>
                      Save ₹{parseFloat(product.discountPrice).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </>
              )}
            </View>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 6 }}>
              Inclusive of all taxes & delivery fees
            </Text>
          </View>

          {/* Size Selector */}
          {product.size?.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm, marginBottom: 10 }}>
                SELECT SIZE: <Text style={{ color: colors.primary }}>{selectedSize}</Text>
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {product.size.map((s: any) => (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => setSelectedSize(String(s.name))}
                    style={[styles.sizeBtn, {
                      borderColor: selectedSize === String(s.name) ? colors.primary : colors.border,
                      backgroundColor: selectedSize === String(s.name) ? colors.primary + '15' : colors.surfaceElevated,
                      borderRadius: radius.md,
                    }]}>
                    <Text style={{ color: selectedSize === String(s.name) ? colors.primary : colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Quantity Selector */}
          <View style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>QUANTITY:</Text>
            <View style={[styles.qtyControl, { borderColor: colors.border, backgroundColor: colors.surfaceElevated, borderRadius: radius.lg }]}>
              <TouchableOpacity onPress={() => setQuantity(q => Math.max(1, q - 1))} style={styles.qtyBtn}>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>−</Text>
              </TouchableOpacity>
              <TextInput
                value={String(quantity)}
                onChangeText={v => setQuantity(Math.max(1, Math.min(product.stockQuantity || 1, parseInt(v) || 1)))}
                keyboardType="number-pad"
                style={[styles.qtyInput, { color: colors.textPrimary, fontFamily: fontFamily.sansBold, borderColor: colors.border }]}
              />
              <TouchableOpacity onPress={() => setQuantity(q => Math.min(product.stockQuantity || 1, q + 1))} style={styles.qtyBtn}>
                <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>
              ({product.stockQuantity || 0} pieces available)
            </Text>
          </View>

          {/* Key Attributes Grid */}
          <View style={[styles.attrsGrid, { marginTop: 24 }]}>
            {[
              { label: 'Metal', value: product.metalType?.[0]?.name },
              { label: 'Purity', value: product.purity?.[0]?.name },
              { label: 'Weight', value: product.weight ? `${product.weight}g` : null },
              { label: 'Occasion', value: product.occasion?.[0]?.name },
              { label: 'For', value: product.gender?.[0]?.name },
              { label: 'Warranty', value: product.warranty?.[0]?.name },
            ].filter(a => a.value).map(attr => (
              <View key={attr.label} style={[styles.attrCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.lg }]}>
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{attr.label}</Text>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm, marginTop: 4 }}>{attr.value}</Text>
              </View>
            ))}
          </View>

          {/* Description & Review Tabs */}
          <View style={[styles.tabs, { marginTop: 28, borderColor: colors.border }]}>
            {(['desc', 'reviews'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
                <Text style={{ color: activeTab === tab ? colors.primary : colors.textMuted, fontFamily: activeTab === tab ? fontFamily.sansBold : fontFamily.sans, fontSize: fontSize.sm }}>
                  {tab === 'desc' ? 'Description' : `Reviews (${reviews.length})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content Rendering */}
          {activeTab === 'desc' && (
            <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.sans, fontSize: fontSize.sm, lineHeight: 22, marginTop: 16 }}>
              {product.description || 'This exquisite piece combines traditional craftsmanship with contemporary design.'}
            </Text>
          )}

          {activeTab === 'reviews' && (
            <View style={{ marginTop: 16, gap: 12 }}>
              {reviews.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: 24 }}>
                  No reviews yet. Be the first to review this piece!
                </Text>
              ) : reviews.map(r => (
                <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.lg }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>{r.userName || 'Customer'}</Text>
                    <Text style={{ color: colors.primary, fontSize: 12 }}>{'★'.repeat(r.rating || 0)}</Text>
                  </View>
                  {r.reviewText && <Text style={{ color: colors.textSecondary, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>{r.reviewText}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Related Items */}
          {related.length > 0 && (
            <View style={{ marginTop: 40 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg, marginBottom: 4 }}>You May Also Like</Text>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginBottom: 16 }}>More hand-selected pieces for you</Text>
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
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingHorizontal: spacing[5] }]}>
          <TouchableOpacity
            onPress={handleAddToCart}
            disabled={product.size?.length > 0 && !selectedSize}
            style={[styles.addToCartBtn, {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.primary,
              borderRadius: radius.lg,
            }]}>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
              {cartItem ? 'In Cart' : 'Add to Cart'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBuyNow}
            disabled={outOfStock || (product.size?.length > 0 && !selectedSize)}
            style={[styles.buyNowBtn, { backgroundColor: colors.primary, borderRadius: radius.lg }]}>
            <Text style={{ color: colors.textOnPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroContainer: { width: W, height: W, position: 'relative' },
  overlayHeader: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  overlayBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outOfStockOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  outOfStockText: { color: '#fff', fontWeight: '700', fontSize: 18, letterSpacing: 1 },
  discountBadge: { position: 'absolute', bottom: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  discountText: { fontWeight: '700', fontSize: 11 },
  thumb: { width: 56, height: 56, borderWidth: 1.5 },
  priceBox: { padding: 16, borderWidth: 1 },
  saveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  sizeBtn: { paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1.5 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  qtyBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  qtyInput: { width: 44, textAlign: 'center', fontSize: 15, borderLeftWidth: 1, borderRightWidth: 1, paddingVertical: 8 },
  attrsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  attrCard: { padding: 12, borderWidth: 1, minWidth: '30%', flex: 1 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  specRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1 },
  reviewCard: { padding: 14, borderWidth: 1 },
  relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bottomBar: { flexDirection: 'row', gap: 12, paddingVertical: 16, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0 },
  addToCartBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, justifyContent: 'center' },
  buyNowBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
});
