import React, { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import {
  Alert,
  Animated,
  ActivityIndicator,
  Easing,
  Dimensions,
  FlatList,
  Image,
  InteractionManager,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { Screen } from '../../components/common';
import { ProductCard } from '../../components/ProductCard';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { fetchActiveBanners, fetchCategories, fetchProducts } from '../../services/products';
import { fetchAddresses } from '../../services/address';
import { getBannerImageUrl } from '../../utils/imageUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppIcon, LocationSelectModal } from '../../components/common';
import { LOCATION_STORAGE_KEY } from '../../components/common/LocationSelectModal';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { TabParamList } from '../../navigation/types';

const { width: W } = Dimensions.get('window');
const BANNER_H = Math.round(W * 0.52);
const CAT_SIZE = 72;
const PROMO_ITEM_W = 240;

const EDITORIAL_BANNERS = [
  {
    id: 'eb1',
    tag: 'FASHION TRENDS',
    badge: 'EARRINGS',
    headline: 'Statement\nEarrings',
    sub: 'Trending drops, hoops & stylish studs for everyday glam',
    cta: 'Shop Earrings',
    gradientTop: '#3B0764',
    gradientBot: '#6B21A8',
    accent: '#C084FC',
    pill: '#EC4899',
    image: require('../../../assets/images/Earrings.jpeg'),
  },
  {
    id: 'eb2',
    tag: 'DESIGNER PICKS',
    badge: 'RINGS',
    headline: 'Trendy &\nStack Rings',
    sub: 'Chic fashion rings and layered bands to match your outfits',
    cta: 'Explore Rings',
    gradientTop: '#831843',
    gradientBot: '#BE185D',
    accent: '#F472B6',
    pill: '#F59E0B',
    image: require('../../../assets/images/Ring.jpeg'),
  },
  {
    id: 'eb3',
    tag: 'NEW ARRIVALS',
    badge: 'BRACELETS',
    headline: 'Charm &\nCuff Bracelets',
    sub: 'Modern fashion bracelets and sleek everyday accessories',
    cta: 'Shop Bracelets',
    gradientTop: '#78350F',
    gradientBot: '#B45309',
    accent: '#FDE68A',
    pill: '#D97706',
    image: require('../../../assets/images/Bracelet.jpeg'),
  },
] as const;

const CATEGORY_RING_COLORS = [
  { border: '#7C3AED', shadow: '#7C3AED' }, // Royal Purple
  { border: '#EC4899', shadow: '#EC4899' }, // Hot Rose Pink
  { border: '#F59E0B', shadow: '#F59E0B' }, // 18K Amber Gold
  { border: '#6366F1', shadow: '#6366F1' }, // Electric Violet
  { border: '#E11D48', shadow: '#E11D48' }, // Ruby Rose
  { border: '#06B6D4', shadow: '#06B6D4' }, // Cyan Jewel
];

function EditorialBannersSection({
  banners,
  goShop,
  colors,
  fontFamily,
  spacing,
  radius,
  isDark,
}: {
  banners: typeof EDITORIAL_BANNERS;
  goShop: (params?: any) => void;
  colors: any;
  fontFamily: any;
  spacing: any;
  radius: any;
  isDark: boolean;
}) {
  return (
    <View style={{ marginVertical: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], marginBottom: 12 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <AppIcon name="star-four-points" size={13} color="#EC4899" />
            <Text style={{ color: '#EC4899', fontFamily: fontFamily.sansBold, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase' }}>
              EDITORIAL SHOWCASE
            </Text>
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 22, letterSpacing: -0.4 }}>
            Signature Collections
          </Text>
        </View>
      </View>

      <FlatList
        data={banners}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing[4], gap: 14 }}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => goShop()}
            activeOpacity={0.92}
            style={{
              width: W * 0.82,
              height: 156,
              borderRadius: 22,
              backgroundColor: item.gradientTop,
              flexDirection: 'row',
              overflow: 'hidden',
              shadowColor: item.accent,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 5,
              borderWidth: 1.2,
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          >
            {/* Left Column with rich text & gradient CTA */}
            <View style={{ flex: 1.15, padding: 16, justifyContent: 'space-between' }}>
              <View>
                <View style={{ backgroundColor: item.pill, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 }}>
                  <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 9, letterSpacing: 1.2 }}>
                    {item.tag}
                  </Text>
                </View>
                <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 17, lineHeight: 21 }}>
                  {item.headline}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 11 }}>{item.cta}</Text>
                <AppIcon name="arrow-right" size={12} color="#FFFFFF" />
              </View>
            </View>

            {/* Right Column Image */}
            <View style={{ flex: 0.85, height: '100%' }}>
              <Image source={item.image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const VIBE_CHIPS = [
  { id: 'v1', label: 'Minimalist', icon: 'circle-outline', color: '#6C63FF' },
  { id: 'v2', label: 'Bold & Loud', icon: 'flare', color: '#E91E8C' },
  { id: 'v3', label: 'Vintage', icon: 'clock-outline', color: '#B5814A' },
  { id: 'v4', label: 'Gifting', icon: 'gift-outline', color: '#00BCD4' },
  { id: 'v5', label: 'Bridal', icon: 'ring', color: '#E53935' },
  { id: 'v6', label: 'Everyday', icon: 'white-balance-sunny', color: '#43A047' },
] as const;
const PROMO_ITEMS = [
  {
    icon: 'ticket-percent-outline',
    title: 'Flat 15% OFF',
    subtitle: 'on first order',
  },
  {
    icon: 'truck-fast-outline',
    title: 'Free Delivery',
    subtitle: '₹999 and above',
  },
  {
    icon: 'shield-check-outline',
    title: 'Anti-Tarnish Polish',
    subtitle: 'trusted quality',
  },
] as const;



const CATEGORY_IMAGES = {
  ring: require('../../../assets/images/Ring.jpeg'),
  chain: require('../../../assets/images/Chain.jpeg'),
  earrings: require('../../../assets/images/Earrings.jpeg'),
  bracelet: require('../../../assets/images/Bracelet.jpeg'),
} as const;

type Props = { navigation: BottomTabNavigationProp<TabParamList, 'Home'> };

function unwrapArray(res: any): any[] {
  const d = res?.data ?? res?.result ?? res;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.categories)) return d.categories;
  if (Array.isArray(d?.banners)) return d.banners;
  if (Array.isArray(d?.items)) return d.items;
  return [];
}

function getCategorySource(cat: any, index: number) {
  const uri = cat?.imageUrl || cat?.image || cat?.image_url || cat?.bannerUrl || cat?.icon || null;
  if (uri && typeof uri === 'string' && (uri.startsWith('http://') || uri.startsWith('https://'))) {
    return { uri };
  }
  const fallbackImages = [CATEGORY_IMAGES.ring, CATEGORY_IMAGES.chain, CATEGORY_IMAGES.earrings, CATEGORY_IMAGES.bracelet];
  return fallbackImages[index % fallbackImages.length];
}

function getGreeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good Morning,';
  if (hr < 17) return 'Good Afternoon,';
  return 'Good Evening,';
}

function PromoMarquee({ fontFamily, isDark }: { fontFamily: any; isDark: boolean }) {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const distance = PROMO_ITEM_W * PROMO_ITEMS.length;
    translateX.setValue(0);
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: -distance,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translateX]);

  const repeatedItems = [...PROMO_ITEMS, ...PROMO_ITEMS];

  return (
    <View style={[styles.marqueeShell, isDark && styles.marqueeShellDark]}>
      <Animated.View style={[styles.marqueeRow, { transform: [{ translateX }] }]}>
        {repeatedItems.map((item, idx) => (
          <View key={`${item.title}-${idx}`} style={[styles.marqueeItem, { width: PROMO_ITEM_W }]}>
            <View style={[styles.marqueeIconWrap, isDark && styles.marqueeIconWrapDark]}>
              <AppIcon name={item.icon as any} color={isDark ? '#EC4899' : '#7C3AED'} size={14} />
            </View>
            <Text style={{ color: isDark ? '#FFFFFF' : '#1E1430', fontFamily: fontFamily.sansBold, fontSize: 12.5, letterSpacing: 0.2 }}>
              {item.title}
            </Text>
            <Text style={{ color: isDark ? '#A78BFA' : '#7C3AED', fontFamily: fontFamily.sansMedium, fontSize: 10.5 }}>
              · {item.subtitle}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}



// ── Memoized Discovery Product Card Component ──
const DiscoveryCard = React.memo(function DiscoveryCard({
  item,
  isDark,
  fontFamily,
  colors,
  cardWidth,
  cardHeight,
  onPress,
}: {
  item: any;
  isDark: boolean;
  fontFamily: any;
  colors: any;
  cardWidth: number;
  cardHeight: number;
  onPress: () => void;
}) {
  const uri = item.images?.[0]?.imageUrl || item.imageUrl || null;
  const rawB2b = item.b2bPrice ? parseFloat(item.b2bPrice) : 0;
  const rawBase = parseFloat(item.basePrice || item.price || '0');
  const rawDiscount = parseFloat(item.discountPrice || '0');

  const finalPrice = rawB2b > 0 ? rawB2b : (rawBase - rawDiscount);
  const price = rawBase > 0 ? rawBase : finalPrice;
  const discountPrice = rawDiscount;
  const discountPercent = (price > finalPrice && price > 0) ? Math.round(((price - finalPrice) / price) * 100) : 0;
  const categoryName = item.category?.name || item.categoryName || 'Jewellery';

  return (
    <View
      style={{
        width: cardWidth,
        height: cardHeight,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: isDark ? '#1C1929' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
        borderWidth: 1,
      }}
    >
      {/* Product Image */}
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          fadeDuration={0}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#232034' : '#F7F5FA', alignItems: 'center', justifyContent: 'center' }]}>
          <AppIcon name="diamond-stone" size={56} color={colors.primary} />
        </View>
      )}

      {/* Top Badges */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 16,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
          <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {categoryName}
          </Text>
        </View>

        {discountPercent > 0 && (
          <View style={{ backgroundColor: '#E11D48', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 14 }}>
            <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 0.5 }}>
              {discountPercent}% OFF
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Info Bar */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: isDark ? 'rgba(18, 16, 26, 0.94)' : 'rgba(20, 18, 28, 0.86)',
          paddingHorizontal: 18,
          paddingTop: 14,
          paddingBottom: 16,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          borderTopWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 18 }} numberOfLines={1}>
          {item.name || 'Ethnic Jewellery Piece'}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text style={{ color: colors.gold || '#FBBF24', fontFamily: fontFamily.sansBold, fontSize: 18 }}>
              ₹{finalPrice.toLocaleString('en-IN')}
            </Text>
            {discountPrice > 0 && (
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: fontFamily.sans, fontSize: 12, textDecorationLine: 'line-through' }}>
                ₹{price.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: fontFamily.sansMedium, fontSize: 11.5 }}>
            Tap to inspect →
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
});

// ── Ad Modal (Clean & Seamless Style Match Discovery) ──
function AdModal({ visible, onClose, colors, fontFamily, fontSize, radius, products, goProduct, isDark }: {
  visible: boolean; onClose: () => void;
  colors: any; fontFamily: any; fontSize: any; radius: any;
  products: any[]; goProduct: (id: number) => void;
  isDark: boolean;
}) {
  const { toggle } = useWishlist();
  const screenDims = Dimensions.get('window');
  const W_MODAL = screenDims.width;
  const H_MODAL = screenDims.height;
  const CARD_W = Math.min(W_MODAL * 0.90, 400);
  const CARD_H = Math.min(H_MODAL * 0.58, 510);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [deckProducts, setDeckProducts] = useState<any[]>([]);
  const [exitingCard, setExitingCard] = useState<{
    item: any;
    direction: 'left' | 'right';
    anim: Animated.ValueXY;
  } | null>(null);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());
  const isSwipingRef = useRef(false);

  // Dedicated button press scales
  const dislikeBtnScale = useRef(new Animated.Value(1)).current;
  const likeBtnScale = useRef(new Animated.Value(1)).current;

  // Active top card interactive pan & transition drivers
  const topCardAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const exitAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const animateBtnPress = (animValue: Animated.Value) => {
    Animated.sequence([
      Animated.timing(animValue, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(animValue, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  };

  const extractProducts = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.products)) return res.products;
    if (Array.isArray(res?.data?.products)) return res.data.products;
    if (Array.isArray(res?.data?.data?.products)) return res.data.data.products;
    if (Array.isArray(res?.result?.products)) return res.result.products;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.result)) return res.result;
    return [];
  };

  const fetchMoreDeckProducts = async (pageNum?: number) => {
    if (isFetchingRef.current || !hasMoreRef.current) return;
    isFetchingRef.current = true;
    const pageToFetch = pageNum ?? (pageRef.current + 1);
    try {
      const res = await fetchProducts({ page: pageToFetch, limit: 30, sortBy: 'createAt', sortOrder: 'DESC' });
      const raw = extractProducts(res);
      const pagination = res?.data?.pagination || res?.pagination || {};

      if (raw.length > 0) {
        const inStock = raw.filter((p: any) => p && p.id && (p.stockQuantity === undefined || p.stockQuantity === null || Number(p.stockQuantity) > 0));
        const newUniques: any[] = [];
        inStock.forEach((p: any) => {
          const key = String(p.id);
          if (!seenIdsRef.current.has(key)) {
            seenIdsRef.current.add(key);
            newUniques.push(p);
          }
        });

        if (newUniques.length > 0) {
          setDeckProducts(prev => [...prev, ...newUniques]);
        }
        pageRef.current = pageToFetch;
        hasMoreRef.current = pagination.hasNextPage ?? (raw.length >= 10);
      } else {
        hasMoreRef.current = false;
      }
    } catch {
      // Ignore network error silently
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      setExitingCard(null);
      pageRef.current = 1;
      hasMoreRef.current = true;
      isFetchingRef.current = false;
      seenIdsRef.current.clear();
      topCardAnim.setValue({ x: 0, y: 0 });
      exitAnim.setValue({ x: 0, y: 0 });

      if (products && products.length > 0) {
        const inStock = products.filter((p: any) => p && p.id && (p.stockQuantity === undefined || p.stockQuantity === null || Number(p.stockQuantity) > 0));
        const initialUniques: any[] = [];
        inStock.forEach((p: any) => {
          const key = String(p.id);
          if (!seenIdsRef.current.has(key)) {
            seenIdsRef.current.add(key);
            initialUniques.push(p);
          }
        });
        if (initialUniques.length > 0) {
          setDeckProducts(initialUniques);
        }
      }
      fetchMoreDeckProducts(1);
    }
  }, [visible]);

  useEffect(() => {
    if (products && products.length > 0 && deckProducts.length === 0) {
      const inStock = products.filter((p: any) => p && p.id && (p.stockQuantity === undefined || p.stockQuantity === null || Number(p.stockQuantity) > 0));
      const initialUniques: any[] = [];
      inStock.forEach((p: any) => {
        const key = String(p.id);
        if (!seenIdsRef.current.has(key)) {
          seenIdsRef.current.add(key);
          initialUniques.push(p);
        }
      });
      if (initialUniques.length > 0) {
        setDeckProducts(initialUniques);
      }
    }
  }, [products]);

  // Image pre-fetching for instant, zero-delay card reveals
  useEffect(() => {
    if (deckProducts.length > currentIndex) {
      const upcoming = deckProducts.slice(currentIndex, currentIndex + 10);
      upcoming.forEach(item => {
        const uri = item.images?.[0]?.imageUrl || item.imageUrl;
        if (uri && typeof uri === 'string') {
          Image.prefetch(uri).catch(() => { });
        }
      });
    }
  }, [currentIndex, deckProducts]);

  const checkPagination = useCallback((nextIdx: number) => {
    if (nextIdx >= deckProducts.length - 6) {
      fetchMoreDeckProducts();
    }
  }, [deckProducts.length]);

  const deckStateRef = useRef({ currentIndex, deckProducts, toggle, checkPagination, onClose, goProduct });
  useEffect(() => {
    deckStateRef.current = { currentIndex, deckProducts, toggle, checkPagination, onClose, goProduct };
  }, [currentIndex, deckProducts, toggle, checkPagination, onClose, goProduct]);

  // Butter-Smooth Native Swipe (Zero snap-back, independent exiting animation)
  const performSwipe = useCallback((direction: 'left' | 'right', startX: number = 0, startY: number = 0) => {
    if (isSwipingRef.current) return;
    const { currentIndex: cIdx, deckProducts: dProds } = deckStateRef.current;
    if (cIdx >= dProds.length) return;
    isSwipingRef.current = true;

    if (direction === 'left') {
      animateBtnPress(dislikeBtnScale);
    } else {
      animateBtnPress(likeBtnScale);
    }

    const currentItem = dProds[cIdx];
    if (direction === 'right' && currentItem?.id) {
      deckStateRef.current.toggle(currentItem.id).catch(() => { });
    }

    const toX = direction === 'right' ? W_MODAL * 1.5 : -W_MODAL * 1.5;
    const toY = startY + (direction === 'right' ? 12 : -12);

    // Position exiting card exactly at current coordinate & trigger state change
    exitAnim.setValue({ x: startX, y: startY });
    setExitingCard({ item: currentItem, direction, anim: exitAnim });

    // Reset top card animation and increment deck index
    topCardAnim.setValue({ x: 0, y: 0 });
    const nextIdx = cIdx + 1;
    setCurrentIndex(nextIdx);
    deckStateRef.current.checkPagination(nextIdx);

    // Animate exiting card smoothly off-screen with native thread
    Animated.timing(exitAnim, {
      toValue: { x: toX, y: toY },
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setExitingCard(null);
      isSwipingRef.current = false;
    });
  }, [W_MODAL, dislikeBtnScale, likeBtnScale, topCardAnim, exitAnim]);

  const triggerSwipe = useCallback((direction: 'left' | 'right') => {
    performSwipe(direction, 0, 0);
  }, [performSwipe]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderGrant: () => {
        if (isSwipingRef.current) return;
        topCardAnim.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (isSwipingRef.current) return;
        topCardAnim.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isSwipingRef.current) return;
        const isRightSwipe = gestureState.dx > 80 || gestureState.vx > 0.4;
        const isLeftSwipe = gestureState.dx < -80 || gestureState.vx < -0.4;

        if (isRightSwipe) {
          performSwipe('right', gestureState.dx, gestureState.dy);
        } else if (isLeftSwipe) {
          performSwipe('left', gestureState.dx, gestureState.dy);
        } else {
          Animated.spring(topCardAnim, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 90,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        if (!isSwipingRef.current) {
          Animated.spring(topCardAnim, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 90,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
    [performSwipe, topCardAnim]
  );

  const nextCardScale = topCardAnim.x.interpolate({
    inputRange: [-W_MODAL * 0.75, 0, W_MODAL * 0.75],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  const nextCardTranslateY = topCardAnim.x.interpolate({
    inputRange: [-W_MODAL * 0.75, 0, W_MODAL * 0.75],
    outputRange: [0, 14, 0],
    extrapolate: 'clamp',
  });

  const nextCardOpacity = topCardAnim.x.interpolate({
    inputRange: [-W_MODAL * 0.75, 0, W_MODAL * 0.75],
    outputRange: [1, 0.92, 1],
    extrapolate: 'clamp',
  });

  const topCardOpacity = topCardAnim.x.interpolate({
    inputRange: [-W_MODAL * 1.2, -W_MODAL * 0.35, 0, W_MODAL * 0.35, W_MODAL * 1.2],
    outputRange: [0, 1, 1, 1, 0],
    extrapolate: 'clamp',
  });

  const topCardRotate = topCardAnim.x.interpolate({
    inputRange: [-W_MODAL, 0, W_MODAL],
    outputRange: ['-14deg', '0deg', '14deg'],
    extrapolate: 'clamp',
  });

  const likeBadgeOpacity = topCardAnim.x.interpolate({
    inputRange: [0, 30, 90],
    outputRange: [0, 0.4, 1],
    extrapolate: 'clamp',
  });

  const dislikeBadgeOpacity = topCardAnim.x.interpolate({
    inputRange: [-90, -30, 0],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const nextCardItem = deckProducts[currentIndex + 1];
  const topCardItem = deckProducts[currentIndex];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        {/* Dark Backdrop */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
        </TouchableOpacity>

        {/* Bottom Sheet Container */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.background,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            height: Math.min(H_MODAL * 0.86, 730),
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.25,
            shadowRadius: 18,
            elevation: 20,
          }}
        >
          {/* Top Drag Indicator */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.18)' }} />
          </View>

          {/* Modal Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? 'rgba(124, 58, 237, 0.18)' : '#F5EEFF', borderColor: isDark ? 'rgba(192, 132, 252, 0.35)' : 'rgba(124, 58, 237, 0.20)', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16 }}>
              <AppIcon name="star-four-points" size={11} color={isDark ? '#C084FC' : '#7C3AED'} />
              <Text style={{ color: isDark ? '#C084FC' : '#7C3AED', fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 1.5 }}>
                STYLE MATCH
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? '#262335' : '#F0EEF5', alignItems: 'center', justifyContent: 'center' }}
            >
              <AppIcon name="close" size={17} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Card Deck Area */}
          <View style={{ flex: 1, marginTop: 16, alignItems: 'center', justifyContent: 'center' }}>
            {deckProducts.length === 0 ? (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: 13, marginTop: 14 }}>
                  Curating styles for you...
                </Text>
              </View>
            ) : currentIndex < deckProducts.length ? (
              <View style={{ width: CARD_W, height: CARD_H }}>
                {/* ── Background Card (Smoothly scales & slides up) ── */}
                {nextCardItem && (
                  <Animated.View
                    key={`bg-${nextCardItem.id}`}
                    style={{
                      position: 'absolute',
                      width: CARD_W,
                      height: CARD_H,
                      alignSelf: 'center',
                      top: 0,
                      zIndex: 1,
                      transform: [
                        { scale: nextCardScale },
                        { translateY: nextCardTranslateY },
                      ],
                      opacity: nextCardOpacity,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 3,
                    }}
                  >
                    <DiscoveryCard
                      item={nextCardItem}
                      isDark={isDark}
                      fontFamily={fontFamily}
                      colors={colors}
                      cardWidth={CARD_W}
                      cardHeight={CARD_H}
                      onPress={() => {
                        if (nextCardItem.id) {
                          onClose();
                          goProduct(nextCardItem.id);
                        }
                      }}
                    />
                  </Animated.View>
                )}

                {/* ── Active Top Card (Smooth Gesture & Dismiss Animation) ── */}
                {topCardItem && (
                  <Animated.View
                    key={`top-${topCardItem.id}`}
                    {...panResponder.panHandlers}
                    style={{
                      position: 'absolute',
                      width: CARD_W,
                      height: CARD_H,
                      alignSelf: 'center',
                      top: 0,
                      zIndex: 2,
                      transform: [
                        { translateX: topCardAnim.x },
                        { translateY: topCardAnim.y },
                        { rotate: topCardRotate },
                      ],
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 8 },
                      shadowOpacity: 0.18,
                      shadowRadius: 14,
                      elevation: 8,
                    }}
                  >
                    <DiscoveryCard
                      item={topCardItem}
                      isDark={isDark}
                      fontFamily={fontFamily}
                      colors={colors}
                      cardWidth={CARD_W}
                      cardHeight={CARD_H}
                      onPress={() => {
                        if (topCardItem.id) {
                          onClose();
                          goProduct(topCardItem.id);
                        }
                      }}
                    />

                    {/* Like / Wishlist Badge Tag Overlay */}
                    <Animated.View
                      style={{
                        position: 'absolute',
                        top: 24,
                        right: 24,
                        transform: [{ rotate: '12deg' }],
                        opacity: likeBadgeOpacity,
                        backgroundColor: 'rgba(236, 72, 153, 0.92)',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                      }}
                      pointerEvents="none"
                    >
                      <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 16, letterSpacing: 1.5 }}>
                        LIKE
                      </Text>
                    </Animated.View>

                    {/* Dislike / Pass Badge Tag Overlay */}
                    <Animated.View
                      style={{
                        position: 'absolute',
                        top: 24,
                        left: 24,
                        transform: [{ rotate: '-12deg' }],
                        opacity: dislikeBadgeOpacity,
                        backgroundColor: 'rgba(100, 116, 139, 0.92)',
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                      }}
                      pointerEvents="none"
                    >
                      <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 16, letterSpacing: 1.5 }}>
                        PASS
                      </Text>
                    </Animated.View>
                  </Animated.View>
                )}

                {/* ── Exiting Ghost Card (Dedicated native exiting trajectory) ── */}
                {exitingCard && (
                  <Animated.View
                    key={`exit-${exitingCard.item.id}`}
                    style={{
                      position: 'absolute',
                      width: CARD_W,
                      height: CARD_H,
                      alignSelf: 'center',
                      top: 0,
                      zIndex: 3,
                      opacity: exitAnim.x.interpolate({
                        inputRange: [-W_MODAL * 1.2, 0, W_MODAL * 1.2],
                        outputRange: [0, 1, 0],
                        extrapolate: 'clamp',
                      }),
                      transform: [
                        { translateX: exitAnim.x },
                        { translateY: exitAnim.y },
                        {
                          rotate: exitAnim.x.interpolate({
                            inputRange: [-W_MODAL, 0, W_MODAL],
                            outputRange: ['-14deg', '0deg', '14deg'],
                            extrapolate: 'clamp',
                          }),
                        },
                      ],
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.22,
                      shadowRadius: 16,
                      elevation: 10,
                    }}
                    pointerEvents="none"
                  >
                    <DiscoveryCard
                      item={exitingCard.item}
                      isDark={isDark}
                      fontFamily={fontFamily}
                      colors={colors}
                      cardWidth={CARD_W}
                      cardHeight={CARD_H}
                      onPress={() => { }}
                    />
                  </Animated.View>
                )}
              </View>
            ) : (
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, paddingVertical: 40 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <AppIcon name="check-all" size={36} color={colors.primary} />
                </View>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 18, textAlign: 'center' }}>
                  You're All Caught Up!
                </Text>
                <Text style={{ textAlign: 'center', color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 13, marginTop: 6, lineHeight: 18 }}>
                  You've curated all the latest styles. Tap below to restart discovery.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setCurrentIndex(0);
                    fetchMoreDeckProducts(1);
                  }}
                  style={{ marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22 }}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 13 }}>Restart Discovery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Clean, Professional Action Bar */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 48, paddingBottom: 32, paddingTop: 14 }}>
            {/* Pass / Dislike Button */}
            <Animated.View style={{ transform: [{ scale: dislikeBtnScale }] }}>
              <TouchableOpacity
                onPress={() => triggerSwipe('left')}
                activeOpacity={0.78}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: isDark ? '#1C162B' : '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.35 : 0.08,
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                <AppIcon name="close" size={24} color={isDark ? '#A78BFA' : '#64748B'} />
              </TouchableOpacity>
            </Animated.View>

            {/* Like / Wishlist Button */}
            <Animated.View style={{ transform: [{ scale: likeBtnScale }] }}>
              <TouchableOpacity
                onPress={() => triggerSwipe('right')}
                activeOpacity={0.78}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  backgroundColor: isDark ? '#2D1124' : '#FFF0F6',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(236, 72, 153, 0.40)' : 'rgba(236, 72, 153, 0.25)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#EC4899',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isDark ? 0.45 : 0.20,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <AppIcon name="cards-heart" size={26} color="#EC4899" />
              </TouchableOpacity>
            </Animated.View>
          </View>

        </View>
      </View>
    </Modal>
  );
}

// ── 24-Hour Countdown Flash Sale Section ──
function FlashCountdownSection({
  products,
  goProduct,
  goShop,
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  isDark,
}: {
  products: any[];
  goProduct: (id: number) => void;
  goShop: () => void;
  colors: any;
  fontFamily: any;
  fontSize: any;
  spacing: any;
  radius: any;
  isDark: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <View style={[styles.premiumSection, { marginTop: spacing[6] }]}>
      <View style={[styles.flashSaleBg, isDark && styles.flashSaleBgDark]}>
        <View style={[styles.ambientOrb1, { backgroundColor: isDark ? '#E11D48' : '#FECDD3' }]} />
        <View style={[styles.ambientOrb2, { backgroundColor: isDark ? '#BE123C' : '#FFE4E6' }]} />
        <View style={styles.bgGradientOverlay} />
        {/* Flash Sale Header with Timer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[2] }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ backgroundColor: '#E11D48', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, shadowColor: '#E11D48', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
                <AppIcon name="lightning-bolt" size={12} color="#FFF" />
                <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 9.5, letterSpacing: 1.2 }}>FLASH SALE</Text>
              </View>
              <View style={{ backgroundColor: isDark ? 'rgba(225,29,72,0.15)' : '#FFE4E8', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                <Text style={{ color: '#E11D48', fontFamily: fontFamily.sansBold, fontSize: 9.5 }}>LIMITED 24H</Text>
              </View>
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 23, letterSpacing: -0.5 }}>
              24-Hour Exclusive Deals
            </Text>
            <Text style={{ color: isDark ? '#FDA4AF' : '#9F1239', fontFamily: fontFamily.sans, fontSize: 11.5, marginTop: 2 }}>
              Special jewellery markdowns & deals closing soon
            </Text>
          </View>

          {/* Countdown Clock */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3.5, backgroundColor: isDark ? 'rgba(225,29,72,0.22)' : '#FFF0F3', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(225,29,72,0.3)', shadowColor: '#E11D48', shadowOpacity: isDark ? 0.35 : 0.15, shadowRadius: 6, elevation: 3 }}>
            <View style={{ backgroundColor: '#E11D48', minWidth: 24, height: 24, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 11.5 }}>{pad(timeLeft.hours)}</Text>
            </View>
            <Text style={{ color: '#E11D48', fontFamily: fontFamily.sansBold, fontSize: 12 }}>:</Text>
            <View style={{ backgroundColor: '#E11D48', minWidth: 24, height: 24, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 11.5 }}>{pad(timeLeft.minutes)}</Text>
            </View>
            <Text style={{ color: '#E11D48', fontFamily: fontFamily.sansBold, fontSize: 12 }}>:</Text>
            <View style={{ backgroundColor: '#E11D48', minWidth: 24, height: 24, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 11.5 }}>{pad(timeLeft.seconds)}</Text>
            </View>
          </View>
        </View>

        {/* Product List */}
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 14, paddingTop: 8, gap: 12 }}
          keyExtractor={item => 'flash-' + item.id}
          renderItem={({ item }) => (
            <View style={[styles.modernCard]}>
              <ProductCard product={item} onPress={() => goProduct(item.id)} />
            </View>
          )}
        />
      </View>
    </View>
  );
}

// ── Featured Fashion Spotlight Section ──
function FeaturedSpotlightSection({
  products,
  goProduct,
  goShop,
  colors,
  fontFamily,
  fontSize,
  spacing,
  radius,
  isDark,
}: {
  products: any[];
  goProduct: (id: number) => void;
  goShop: () => void;
  colors: any;
  fontFamily: any;
  fontSize: any;
  spacing: any;
  radius: any;
  isDark: boolean;
}) {
  return (
    <View style={[styles.premiumSection, { marginTop: spacing[6] }]}>
      <View style={[styles.emeraldLoungeBg, isDark && styles.emeraldLoungeBgDark]}>
        <View style={[styles.ambientOrb1, { backgroundColor: isDark ? '#059669' : '#A7F3D0' }]} />
        <View style={[styles.ambientOrb2, { backgroundColor: isDark ? '#10B981' : '#6EE7B7' }]} />
        <View style={styles.bgGradientOverlay} />
        {/* Header */}
        <View style={[styles.sectionBlockHeader, { paddingHorizontal: spacing[4], paddingTop: spacing[4] }]}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ backgroundColor: isDark ? 'rgba(5,150,105,0.22)' : '#D1FAE5', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: isDark ? 'rgba(52,211,153,0.3)' : 'rgba(5,150,105,0.2)' }}>
                <AppIcon name="diamond-stone" size={12} color={isDark ? '#6EE7B7' : '#059669'} />
                <Text style={{ color: isDark ? '#A7F3D0' : '#065F46', fontFamily: fontFamily.sansBold, fontSize: 9.5, letterSpacing: 1.2 }}>EXCLUSIVE</Text>
              </View>
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 24, letterSpacing: -0.5 }}>
              Curated Picks
            </Text>
            <Text style={{ color: isDark ? '#A7F3D0' : '#047857', fontFamily: fontFamily.sans, fontSize: 11.5, marginTop: 2 }}>
              Handcrafted statement pieces & festive essentials
            </Text>
          </View>

          <TouchableOpacity
            onPress={goShop}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: isDark ? '#059669' : '#059669',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 22,
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.35,
              shadowRadius: 6,
              elevation: 4,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 11.5 }}>View All</Text>
            <AppIcon name="arrow-right" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Product Carousel */}
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 14, paddingTop: 8, gap: 12 }}
          keyExtractor={item => 'spot-' + item.id}
          renderItem={({ item }) => (
            <View style={[styles.modernCard]}>
              <ProductCard product={item} onPress={() => goProduct(item.id)} />
            </View>
          )}
        />
      </View>
    </View>
  );
}

// ── In-Feed Horizontal Product Scroll Section ──
function HorizontalProductRow({
  title,
  products,
  goProduct,
  goShop,
  colors,
  fontFamily,
  spacing,
  radius,
  isDark,
}: {
  title: string;
  products: any[];
  goProduct: (id: number) => void;
  goShop: () => void;
  colors: any;
  fontFamily: any;
  spacing: any;
  radius: any;
  isDark: boolean;
}) {
  if (!products || products.length === 0) return null;

  return (
    <View style={{ marginVertical: 16, backgroundColor: isDark ? '#14111D' : '#F7F5FC', paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.1)' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], marginBottom: 12 }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <View style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : '#EDE9FE', paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(167,139,250,0.3)' : 'rgba(124,58,237,0.2)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppIcon name="star-four-points" size={11} color={isDark ? '#C4B5FD' : '#7C3AED'} />
              <Text style={{ color: isDark ? '#DDD6FE' : '#6D28D9', fontFamily: fontFamily.sansBold, fontSize: 9.5, letterSpacing: 1.2 }}>
                CURATED SPOTLIGHT
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 21, letterSpacing: -0.4 }}>
            {title}
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 2 }}>
            Handpicked premium selections at exceptional value
          </Text>
        </View>
        <TouchableOpacity
          onPress={goShop}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.05,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ color: '#7C3AED', fontFamily: fontFamily.sansBold, fontSize: 11.5 }}>View All</Text>
          <AppIcon name="arrow-right" size={12} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing[4], gap: 12 }}
        keyExtractor={item => 'hrow-' + item.id}
        renderItem={({ item }) => (
          <View style={[styles.modernCard]}>
            <ProductCard product={item} onPress={() => goProduct(item.id)} />
          </View>
        )}
      />
    </View>
  );
}

const LUXURY_CATEGORY_THEMES = [
  {
    icon: 'star-four-points-outline',
    badge: 'TRENDING',
    sub: '250+ Handcrafted Designs',
    bgLight: '#FFF8F0',
    bgDark: '#1C1208',
    borderLight: 'rgba(217, 119, 6, 0.28)',
    borderDark: 'rgba(245, 158, 11, 0.35)',
    accent: '#D97706',
    iconBgLight: 'rgba(217, 119, 6, 0.14)',
    iconBgDark: 'rgba(245, 158, 11, 0.22)',
  },
  {
    icon: 'clock-time-four-outline',
    badge: 'LUXURY',
    sub: 'Premium Jewellery Pieces',
    bgLight: '#F3F4FF',
    bgDark: '#0E1226',
    borderLight: 'rgba(79, 70, 229, 0.28)',
    borderDark: 'rgba(129, 140, 248, 0.35)',
    accent: '#4F46E5',
    iconBgLight: 'rgba(79, 70, 229, 0.14)',
    iconBgDark: 'rgba(129, 140, 248, 0.22)',
  },
  {
    icon: 'gift-outline',
    badge: 'BESTSELLER',
    sub: 'Gift Sets & Combos',
    bgLight: '#FFF0F4',
    bgDark: '#200A14',
    borderLight: 'rgba(225, 29, 72, 0.28)',
    borderDark: 'rgba(251, 113, 133, 0.35)',
    accent: '#E11D48',
    iconBgLight: 'rgba(225, 29, 72, 0.14)',
    iconBgDark: 'rgba(251, 113, 133, 0.22)',
  },
  {
    icon: 'circle-double',
    badge: 'HERITAGE',
    sub: 'Traditional & Modern',
    bgLight: '#EFFDF5',
    bgDark: '#071A11',
    borderLight: 'rgba(5, 150, 105, 0.28)',
    borderDark: 'rgba(52, 211, 153, 0.35)',
    accent: '#059669',
    iconBgLight: 'rgba(5, 150, 105, 0.14)',
    iconBgDark: 'rgba(52, 211, 153, 0.22)',
  },
  {
    icon: 'diamond-stone',
    badge: 'EXCLUSIVE',
    sub: 'Statement & Everyday',
    bgLight: '#F6F2FF',
    bgDark: '#160C26',
    borderLight: 'rgba(124, 58, 237, 0.28)',
    borderDark: 'rgba(167, 139, 250, 0.35)',
    accent: '#7C3AED',
    iconBgLight: 'rgba(124, 58, 237, 0.14)',
    iconBgDark: 'rgba(167, 139, 250, 0.22)',
  },
  {
    icon: 'link-variant',
    badge: 'POPULAR',
    sub: 'Chains & Layering',
    bgLight: '#FFFBEA',
    bgDark: '#201605',
    borderLight: 'rgba(180, 83, 9, 0.28)',
    borderDark: 'rgba(245, 158, 11, 0.35)',
    accent: '#B45309',
    iconBgLight: 'rgba(180, 83, 9, 0.14)',
    iconBgDark: 'rgba(245, 158, 11, 0.22)',
  },
];

// ── In-Feed Category Feature Grid Tiles ──
function CategoryGridSection({
  categories,
  goShop,
  colors,
  fontFamily,
  spacing,
  radius,
  isDark,
}: {
  categories: any[];
  goShop: (params?: any) => void;
  colors: any;
  fontFamily: any;
  spacing: any;
  radius: any;
  isDark: boolean;
}) {
  if (!categories || categories.length === 0) return null;
  const displayCats = categories.slice(0, 4);

  return (
    <View style={{ marginVertical: 18, marginHorizontal: spacing[4] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <AppIcon name="grid-large" size={13} color={colors.primary} />
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase' }}>
              COLLECTIONS DIRECTORY
            </Text>
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 22, letterSpacing: -0.4 }}>
            Explore Collections
          </Text>
        </View>
        <TouchableOpacity onPress={() => goShop()} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 12 }}>View All</Text>
          <AppIcon name="chevron-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {displayCats.map((cat, idx) => {
          const theme = LUXURY_CATEGORY_THEMES[idx % LUXURY_CATEGORY_THEMES.length];
          const img = getCategorySource(cat, idx);
          return (
            <TouchableOpacity
              key={cat.id || idx}
              onPress={() => goShop({ categoryId: cat.id, categoryName: cat.name })}
              activeOpacity={0.88}
              style={{
                width: (W - spacing[4] * 2 - 12) / 2,
                minHeight: 124,
                borderRadius: 20,
                backgroundColor: isDark ? theme.bgDark : theme.bgLight,
                borderWidth: 1.2,
                borderColor: isDark ? theme.borderDark : theme.borderLight,
                padding: 14,
                justifyContent: 'space-between',
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: isDark ? 0.25 : 0.08,
                shadowRadius: 8,
                elevation: 3,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Background ambient glow circle */}
              <View
                style={{
                  position: 'absolute',
                  top: -15,
                  right: -15,
                  width: 70,
                  height: 70,
                  borderRadius: 35,
                  backgroundColor: theme.accent,
                  opacity: isDark ? 0.15 : 0.08,
                }}
              />

              {/* Top Row: Badge & Circular Image Shield */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View
                  style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                  }}
                >
                  <Text style={{ color: theme.accent, fontFamily: fontFamily.sansBold, fontSize: 9, letterSpacing: 1 }}>
                    {theme.badge}
                  </Text>
                </View>

                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    borderWidth: 1.5,
                    borderColor: theme.accent,
                    overflow: 'hidden',
                    backgroundColor: colors.surface,
                    shadowColor: theme.accent,
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </View>
              </View>

              {/* Bottom: Title & Explore Link */}
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 16 }} numberOfLines={1}>
                  {cat.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 10.5 }}>
                    {theme.sub}
                  </Text>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: isDark ? theme.iconBgDark : theme.iconBgLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <AppIcon name="arrow-top-right" size={13} color={theme.accent} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── In-Feed Category Sliding Carousel Banners ──
function CategoryCarouselBanners({
  categories,
  goShop,
  colors,
  fontFamily,
  spacing,
  radius,
  isDark,
}: {
  categories: any[];
  goShop: (params?: any) => void;
  colors: any;
  fontFamily: any;
  spacing: any;
  radius: any;
  isDark: boolean;
}) {
  if (!categories || categories.length === 0) return null;

  return (
    <View style={{ marginVertical: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], marginBottom: 14 }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <AppIcon name="crown-outline" size={13} color="#E11D48" />
            <Text style={{ color: '#E11D48', fontFamily: fontFamily.sansBold, fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase' }}>
              FEATURED COLLECTIONS
            </Text>
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 22, letterSpacing: -0.4 }}>
            Curated Jewellery Highlights
          </Text>
        </View>
      </View>

      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing[4], gap: 14 }}
        keyExtractor={item => 'catcar-' + item.id}
        renderItem={({ item, index }) => {
          const theme = LUXURY_CATEGORY_THEMES[index % LUXURY_CATEGORY_THEMES.length];
          const img = getCategorySource(item, index);
          return (
            <TouchableOpacity
              onPress={() => goShop({ categoryId: item.id, categoryName: item.name })}
              activeOpacity={0.9}
              style={{
                width: W * 0.74,
                height: 140,
                borderRadius: 22,
                backgroundColor: isDark ? theme.bgDark : theme.bgLight,
                borderWidth: 1.2,
                borderColor: isDark ? theme.borderDark : theme.borderLight,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.3 : 0.1,
                shadowRadius: 10,
                elevation: 4,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Background ambient accent orb */}
              <View
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: theme.accent,
                  opacity: isDark ? 0.12 : 0.08,
                }}
              />

              {/* Left Content Column */}
              <View style={{ flex: 1, paddingRight: 10, justifyContent: 'space-between', height: '100%' }}>
                <View>
                  <View
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                      marginBottom: 6,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
                    }}
                  >
                    <Text style={{ color: theme.accent, fontFamily: fontFamily.sansBold, fontSize: 9, letterSpacing: 1.2 }}>
                      {theme.badge} SPOTLIGHT
                    </Text>
                  </View>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 18 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                    {theme.sub}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ color: theme.accent, fontFamily: fontFamily.sansBold, fontSize: 12 }}>Shop Collection</Text>
                  <AppIcon name="arrow-right" size={13} color={theme.accent} />
                </View>
              </View>

              {/* Right Showcase Card with Gold Border & Image */}
              <View
                style={{
                  width: 84,
                  height: 96,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: theme.accent,
                  backgroundColor: colors.surface,
                  overflow: 'hidden',
                  shadowColor: theme.accent,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 3,
                }}
              >
                <Image source={img} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { isDark, setMode } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;

  const [banners, setBanners] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newArrivals, setNewArrivals] = useState<any[]>([]);
  const [expressDrops, setExpressDrops] = useState<any[]>([]);
  const [flashSale, setFlashSale] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [featPage, setFeatPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  let firstName = 'Guest';
  if (user && typeof user.name === 'string') {
    const parts = user.name.split(' ').map(s => s.trim().toLowerCase());
    if (parts.length > 0 && parts[0] !== 'undefined' && parts[0] !== 'null' && parts[0] !== '') {
      firstName = user.name.split(' ')[0].trim();
    }
  }
  const [locationLabel, setLocationLabel] = useState('Fetching location...');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const thumbPos = useRef(new Animated.Value(isDark ? 28 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(thumbPos, {
        toValue: isDark ? 28 : 0,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: isDark ? 1 : 0,
        duration: 350,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isDark, thumbPos, rotateAnim]);

  const handleThemeToggle = useCallback(() => {
    const nextIsDark = !isDark;

    Animated.parallel([
      Animated.spring(thumbPos, {
        toValue: nextIsDark ? 28 : 0,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: nextIsDark ? 1 : 0,
        duration: 350,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pressScale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
        Animated.spring(pressScale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
    ]).start();

    requestAnimationFrame(() => {
      startTransition(() => {
        setMode(nextIsDark ? 'dark' : 'light');
      });
    });
  }, [isDark, setMode, thumbPos, rotateAnim, pressScale]);

  const iconRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const loadUserLocation = useCallback(() => {
    AsyncStorage.getItem(LOCATION_STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.label) {
            setLocationLabel(parsed.label);
            return;
          }
        } catch { }
      }

      if (!user?.id) {
        setLocationLabel('Select Location');
        return;
      }
      fetchAddresses(user.id)
        .then((res: any) => {
          const list = res?.data?.data ?? res?.data ?? res?.result?.data ?? res?.result ?? [];
          const addressList = Array.isArray(list) ? list : [];
          const primary = addressList.find((a: any) => a.isDefault || a.is_default || String(a.isDefault) === '1') ?? addressList[0];

          if (!primary) {
            setLocationLabel('Select Location');
            return;
          }

          const line1 = (primary?.line1 || primary?.addressLine1 || primary?.address_line1 || '').trim();
          const city = (primary?.cityName || primary?.city || '').trim();
          const state = (primary?.stateName || primary?.state_name || primary?.state || '').trim();
          const postalCode = String(primary?.postal_code || primary?.pincode || primary?.zipCode || '').trim();

          const cleanLine1 = line1 && line1 !== 'undefined' && line1 !== 'null' ? line1 : null;
          const cleanCity = city && city !== 'undefined' && city !== 'null' ? city : null;
          const cleanState = state && state !== 'undefined' && state !== 'null' ? state : null;
          const cleanPostal = postalCode && postalCode !== 'undefined' && postalCode !== 'null' ? postalCode : null;

          if (cleanLine1 && cleanCity) {
            setLocationLabel(`${cleanLine1}, ${cleanCity}`);
          } else if (cleanLine1 && cleanPostal) {
            setLocationLabel(`${cleanLine1}, ${cleanPostal}`);
          } else if (cleanCity && cleanState) {
            setLocationLabel(`${cleanCity}, ${cleanState}`);
          } else if (cleanCity && cleanPostal) {
            setLocationLabel(`${cleanCity} - ${cleanPostal}`);
          } else if (cleanCity) {
            setLocationLabel(cleanCity);
          } else if (cleanPostal) {
            setLocationLabel(`PIN ${cleanPostal}`);
          } else {
            setLocationLabel('Select Location');
          }
        })
        .catch(() => {
          setLocationLabel('Select Location');
        });
    });
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadUserLocation();
    }, [loadUserLocation])
  );

  const scrollY = useRef(new Animated.Value(0)).current;
  const bgInterpolate = scrollY.interpolate({
    inputRange: [0, 800, 1600],
    outputRange: [colors.background, isDark ? '#120E1F' : '#F5F0FF', isDark ? '#181228' : '#EAF4EC'],
    extrapolate: 'clamp',
  });

  const [search, setSearch] = useState('');
  const [bannerIdx, setBannerIdx] = useState(0);
  const [adVisible, setAdVisible] = useState(false);

  const bannerRef = useRef<Animated.FlatList<any> | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingMoreRef = useRef(false);
  const bannerWidth = W - spacing[4] * 2;

  const loadInitial = useCallback(async () => {
    try {
      const [banRes, catRes, p1Res, p2Res] = await Promise.allSettled([
        fetchActiveBanners(),
        fetchCategories(),
        fetchProducts({ page: 1, limit: 16, sortBy: 'createAt', sortOrder: 'DESC' }),
        fetchProducts({ page: 2, limit: 16, sortBy: 'createAt', sortOrder: 'DESC' }),
      ]);
      if (banRes.status === 'fulfilled') setBanners(unwrapArray(banRes.value));
      if (catRes.status === 'fulfilled') setCategories(unwrapArray(catRes.value));

      let allProds: any[] = [];
      if (p1Res.status === 'fulfilled') {
        const b = p1Res.value?.data ?? p1Res.value?.result ?? p1Res.value;
        const prods = b?.data?.products || b?.products || [];
        allProds = [...prods];
      }
      if (p2Res.status === 'fulfilled') {
        const b = p2Res.value?.data ?? p2Res.value?.result ?? p2Res.value;
        const prods = b?.data?.products || b?.products || [];
        const pagination = b?.data?.pagination || b?.pagination || {};
        allProds = [...allProds, ...prods];
        setHasMore(pagination.hasNextPage ?? false);
      }

      // Filter out out-of-stock products & deduplicate products by string ID
      const inStockAll = allProds.filter((p: any) => p.stockQuantity === undefined || p.stockQuantity === null || Number(p.stockQuantity) > 0);
      const uniqueProds = Array.from(new Map(inStockAll.map(item => [String(item.id), item])).values());

      if (uniqueProds.length > 0) {
        // Slice into non-overlapping arrays so every section shows distinct products
        const na = uniqueProds.slice(0, 6);
        const ex = uniqueProds.slice(6, 12);
        const fl = uniqueProds.slice(12, 18);
        const tr = uniqueProds.slice(18, 24);
        const ft = uniqueProds.slice(24);

        setNewArrivals(na.length > 0 ? na : uniqueProds);
        setExpressDrops(ex.length > 0 ? ex : uniqueProds);
        setFlashSale(fl.length > 0 ? fl : uniqueProds);
        setTrending(tr.length > 0 ? tr : uniqueProds);
        setFeatured(ft.length > 0 ? ft : uniqueProds);
        setFeatPage(2);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // Show ad modal automatically on first load
  const hasAutoOpenedRef = useRef(false);
  useEffect(() => {
    if (!loading && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      const timer = setTimeout(() => {
        setAdVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Auto-scroll banners
  useEffect(() => {
    if (bannerTimer.current) clearInterval(bannerTimer.current);
    if (banners.length < 2) return;
    bannerTimer.current = setInterval(() => {
      setBannerIdx(prev => {
        const next = (prev + 1) % banners.length;
        bannerRef.current?.scrollToOffset({ offset: bannerWidth * next, animated: true });
        return next;
      });
    }, 4500);
    return () => { if (bannerTimer.current) clearInterval(bannerTimer.current); };
  }, [banners.length, bannerWidth]);

  const loadMoreFeatured = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = featPage + 1;
      const res = await fetchProducts({ page: next, limit: 12, sortBy: 'createAt', sortOrder: 'DESC' });
      const b = res?.data ?? res?.result ?? res;
      const prods = b?.data?.products || b?.products || [];
      const pagination = b?.data?.pagination || b?.pagination || {};

      const inStockProds = prods.filter((p: any) => p.stockQuantity === undefined || p.stockQuantity === null || Number(p.stockQuantity) > 0);
      setFeatured(prev => {
        const existingIds = new Set(prev.map((p: any) => String(p.id)));
        const newUnique = inStockProds.filter((p: any) => !existingIds.has(String(p.id)));
        return [...prev, ...newUnique];
      });
      setHasMore(pagination.hasNextPage ?? false);
      setFeatPage(next);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [hasMore, featPage]);

  const goShop = (params?: TabParamList['Shop']) =>
    navigation.navigate('Shop', params);

  const goProduct = (id: number) => {
    const rootNav = navigation.getParent() as any;
    rootNav?.navigate('ProductDetail', { productId: id });
  };
  const handleSearchSubmit = useCallback(() => {
    const term = search.trim();
    if (term) goShop({ search: term });
  }, [goShop, search]);

  // Grid rows of 2
  const rows: any[][] = [];
  for (let i = 0; i < featured.length; i += 2) rows.push(featured.slice(i, i + 2));

  const THEMES = [
    {
      badge: 'DESIGNER PICKS',
      icon: 'star-four-points',
      title: 'Designer Jewellery Collections',
      subtitle: 'Handcrafted fashion jewellery & trending accessories',
      bgLight: '#F7F2FF',
      bgDark: '#120A24',
      badgeColor: '#7C3AED',
    },
    {
      badge: 'CONTEMPORARY',
      icon: 'heart-outline',
      title: 'Contemporary Statement Jewels',
      subtitle: 'Modern fashion jewellery & trendy everyday accents',
      bgLight: '#FFF0F6',
      bgDark: '#200816',
      badgeColor: '#EC4899',
    },
    {
      badge: 'EVERYDAY WEAR',
      icon: 'sparkles',
      title: 'Trending Fashion Picks',
      subtitle: 'Stylish accessories & lightweight daily wear',
      bgLight: '#FFFBEB',
      bgDark: '#1A1205',
      badgeColor: '#F59E0B',
    },
    {
      badge: 'SPECIAL OCCASION',
      icon: 'diamond-stone',
      title: 'Festive & Party Collections',
      subtitle: 'Chic statement pieces for special celebrations',
      bgLight: '#F0F4FF',
      bgDark: '#0A1028',
      badgeColor: '#6366F1',
    },
  ];

  const mixedData: any[] = [];
  let currentBlock = 0;

  for (let i = 0; i < rows.length; i++) {
    const themeObj = THEMES[currentBlock % THEMES.length];
    const sectionBg = isDark ? themeObj.bgDark : themeObj.bgLight;
    const isFirstInBlock = i % 2 === 0;

    mixedData.push({
      type: 'product-row',
      data: rows[i],
      id: `prod-row-${i}`,
      bg: sectionBg,
      headerTitle: isFirstInBlock ? themeObj.title : undefined,
      headerBadge: isFirstInBlock ? themeObj.badge : undefined,
      headerSubtitle: isFirstInBlock ? themeObj.subtitle : undefined,
      headerIcon: isFirstInBlock ? themeObj.icon : undefined,
      badgeColor: themeObj.badgeColor,
    });

    if ((i + 1) % 2 === 0 && i !== rows.length - 1) {
      const breakIdx = Math.floor((i + 1) / 2) - 1;
      const types = ['horizontal-carousel', 'category-tiles', 'category-carousel', 'banner', 'promo-vibe'];
      const breakType = types[breakIdx % types.length];
      mixedData.push({ type: breakType, id: `break-${breakIdx}` });
      currentBlock++;
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 12 }}>
            Loading collection...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>

      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent animated />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bgInterpolate }]} />
      <Animated.View style={{ backgroundColor: bgInterpolate, paddingTop: (Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24) + 10, paddingBottom: spacing[2], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.10)', zIndex: 10 }}>
        {/* ── Top Luxury Navbar ── */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Account')}
              activeOpacity={0.85}
              style={styles.avatarRingWrap}
            >
              <View style={[styles.avatarRing, { borderColor: isDark ? '#A78BFA' : '#7C3AED', backgroundColor: isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.10)' }]}>
                <View style={[styles.avatarInner, { backgroundColor: isDark ? '#1C1236' : '#F5EEFF' }]}>
                  <Text style={[styles.avatarText, { color: isDark ? '#C4B5FD' : '#7C3AED', fontFamily: fontFamily.sansBold }]}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={[styles.avatarVipBadge, { backgroundColor: '#EC4899' }]}>
                <AppIcon name="star" size={7} color="#FFF" />
              </View>
            </TouchableOpacity>

            <View style={{ justifyContent: 'center', flex: 1 }}>
              <Text style={[styles.greetingSub, { color: isDark ? '#C4B5FD' : '#7C3AED', fontFamily: fontFamily.sansMedium }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.greetingTitle, { color: colors.textPrimary, fontFamily: fontFamily.sansBold }]} numberOfLines={1}>
                {firstName}
              </Text>
              <TouchableOpacity
                onPress={() => setLocationModalVisible(true)}
                activeOpacity={0.7}
                style={[
                  styles.locationChip,
                  {
                    backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)',
                    borderColor: isDark ? 'rgba(167,139,250,0.30)' : 'rgba(124,58,237,0.22)',
                  },
                ]}
              >
                <AppIcon name="map-marker" size={10} color={isDark ? '#C4B5FD' : '#7C3AED'} />
                <Text style={[styles.locationText, { color: colors.textSecondary, fontFamily: fontFamily.sansMedium }]} numberOfLines={1}>
                  {locationLabel}
                </Text>
                <AppIcon name="chevron-down" size={10} color={isDark ? '#C4B5FD' : '#7C3AED'} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.topBarRight}>
            <Animated.View style={{ transform: [{ scale: pressScale }] }}>
              <TouchableOpacity
                onPress={handleThemeToggle}
                activeOpacity={0.9}
                style={[
                  styles.themeCapsuleLuxury,
                  {
                    backgroundColor: isDark ? 'rgba(24, 16, 42, 0.95)' : 'rgba(245, 238, 255, 0.95)',
                    borderColor: isDark ? 'rgba(165, 180, 252, 0.35)' : 'rgba(124, 58, 237, 0.35)',
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.themeThumbLuxury,
                    {
                      backgroundColor: isDark ? '#2E1A47' : '#FFFFFF',
                      transform: [{ translateX: thumbPos }],
                      shadowColor: isDark ? '#A78BFA' : '#7C3AED',
                      borderColor: isDark ? 'rgba(165,180,252,0.45)' : 'rgba(124,58,237,0.30)',
                    },
                  ]}
                >
                  <Animated.View style={{ transform: [{ rotate: iconRotate }] }}>
                    <AppIcon
                      name={isDark ? 'weather-night' : 'weather-sunny'}
                      size={14}
                      color={isDark ? '#C4B5FD' : '#7C3AED'}
                    />
                  </Animated.View>
                </Animated.View>
                <View style={styles.themeCapsuleIcons}>
                  <View style={styles.themeIconSlot}>
                    <AppIcon name="weather-sunny" size={11} color={isDark ? 'rgba(255,255,255,0.25)' : 'transparent'} />
                  </View>
                  <View style={styles.themeIconSlot}>
                    <AppIcon name="weather-night" size={11} color={isDark ? 'transparent' : 'rgba(0,0,0,0.25)'} />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchRowLuxury}>
          <TouchableOpacity
            onPress={handleSearchSubmit}
            activeOpacity={0.9}
            style={[
              styles.searchBarLuxury,
              {
                backgroundColor: isDark ? 'rgba(20, 14, 34, 0.92)' : 'rgba(255, 255, 255, 0.98)',
                borderColor: isDark ? 'rgba(167, 139, 250, 0.32)' : 'rgba(124, 58, 237, 0.28)',
              },
            ]}
          >
            <View style={[styles.searchIconBadge, { backgroundColor: isDark ? '#7C3AED' : '#7C3AED' }]}>
              <AppIcon name="magnify" size={16} color="#FFFFFF" />
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              placeholder="Search rings, necklaces, bangles, earrings..."
              placeholderTextColor={isDark ? '#8E82A3' : '#9688AA'}
              returnKeyType="search"
              blurOnSubmit
              style={[styles.searchInputLuxury, { color: colors.textPrimary, fontFamily: fontFamily.sans }]}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <AppIcon name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
            <View style={[styles.searchFilterBtn, { backgroundColor: isDark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.12)' }]}>
              <AppIcon name="tune-variant" size={15} color={isDark ? '#C4B5FD' : '#7C3AED'} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Top Categories Story Carousel ── */}
        {categories.length > 0 && (
          <View style={{ marginTop: 12, marginBottom: 6, paddingBottom: 4 }}>
            <Animated.FlatList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
              keyExtractor={item => 'topcat-' + item.id}
              renderItem={({ item, index }) => {
                const catImg = getCategorySource(item, index);
                return (
                  <TouchableOpacity
                    onPress={() => goShop({ categoryId: item.id, categoryName: item.name })}
                    activeOpacity={0.82}
                    style={{ alignItems: 'center', width: 76 }}
                  >
                    {/* Story-style Ring matching Shop page */}
                    <View
                      style={[
                        styles.categoryRingOuter,
                        {
                          borderColor: colors.primary,
                          backgroundColor: colors.surfaceElevated,
                          shadowColor: colors.primary,
                          shadowOpacity: isDark ? 0.35 : 0.12,
                        },
                      ]}
                    >
                      <View style={[styles.categoryRingInner, { backgroundColor: colors.surface }]}>
                        <Image source={catImg} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.categoryLabelText,
                        {
                          color: colors.textPrimary,
                          fontFamily: fontFamily.sansBold,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </Animated.View>

      <Animated.FlatList
        data={mixedData}

        ListHeaderComponent={
          <View>
            <PromoMarquee fontFamily={fontFamily} isDark={isDark} />

            {banners.length > 0 && (
              <View style={[styles.bannerWrap, { marginHorizontal: spacing[4], borderRadius: radius.xl, marginTop: spacing[4] }]}>
                <Animated.FlatList
                  ref={bannerRef}
                  data={banners}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(_, i) => 'b' + i}
                  getItemLayout={(_, index) => ({
                    length: bannerWidth,
                    offset: bannerWidth * index,
                    index,
                  })}
                  initialScrollIndex={0}
                  snapToInterval={bannerWidth}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  disableIntervalMomentum
                  onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / bannerWidth);
                    setBannerIdx(idx);
                  }}
                  onScrollToIndexFailed={({ index }) => {
                    requestAnimationFrame(() => {
                      bannerRef.current?.scrollToOffset({ offset: bannerWidth * index, animated: true });
                    });
                  }}
                  style={{ borderRadius: radius.xl, overflow: 'hidden' }}
                  renderItem={({ item }) => {
                    const uri = getBannerImageUrl(item);
                    return (
                      <View style={{ width: bannerWidth, height: BANNER_H }}>
                        {uri ? (
                          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                        ) : (
                          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }]}>
                            <AppIcon name="diamond-stone" size={34} color={colors.primary} />
                          </View>
                        )}
                      </View>
                    );
                  }}
                />
                {banners.length > 1 && (
                  <View style={styles.dotsRow}>
                    {banners.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          { backgroundColor: i === bannerIdx ? '#7C3AED' : 'rgba(255,255,255,0.5)', width: i === bannerIdx ? 18 : 6 },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── New Arrivals ── */}
            {newArrivals.length > 0 && (
              <View style={[styles.premiumSection, { marginTop: spacing[6] }]}>
                <View style={[styles.newArrivalsBg, isDark && styles.newArrivalsBgDark]}>
                  <View style={[styles.ambientOrb1, { backgroundColor: isDark ? '#7C3AED' : '#C4B5FD' }]} />
                  <View style={[styles.ambientOrb2, { backgroundColor: isDark ? '#4F46E5' : '#DDD6FE' }]} />
                  <View style={styles.bgGradientOverlay} />

                  <View style={[styles.sectionBlockHeader, { paddingHorizontal: spacing[4], paddingTop: spacing[4] }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View style={{ backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#EDE9FE', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: isDark ? 'rgba(129,140,248,0.3)' : 'rgba(99,102,241,0.2)' }}>
                          <AppIcon name="star-four-points" size={12} color={isDark ? '#A5B4FC' : '#6366F1'} />
                          <Text style={{ color: isDark ? '#C7D2FE' : '#4F46E5', fontFamily: fontFamily.sansBold, fontSize: 9.5, letterSpacing: 1.2 }}>
                            JUST DROPPED
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 24, letterSpacing: -0.5 }}>
                        New Arrivals
                      </Text>
                      <Text style={{ color: isDark ? '#94A3B8' : '#64748B', fontFamily: fontFamily.sans, fontSize: 11.5, marginTop: 2 }}>
                        Freshly crafted designer jewellery & latest season drops
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => goShop()}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: '#4F46E5',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 22,
                        shadowColor: '#4F46E5',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 11.5 }}>Explore</Text>
                      <AppIcon name="arrow-right" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={newArrivals}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 6, gap: 12 }}
                    keyExtractor={item => 'na-' + item.id}
                    renderItem={({ item }) => (
                      <View style={[styles.modernCard]}>
                        <ProductCard product={item} onPress={() => goProduct(item.id)} />
                      </View>
                    )}
                  />
                </View>
              </View>
            )}

            {/* ── Featured Fashion Spotlight Section ── */}
            {expressDrops.length > 0 && (
              <FeaturedSpotlightSection
                products={expressDrops}
                goProduct={goProduct}
                goShop={() => goShop()}
                colors={colors}
                fontFamily={fontFamily}
                fontSize={fontSize}
                spacing={spacing}
                radius={radius}
                isDark={isDark}
              />
            )}

            {/* ── 24-Hour Countdown Flash Sale Section ── */}
            {flashSale.length > 0 && (
              <FlashCountdownSection
                products={flashSale}
                goProduct={goProduct}
                goShop={() => goShop()}
                colors={colors}
                fontFamily={fontFamily}
                fontSize={fontSize}
                spacing={spacing}
                radius={radius}
                isDark={isDark}
              />
            )}

            {/* ── Trending Now ── */}
            {trending.length > 0 && (
              <View style={styles.premiumSection}>
                <View style={[styles.trendingNowBg, isDark && styles.trendingNowBgDark]}>
                  <View style={[styles.ambientOrb1, { backgroundColor: isDark ? '#D97706' : '#FED7AA' }]} />
                  <View style={[styles.ambientOrb2, { backgroundColor: isDark ? '#EA580C' : '#FDE68A' }]} />
                  <View style={styles.bgGradientOverlay} />

                  <View style={[styles.sectionBlockHeader, { paddingHorizontal: spacing[4], paddingTop: spacing[4] }]}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <View style={{ backgroundColor: isDark ? 'rgba(234,88,12,0.22)' : '#FFEDD5', paddingHorizontal: 9, paddingVertical: 3.5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: isDark ? 'rgba(251,146,60,0.3)' : 'rgba(234,88,12,0.2)' }}>
                          <AppIcon name="fire" size={12} color={isDark ? '#FDBA74' : '#EA580C'} />
                          <Text style={{ color: isDark ? '#FED7AA' : '#C2410C', fontFamily: fontFamily.sansBold, fontSize: 9.5, letterSpacing: 1.2 }}>
                            HOT RIGHT NOW
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 24, letterSpacing: -0.5 }}>
                        Trending Now
                      </Text>
                      <Text style={{ color: isDark ? '#CBD5E1' : '#78716C', fontFamily: fontFamily.sans, fontSize: 11.5, marginTop: 2 }}>
                        Top-selling jewellery styles loved by customers this week
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => goShop()}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        backgroundColor: isDark ? '#D97706' : '#B5814A',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 22,
                        shadowColor: '#B5814A',
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.35,
                        shadowRadius: 6,
                        elevation: 4,
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.sansBold, fontSize: 11.5 }}>Explore</Text>
                      <AppIcon name="arrow-right" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={trending}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 6, gap: 12 }}
                    keyExtractor={item => 'tr-' + item.id}
                    renderItem={({ item }) => (
                      <View style={[styles.modernCard]}>
                        <ProductCard product={item} onPress={() => goProduct(item.id)} />
                      </View>
                    )}
                  />
                </View>
              </View>
            )}

            {/* ── Editorial Showcase Banners (Signature Collections) ── */}
            <EditorialBannersSection
              banners={EDITORIAL_BANNERS}
              goShop={goShop}
              colors={colors}
              fontFamily={fontFamily}
              spacing={spacing}
              radius={radius}
              isDark={isDark}
            />

            {/* Divider before interleaved feed */}
            <View style={{ height: 12 }} />
          </View>
        }
        keyExtractor={(item) => item.id}
        onEndReached={loadMoreFeatured}
        onEndReachedThreshold={0.5}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        renderItem={({ item }) => {
          if (item.type === 'product-row') {
            const row = item.data;
            return (
              <View style={{ backgroundColor: item.bg, paddingBottom: 14 }}>
                {item.headerTitle && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingTop: 18, paddingBottom: 12 }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                        <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF', paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <AppIcon name={item.headerIcon || 'star-four-points'} size={11} color={item.badgeColor || colors.primary} />
                          <Text style={{ color: item.badgeColor || colors.primary, fontFamily: fontFamily.sansBold, fontSize: 9.5, letterSpacing: 1.2 }}>
                            {item.headerBadge || 'CURATED'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 20, letterSpacing: -0.4 }}>
                        {item.headerTitle}
                      </Text>
                      {item.headerSubtitle && (
                        <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 2 }}>
                          {item.headerSubtitle}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => goShop()}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isDark ? 0.2 : 0.05,
                        shadowRadius: 4,
                        elevation: 2,
                      }}
                    >
                      <Text style={{ color: item.badgeColor || colors.primary, fontFamily: fontFamily.sansBold, fontSize: 11.5 }}>View All</Text>
                      <AppIcon name="arrow-right" size={12} color={item.badgeColor || colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={[styles.gridRow, { paddingHorizontal: spacing[4] }]}>
                  {row.map((product: any) => (
                    <View key={product.id} style={styles.gridCell}>
                      <ProductCard product={product} onPress={() => goProduct(product.id)} />
                    </View>
                  ))}
                  {row.length === 1 && <View style={styles.gridCell} />}
                </View>
              </View>
            );
          }

          if (item.type === 'horizontal-carousel') {
            return (
              <HorizontalProductRow
                title="Spotlight Deals"
                products={expressDrops.length > 0 ? expressDrops : featured}
                goProduct={goProduct}
                goShop={() => goShop()}
                colors={colors}
                fontFamily={fontFamily}
                spacing={spacing}
                radius={radius}
                isDark={isDark}
              />
            );
          }
          if (item.type === 'category-tiles') {
            return (
              <CategoryGridSection
                categories={categories}
                goShop={goShop}
                colors={colors}
                fontFamily={fontFamily}
                spacing={spacing}
                radius={radius}
                isDark={isDark}
              />
            );
          }
          if (item.type === 'category-carousel') {
            return (
              <CategoryCarouselBanners
                categories={categories}
                goShop={goShop}
                colors={colors}
                fontFamily={fontFamily}
                spacing={spacing}
                radius={radius}
                isDark={isDark}
              />
            );
          }
          if (item.type === 'banner') {
            return (
              <TouchableOpacity
                onPress={() => goShop()}
                activeOpacity={0.9}
                style={{
                  marginHorizontal: spacing[4],
                  marginVertical: 12,
                  padding: 16,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#1C182B' : '#F4F0FF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 4 }}>
                    <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 9, letterSpacing: 1.5 }}>TRENDING NOW</Text>
                  </View>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 17, letterSpacing: -0.3 }}>
                    Designer Jewellery Collection
                  </Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 2 }}>
                    Flat 20% OFF on bridal necklaces & earring sets
                  </Text>
                </View>
                <View style={{ backgroundColor: '#7C3AED', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="arrow-right" size={16} color="#FFF" />
                </View>
              </TouchableOpacity>
            );
          }
          if (item.type === 'promo-vibe') {
            return (
              <TouchableOpacity
                onPress={() => goShop()}
                activeOpacity={0.9}
                style={{
                  marginHorizontal: spacing[4],
                  marginVertical: 12,
                  padding: 16,
                  borderRadius: 20,
                  backgroundColor: isDark ? '#181E2B' : '#F0F5FF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={{ backgroundColor: '#2563EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 4 }}>
                    <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 9, letterSpacing: 1.5 }}>EVERYDAY WEAR</Text>
                  </View>
                  <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 17, letterSpacing: -0.3 }}>
                    Minimalist Everyday Jewels
                  </Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 2 }}>
                    Lightweight, anti-tarnish daily jewellery
                  </Text>
                </View>
                <View style={{ backgroundColor: '#2563EB', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                  <AppIcon name="arrow-right" size={16} color="#FFF" />
                </View>
              </TouchableOpacity>
            );
          }

          return null;
        }}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} size="small" />
            </View>
          ) : !hasMore && featured.length > 0 ? (
            <View style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: fontSize.sm }}>
                You've seen the entire collection
              </Text>
            </View>
          ) : null
        }
      ></Animated.FlatList>

      {/* ── Style Discovery Swipe FAB ── */}
      <View style={{ position: 'absolute', bottom: 78, right: 16, zIndex: 9999, elevation: 12 }}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setAdVisible(true)}
          style={{
            backgroundColor: colors.primary,
            width: 52,
            height: 52,
            borderRadius: 26,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 8,
            borderWidth: 1.5,
            borderColor: 'rgba(255,255,255,0.25)',
          }}
        >
          <AppIcon name="heart" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── Location Selector Modal ── */}
      <LocationSelectModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        onSelectLocation={label => setLocationLabel(label)}
        onAddNewAddress={() => {
          setLocationModalVisible(false);
          if (user?.id) {
            const rootNav = navigation.getParent() as any;
            rootNav?.navigate('Addresses');
          } else {
            navigation.navigate('Account');
          }
        }}
      />

      {/* ── Style Discovery Swipe Ad Modal ── */}
      <AdModal
        visible={adVisible}
        onClose={() => setAdVisible(false)}
        colors={colors}
        fontFamily={fontFamily}
        fontSize={fontSize}
        radius={radius}
        products={newArrivals.length > 0 ? newArrivals : featured.length > 0 ? featured : trending.length > 0 ? trending : expressDrops}
        goProduct={goProduct}
        isDark={isDark}
      />
    </View>
  );
}
function SectionHeader({
  title, onSeeAll, colors, fontFamily, fontSize, spacing,
}: {
  title: string; onSeeAll: () => void;
  colors: any; fontFamily: any; fontSize: any; spacing: any;
}) {
  return (
    <View style={[styles.sectionHeader, { paddingHorizontal: spacing[4], marginBottom: spacing[3] }]}>
      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>
        {title}
      </Text>
      <TouchableOpacity onPress={onSeeAll} style={[styles.seeAllBtn, { borderColor: colors.primary + '50', borderRadius: 20 }]}>
        <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: fontSize.xs }}>See all →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Top Luxury Navbar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarRingWrap: {
    position: 'relative',
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.8,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B5814A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  avatarVipBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  greetingSub: {
    fontSize: 11,
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  greetingTitle: {
    fontSize: 16,
    letterSpacing: 0.2,
    marginTop: 1,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: 190,
  },
  locationText: {
    fontSize: 10.5,
    flexShrink: 1,
  },

  // Luxury Theme Toggle
  themeCapsuleLuxury: {
    width: 60,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.2,
    justifyContent: 'center',
    paddingHorizontal: 2,
    position: 'relative',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  themeThumbLuxury: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  themeCapsuleIcons: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
    zIndex: 1,
  },
  themeIconSlot: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Luxury Search Bar
  searchRowLuxury: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchBarLuxury: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 22,
    borderWidth: 1.2,
    gap: 10,
    shadowColor: '#B5814A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInputLuxury: {
    flex: 1,
    height: 44,
    padding: 0,
    fontSize: 13.5,
  },
  searchFilterBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category Story Rings
  categoryRingOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    padding: 3,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRingInner: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    overflow: 'hidden',
  },
  categoryLabelText: {
    fontSize: 12,
    marginTop: 7,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Fallback / standard
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCapsule: {
    width: 52,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 1,
    position: 'relative',
  },
  themeThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingHorizontal: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 2,
  },
  searchInput: { flex: 1, height: 42, padding: 0 },

  // Banner
  bannerWrap: { overflow: 'hidden', position: 'relative' },
  bannerOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  bannerTitle: { color: '#fff', fontSize: 19, lineHeight: 25, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  bannerCta: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 7, marginTop: 10 },
  dotsRow: {
    position: 'absolute', bottom: 10, right: 14,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  dot: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },

  // Marquee
  marqueeShell: {
    overflow: 'hidden',
    backgroundColor: '#F5EEFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(124,58,237,0.22)',
    marginTop: 8,
  },
  marqueeShellDark: {
    backgroundColor: '#120B20',
    borderColor: 'rgba(167,139,250,0.25)',
  },
  marqueeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marqueeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  marqueeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(124,58,237,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marqueeIconWrapDark: {
    backgroundColor: 'rgba(236,72,153,0.20)',
  },
  marqueeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Categories Capsule Layout
  catCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    paddingLeft: 6,
    paddingRight: 12,
    gap: 8,
    borderWidth: 1,
  },
  catCapsuleImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },

  // Feature Banner
  featureBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20,
  },
  featureBannerBtn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 7 },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAllBtn: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },

  // Coloured section blocks
  sectionBlock: { paddingTop: 20 },
  sectionBlockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  sectionBlockSeeAll: { borderWidth: 1, borderColor: 'rgba(168,196,255,0.3)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  darkCardWrap: { width: 168, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  premiumSection: { marginVertical: 8, overflow: 'hidden' },
  premiumSectionGradient: { paddingTop: 24, paddingBottom: 20, position: 'relative' },
  gradientOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
  decorCircle: { position: 'absolute', borderRadius: 999, backgroundColor: '#fff' },
  premiumSeeAll: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 24 },
  premiumCardWrap: { width: 168, borderWidth: 1.5, borderRadius: 18, overflow: 'hidden', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },

  // Modern New Arrivals & Trending sections
  newArrivalsBg: {
    paddingTop: 24,
    paddingBottom: 20,
    position: 'relative',
    backgroundColor: '#F7F2FF', // Radiant Royal Lavender
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: 'rgba(124,58,237,0.25)',
    overflow: 'hidden',
  },
  newArrivalsBgDark: {
    backgroundColor: '#120A24', // Onyx Royal Amethyst
    borderColor: 'rgba(167,139,250,0.35)',
  },
  trendingNowBg: {
    paddingTop: 24,
    paddingBottom: 20,
    position: 'relative',
    backgroundColor: '#FFF7ED', // Warm 24K Champagne Sunset
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: 'rgba(217,119,6,0.25)',
    overflow: 'hidden',
  },
  trendingNowBgDark: {
    backgroundColor: '#1A1107', // Burnished 24K Gold Obsidian
    borderColor: 'rgba(245,158,11,0.35)',
  },
  flashSaleBg: {
    paddingTop: 24,
    paddingBottom: 20,
    position: 'relative',
    backgroundColor: '#FFF0F6', // Rose Gold & Ruby Sparkle
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: 'rgba(236,72,153,0.25)',
    overflow: 'hidden',
  },
  flashSaleBgDark: {
    backgroundColor: '#200816', // Deep Crimson Velvet Obsidian
    borderColor: 'rgba(244,63,94,0.35)',
  },
  emeraldLoungeBg: {
    paddingTop: 24,
    paddingBottom: 20,
    position: 'relative',
    backgroundColor: '#ECFDF5', // Imperial Jade & Mint
    borderTopWidth: 1.2,
    borderBottomWidth: 1.2,
    borderColor: 'rgba(5,150,105,0.25)',
    overflow: 'hidden',
  },
  emeraldLoungeBgDark: {
    backgroundColor: '#061A10', // Imperial Emerald Obsidian
    borderColor: 'rgba(52,211,153,0.35)',
  },
  ambientOrb1: {
    position: 'absolute',
    top: -40,
    left: -25,
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.16,
  },
  ambientOrb2: {
    position: 'absolute',
    bottom: -45,
    right: -25,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.14,
  },
  bgGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  bgBlob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  modernExploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 24,
  },
  modernCard: {
    width: Math.floor((W - 32 - 12) / 2),
    backgroundColor: 'transparent',
  },

  // Vibe chips
  vibeChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 30, borderWidth: 1 },

  // Editorial Banners (Asymmetric Landscape Collage)
  editorialSection: {
    marginVertical: 12,
  },
  editorialCard: {
    width: W * 0.84,
    height: 168,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  editorialLeft: {
    flex: 1.1,
    padding: 16,
    justifyContent: 'center',
  },
  editorialRight: {
    flex: 0.9,
    height: '100%',
  },
  editorialImg: {
    width: '100%',
    height: '100%',
  },
  editorialPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  editorialCta: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },

  // Flash deal strip
  flashStrip: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', backgroundColor: '#C0392B', paddingHorizontal: 20, paddingVertical: 18 },
  flashLeft: { flex: 1 },
  flashRight: { alignItems: 'center' },

  // Lookbook
  lookbookCard: { flex: 1, borderWidth: 1, overflow: 'hidden' },
  lookbookImg: { width: '100%', height: 180 },

  // Video row - dynamic themed background
  videoRowWrap: {
    marginTop: 24,
    paddingBottom: 22,
  },
  videoRowHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoRowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  videoRowAccent: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: '#D4A574',
  },
  videoRowTitle: {
    color: '#F3F3F7',
    fontSize: 18,
  },
  videoRowSub: {
    color: '#8A8A9E',
    fontSize: 11,
    marginTop: 2,
  },
  videoLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,107,107,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  videoLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B6B',
  },
  videoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'transparent',
  },
  videoTopBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  videoCardLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  videoCardLabelText: {
    color: '#fff',
    fontSize: 14,
  },
  videoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  videoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(212,165,116,0.2)',
  },
  videoDotActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A574',
  },

  // Ad Modal
  adBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.75)' },
  adSheet: { position: 'absolute', left: 0, right: 0, paddingTop: 12 },
  adHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 16 },
  adBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  adProductCard: { position: 'relative' },
  adProductInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(11,11,14,0.65)',
  },
  swipeTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  swipeKnob: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Grid
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridCell: { flex: 1 },
});
