import React, { useCallback, useEffect, useRef, useState, startTransition } from 'react';
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
    tag: 'NEW SEASON',
    badge: 'EARRINGS',
    headline: 'Statement\nEarrings',
    sub: 'Bold hoops & chandelier drops for every occasion',
    cta: 'Shop Earrings',
    gradientTop: '#F3EEFF',
    gradientBot: '#EDE4FF',
    accent: '#7C3AED',
    pill: '#7C3AED',
    image: require('../../../assets/images/Earrings.jpeg'),
  },
  {
    id: 'eb2',
    tag: 'BESTSELLER',
    badge: 'RINGS',
    headline: 'Solitaire &\nStack Rings',
    sub: 'From everyday dainty to bridal statement',
    cta: 'Explore Rings',
    gradientTop: '#E8F8F2',
    gradientBot: '#D4F0E6',
    accent: '#059669',
    pill: '#059669',
    image: require('../../../assets/images/Ring.jpeg'),
  },
  {
    id: 'eb3',
    tag: 'TRENDING',
    badge: 'BRACELETS',
    headline: 'Layer &\nStack Bracelets',
    sub: 'Mix gold, silver & rose gold effortlessly',
    cta: 'Shop Bracelets',
    gradientTop: '#FFF8EC',
    gradientBot: '#FDEFD4',
    accent: '#B5814A',
    pill: '#D97706',
    image: require('../../../assets/images/Bracelet.jpeg'),
  },
] as const;

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
    subtitle: 'trusted quality & shine',
  },
  {
    icon: 'refresh',
    title: '7-Day Returns',
    subtitle: 'easy exchange',
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
              <AppIcon name={item.icon as any} color={isDark ? '#D4A574' : '#B5814A'} size={15} />
            </View>
            <Text style={{ color: isDark ? '#E8E8F0' : '#3D2B1A', fontFamily: fontFamily.sansBold, fontSize: 12.5, letterSpacing: 0.1 }}>
              {item.title}
            </Text>
            <Text style={{ color: isDark ? '#606070' : '#A89880', fontFamily: fontFamily.sans, fontSize: 10 }}>
              · {item.subtitle}
            </Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}



// Helper component for swiping choice
// ── Ad Modal (Tinder Style) ──
function AdModal({ visible, onClose, colors, fontFamily, fontSize, radius, products, goProduct, isDark }: {
  visible: boolean; onClose: () => void;
  colors: any; fontFamily: any; fontSize: any; radius: any;
  products: any[]; goProduct: (id: number) => void;
  isDark: boolean;
}) {
  const { toggle } = useWishlist();
  const slideY = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deckProducts, setDeckProducts] = useState<any[]>([]);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);
  const seenIdsRef = useRef(new Set<string>());

  const extractProducts = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.products)) return res.products;
    if (Array.isArray(res?.data?.products)) return res.data.products;
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
      pageRef.current = 1;
      hasMoreRef.current = true;
      isFetchingRef.current = false;
      seenIdsRef.current.clear();

      Animated.parallel([
        Animated.timing(slideY, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

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
        setDeckProducts(initialUniques);
      }
      fetchMoreDeckProducts(1);
    } else {
      Animated.parallel([
        Animated.timing(slideY, { toValue: Dimensions.get('window').height, duration: 350, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Image pre-fetching for instant, zero-delay card reveals
  useEffect(() => {
    if (deckProducts.length > currentIndex) {
      const upcoming = deckProducts.slice(currentIndex, currentIndex + 6);
      upcoming.forEach(item => {
        const uri = item.images?.[0]?.imageUrl || item.imageUrl;
        if (uri && typeof uri === 'string') {
          Image.prefetch(uri).catch(() => {});
        }
      });
    }
  }, [currentIndex, deckProducts]);

  const checkPagination = useCallback((nextIdx: number) => {
    if (nextIdx >= deckProducts.length - 5) {
      fetchMoreDeckProducts();
    }
  }, [deckProducts.length]);

  const pan = useRef(new Animated.ValueXY()).current;
  const W_MODAL = Dimensions.get('window').width;

  const deckStateRef = useRef({ currentIndex, deckProducts, toggle, checkPagination });
  useEffect(() => {
    deckStateRef.current = { currentIndex, deckProducts, toggle, checkPagination };
  }, [currentIndex, deckProducts, toggle, checkPagination]);

  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    const { currentIndex: cIdx, deckProducts: dProds, toggle: tog, checkPagination: checkPag } = deckStateRef.current;
    const currentProduct = dProds[cIdx];
    if (direction === 'right' && currentProduct?.id) {
      const pid = currentProduct.id;
      tog(pid).catch(() => {});
    }

    const nextIdx = cIdx + 1;
    pan.setValue({ x: 0, y: 0 });
    setCurrentIndex(nextIdx);
    checkPag(nextIdx);
  }, [pan]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
      },
      onPanResponderMove: Animated.event([
        null,
        { dx: pan.x, dy: pan.y }
      ], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        const isRightSwipe = gestureState.dx > 70 || gestureState.vx > 0.45;
        const isLeftSwipe = gestureState.dx < -70 || gestureState.vx < -0.45;

        if (isRightSwipe) {
          Animated.timing(pan, {
            toValue: { x: W_MODAL + 180, y: gestureState.dy },
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }).start(() => {
            handleSwipeComplete('right');
          });
        } else if (isLeftSwipe) {
          Animated.timing(pan, {
            toValue: { x: -W_MODAL - 180, y: gestureState.dy },
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }).start(() => {
            handleSwipeComplete('left');
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 7,
            tension: 110,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  const triggerSwipe = (direction: 'left' | 'right') => {
    const toX = direction === 'right' ? W_MODAL + 180 : -W_MODAL - 180;
    Animated.timing(pan, {
      toValue: { x: toX, y: 0 },
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      handleSwipeComplete(direction);
    });
  };

  const renderCards = () => {
    const visibleDeck = deckProducts.slice(currentIndex, currentIndex + 3);

    return visibleDeck.map((item, offsetIdx) => {
      const isTop = offsetIdx === 0;
      const isSecond = offsetIdx === 1;
      const uri = item.images?.[0]?.imageUrl || item.imageUrl || null;

      let cardStyle: any = {
        position: 'absolute',
        width: W_MODAL * 0.85,
        height: 430,
        backgroundColor: isDark ? '#14121C' : '#FFFFFF',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        borderRadius: 26,
        overflow: 'hidden',
        alignSelf: 'center',
        top: 10,
        elevation: isTop ? 12 : 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: isTop ? 8 : 2 },
        shadowOpacity: isTop ? 0.20 : 0.06,
        shadowRadius: isTop ? 14 : 4,
      };

      if (isTop) {
        cardStyle.transform = [
          { translateX: pan.x },
          { translateY: pan.y },
          {
            rotate: pan.x.interpolate({
              inputRange: [-W_MODAL / 2, 0, W_MODAL / 2],
              outputRange: ['-12deg', '0deg', '12deg'],
              extrapolate: 'clamp',
            }),
          },
        ];
      } else if (isSecond) {
        const scaleSecondCard = pan.x.interpolate({
          inputRange: [-W_MODAL, 0, W_MODAL],
          outputRange: [1, 0.94, 1],
          extrapolate: 'clamp',
        });
        const translateYSecondCard = pan.x.interpolate({
          inputRange: [-W_MODAL, 0, W_MODAL],
          outputRange: [0, 14, 0],
          extrapolate: 'clamp',
        });
        cardStyle.transform = [
          { scale: scaleSecondCard },
          { translateY: translateYSecondCard },
        ];
        cardStyle.opacity = 0.95;
      } else {
        cardStyle.transform = [
          { scale: 0.88 },
          { translateY: 28 },
        ];
        cardStyle.opacity = 0.7;
      }

      const likeOpacity = isTop ? pan.x.interpolate({
        inputRange: [0, W_MODAL / 4],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      }) : 0;

      const nopeOpacity = isTop ? pan.x.interpolate({
        inputRange: [-W_MODAL / 4, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      }) : 0;

      return (
        <Animated.View
          key={item.id}
          style={cardStyle}
          {...(isTop ? panResponder.panHandlers : {})}
        >
          {uri ? (
            <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <AppIcon name="diamond-stone" size={48} color={colors.primary} />
            </View>
          )}

          {/* Stamps */}
          {isTop && (
            <>
              <Animated.View style={{ position: 'absolute', top: 30, left: 24, transform: [{ rotate: '-18deg' }], opacity: likeOpacity, borderColor: '#4CAF50', borderWidth: 4, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                <Text style={{ color: '#4CAF50', fontFamily: fontFamily.sansBold, fontSize: 28, letterSpacing: 2 }}>LIKE</Text>
              </Animated.View>
              <Animated.View style={{ position: 'absolute', top: 30, right: 24, transform: [{ rotate: '18deg' }], opacity: nopeOpacity, borderColor: '#FF5C6C', borderWidth: 4, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                <Text style={{ color: '#FF5C6C', fontFamily: fontFamily.sansBold, fontSize: 28, letterSpacing: 2 }}>NOPE</Text>
              </Animated.View>
            </>
          )}
        </Animated.View>
      );
    }).reverse();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)' }]} />
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, backgroundColor: colors.background, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, height: '88%', top: '12%', paddingTop: 12, transform: [{ translateY: slideY }], opacity: backdropOpacity }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginTop: 16 }}>
          <View style={{ backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
            <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 9, letterSpacing: 2 }}>STYLE MATCH</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <AppIcon name="close" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Heading */}
        <View style={{ paddingHorizontal: 24, marginTop: 12 }}>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 24, letterSpacing: -0.5 }}>
            Curate Your Collection
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 13, marginTop: 4, lineHeight: 18 }}>
            Swipe right on pieces you love to personalize your feed and save to your style profile!
          </Text>
        </View>

        <View style={{ flex: 1, marginTop: 20 }}>
          {currentIndex < deckProducts.length ? renderCards() : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={{ textAlign: 'center', color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 13, marginTop: 12 }}>Loading more styles...</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40, marginBottom: 40 }}>
          <TouchableOpacity onPress={() => triggerSwipe('left')} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF', elevation: 4, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <AppIcon name="close" size={30} color="#FF5C6C" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => triggerSwipe('right')} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF', elevation: 4, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 }}>
            <AppIcon name="heart" size={30} color="#4CAF50" />
          </TouchableOpacity>
        </View>

      </Animated.View>
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
        <View style={styles.bgGradientOverlay} />
        {/* Flash Sale Header with Timer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[2] }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ backgroundColor: '#E11D48', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 1 }}>FLASH SALE</Text>
              </View>
            </View>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 22, letterSpacing: -0.5 }}>
              24-Hour Exclusive Deals
            </Text>
          </View>

          {/* Countdown Clock */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? 'rgba(225,29,72,0.15)' : '#FFF0F3', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(225,29,72,0.2)' }}>
            <View style={{ backgroundColor: '#E11D48', width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 12 }}>{pad(timeLeft.hours)}</Text>
            </View>
            <Text style={{ color: '#E11D48', fontFamily: fontFamily.sansBold, fontSize: 12 }}>:</Text>
            <View style={{ backgroundColor: '#E11D48', width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 12 }}>{pad(timeLeft.minutes)}</Text>
            </View>
            <Text style={{ color: '#E11D48', fontFamily: fontFamily.sansBold, fontSize: 12 }}>:</Text>
            <View style={{ backgroundColor: '#E11D48', width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 12 }}>{pad(timeLeft.seconds)}</Text>
            </View>
          </View>
        </View>

        {/* Product List */}
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 14, paddingTop: 6, gap: 14 }}
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
        <View style={styles.bgGradientOverlay} />
        {/* Header */}
        <View style={[styles.sectionBlockHeader, { paddingHorizontal: spacing[4], paddingTop: spacing[4] }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ backgroundColor: isDark ? '#059669' : '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {/* <AppIcon name="sparkles" size={13} color={isDark ? '#FFF' : '#047857'} /> */}
                <Text style={{ color: isDark ? '#FFF' : '#047857', fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 1.5 }}>HANDPICKED STYLES</Text>
              </View>
            </View>
            <Text style={{ color: isDark ? '#FFFFFF' : '#064E3B', fontFamily: fontFamily.sansBold, fontSize: 22, letterSpacing: -0.5 }}>
              Fashion Jewelry Spotlight
            </Text>
          </View>

          <TouchableOpacity onPress={goShop} style={[styles.modernExploreBtn, { borderColor: isDark ? '#34D399' : '#059669', backgroundColor: 'transparent' }]}>
            <Text style={{ color: isDark ? '#34D399' : '#059669', fontFamily: fontFamily.sansBold, fontSize: 11 }}>View All</Text>
            <AppIcon name="arrow-right" size={13} color={isDark ? '#34D399' : '#059669'} />
          </TouchableOpacity>
        </View>

        {/* Product Carousel */}
        <FlatList
          data={products}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 14, paddingTop: 6, gap: 14 }}
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
    <View style={{ marginVertical: 14, backgroundColor: isDark ? '#14111D' : '#F7F5FC', paddingVertical: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], marginBottom: 10 }}>
        <View>
          <Text style={{ color: '#7C3AED', fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
            CURATED SPOTLIGHT
          </Text>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 20, letterSpacing: -0.4 }}>
            {title}
          </Text>
        </View>
        <TouchableOpacity onPress={goShop}>
          <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: 12 }}>View All →</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing[4], gap: 14 }}
        keyExtractor={item => 'hrow-' + item.id}
        renderItem={({ item }) => (
          <View style={{ width: W * 0.44 }}>
            <ProductCard product={item} onPress={() => goProduct(item.id)} />
          </View>
        )}
      />
    </View>
  );
}

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
    <View style={{ marginVertical: 16, marginHorizontal: spacing[4] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View>
          <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
            SHOP BY CATEGORY
          </Text>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 20, letterSpacing: -0.4 }}>
            Explore Collections
          </Text>
        </View>
        <TouchableOpacity onPress={() => goShop()}>
          <Text style={{ color: colors.primary, fontFamily: fontFamily.sansMedium, fontSize: 12 }}>All Categories →</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {displayCats.map((cat, idx) => {
          const img = getCategorySource(cat, idx);
          return (
            <TouchableOpacity
              key={cat.id || idx}
              onPress={() => goShop({ categoryId: cat.id, categoryName: cat.name })}
              activeOpacity={0.88}
              style={{
                width: (W - spacing[4] * 2 - 12) / 2,
                height: 110,
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Image source={img} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.38)' }} />
              <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12 }}>
                <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 15 }}>{cat.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: fontFamily.sans, fontSize: 10, marginTop: 2 }}>Explore Collection →</Text>
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
    <View style={{ marginVertical: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], marginBottom: 12 }}>
        <View>
          <Text style={{ color: '#E11D48', fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 }}>
            FEATURED STYLES
          </Text>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 20, letterSpacing: -0.4 }}>
            Curated Category Collections
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
          const img = getCategorySource(item, index);
          return (
            <TouchableOpacity
              onPress={() => goShop({ categoryId: item.id, categoryName: item.name })}
              activeOpacity={0.88}
              style={{
                width: W * 0.62,
                height: 130,
                borderRadius: 22,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <Image source={img} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <View style={{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.42)' }} />
              <View style={{ position: 'absolute', bottom: 14, left: 14, right: 14 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 6 }}>
                  <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 9, letterSpacing: 1.5 }}>HOT TREND</Text>
                </View>
                <Text style={{ color: '#FFF', fontFamily: fontFamily.sansBold, fontSize: 17 }}>{item.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontFamily: fontFamily.sansMedium, fontSize: 11, marginTop: 2 }}>Shop Collection →</Text>
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
  const thumbPos = useRef(new Animated.Value(isDark ? 24 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(thumbPos, {
      toValue: isDark ? 24 : 0,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [isDark, thumbPos]);

  const handleThemeToggle = useCallback(() => {
    const nextIsDark = !isDark;

    Animated.parallel([
      Animated.spring(thumbPos, {
        toValue: nextIsDark ? 24 : 0,
        friction: 7,
        tension: 90,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(pressScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
        Animated.timing(pressScale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]),
    ]).start();

    requestAnimationFrame(() => {
      startTransition(() => {
        setMode(nextIsDark ? 'dark' : 'light');
      });
    });
  }, [isDark, setMode, thumbPos, pressScale]);

  const loadUserLocation = useCallback(() => {
    AsyncStorage.getItem(LOCATION_STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.label) {
            setLocationLabel(parsed.label);
            return;
          }
        } catch {}
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
    outputRange: [colors.background, isDark ? '#1C1525' : '#F5F0FF', isDark ? '#1B241C' : '#EAF4EC'],
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

  // Show ad modal immediately on first load
  useEffect(() => {
    if (!loading) {
      setAdVisible(true);
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
    { title: 'TRENDING FASHION STYLES', bgLight: '#F5F5F8', bgDark: '#121218', badgeColor: '#4F46E5' },
    { title: 'POPULAR PICKS', bgLight: '#FAF5F7', bgDark: '#181215', badgeColor: '#E11D48' },
    { title: 'FEATURED SELECTION', bgLight: '#F4F7F5', bgDark: '#101814', badgeColor: '#059669' },
    { title: 'STYLE SPOTLIGHT', bgLight: '#F8F5FA', bgDark: '#161218', badgeColor: '#7C3AED' },
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
      <Animated.View style={{ backgroundColor: bgInterpolate, paddingTop: (Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 24) + 10, paddingBottom: spacing[2], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.05)', zIndex: 10 }}>
        {/* ── Top Navbar ── */}
        <View style={[styles.topBar, { backgroundColor: 'transparent', borderBottomColor: 'transparent' }]}>
          <View style={styles.topBarLeft}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Account')}
              activeOpacity={0.8}
              style={[styles.avatarCircle, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
            >
              <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 15 }}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
            <View style={{ justifyContent: 'center', flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 15, letterSpacing: 0.2 }} numberOfLines={1}>
                Hey, {firstName}
              </Text>
              <TouchableOpacity
                onPress={() => setLocationModalVisible(true)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1, maxWidth: 190 }}
              >
                <AppIcon name="map-marker-outline" size={11} color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, flexShrink: 1 }} numberOfLines={1}>
                  {locationLabel}
                </Text>
                <AppIcon name="chevron-down" size={10} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.topBarRight}>
            <Animated.View style={{ transform: [{ scale: pressScale }] }}>
              <TouchableOpacity
                onPress={handleThemeToggle}
                activeOpacity={0.9}
                style={[
                  styles.themeCapsule,
                  {
                    backgroundColor: isDark ? 'rgba(28, 22, 42, 0.9)' : 'rgba(240, 238, 246, 0.9)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.themeThumb,
                    {
                      backgroundColor: isDark ? '#2E274C' : '#FFFFFF',
                      transform: [{ translateX: thumbPos }],
                      shadowColor: isDark ? '#A5B4FC' : '#F59E0B',
                      shadowOpacity: isDark ? 0.35 : 0.25,
                      shadowRadius: 5,
                      shadowOffset: { width: 0, height: 1.5 },
                      elevation: 3,
                    },
                  ]}
                >
                  <AppIcon
                    name={isDark ? 'weather-night' : 'weather-sunny'}
                    size={13}
                    color={isDark ? '#C7D2FE' : '#F59E0B'}
                  />
                </Animated.View>
                <View style={styles.themeCapsuleIcons}>
                  <View style={styles.themeIconSlot}>
                    <AppIcon name="weather-sunny" size={11} color={isDark ? 'rgba(255,255,255,0.35)' : 'transparent'} />
                  </View>
                  <View style={styles.themeIconSlot}>
                    <AppIcon name="weather-night" size={11} color={isDark ? 'transparent' : 'rgba(0,0,0,0.35)'} />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* ── Search Bar ── */}
        <View style={[styles.searchRow, { backgroundColor: 'transparent', borderBottomColor: 'transparent' }]}>
          <TouchableOpacity
            onPress={handleSearchSubmit}
            activeOpacity={0.85}
            style={[styles.searchBar, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', borderColor: 'rgba(0,0,0,0.05)', borderRadius: radius.full, borderWidth: 1 }]}
          >
            <AppIcon name="magnify" size={17} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              placeholder="Search rings, earrings, chains..."
              placeholderTextColor={colors.placeholder}
              returnKeyType="search"
              blurOnSubmit
              style={[styles.searchInput, { color: colors.textPrimary, fontFamily: fontFamily.sans, fontSize: 14 }]}
            />
            {search.length > 0 ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <AppIcon name="close-circle" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ) : (
              <View style={[styles.searchDivider, { backgroundColor: colors.border }]} />
            )}
            <AppIcon name="tune-variant" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Top Categories Carousel ── */}
        {categories.length > 0 && (
          <View style={{ marginTop: 12, marginBottom: 8 }}>
            <Animated.FlatList
              data={categories}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}
              keyExtractor={item => 'topcat-' + item.id}
              renderItem={({ item, index }) => {
                const catImg = getCategorySource(item, index);
                return (
                  <TouchableOpacity
                    onPress={() => goShop({ categoryId: item.id, categoryName: item.name })}
                    activeOpacity={0.85}
                    style={{ alignItems: 'center', width: 68 }}
                  >
                    <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden', padding: 2, borderWidth: 1, borderColor: 'rgba(0,0,0,0.04)' }}>
                      <Image source={catImg} style={{ width: '100%', height: '100%', borderRadius: 28 }} resizeMode="cover" />
                    </View>
                    <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansMedium, fontSize: 11, marginTop: 6, textAlign: 'center' }} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </Animated.View>

      <AdModal
        visible={adVisible}
        onClose={() => setAdVisible(false)}
        colors={colors}
        fontFamily={fontFamily}
        fontSize={fontSize}
        radius={radius}
        products={featured}
        goProduct={goProduct}
        isDark={isDark}
      />
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
                          { backgroundColor: i === bannerIdx ? colors.primary : 'rgba(255,255,255,0.5)', width: i === bannerIdx ? 18 : 6 },
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
                  <View style={styles.bgGradientOverlay} />

                  <View style={[styles.sectionBlockHeader, { paddingHorizontal: spacing[4], paddingTop: spacing[4] }]}>
                    <View>
                      <Text style={{ color: isDark ? '#818CF8' : '#4F46E5', fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>
                        Just Dropped
                      </Text>
                      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 25, letterSpacing: -0.5 }}>
                        New Arrivals
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => goShop()} style={[styles.modernExploreBtn, { borderColor: isDark ? '#818CF8' : '#4F46E5', backgroundColor: 'transparent' }]}>
                      <Text style={{ color: isDark ? '#818CF8' : '#4F46E5', fontFamily: fontFamily.sansBold, fontSize: 11 }}>Explore</Text>
                      <AppIcon name="arrow-right" size={13} color={isDark ? '#818CF8' : '#4F46E5'} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={newArrivals}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 4, gap: 14 }}
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
                  <View style={styles.bgGradientOverlay} />

                  <View style={[styles.sectionBlockHeader, { paddingHorizontal: spacing[4], paddingTop: spacing[4] }]}>
                    <View>
                      <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 4 }}>
                        Hot Right Now
                      </Text>
                      <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 25, letterSpacing: -0.5 }}>
                        Trending Now
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => goShop()} style={[styles.modernExploreBtn, { borderColor: colors.primary, backgroundColor: 'transparent' }]}>
                      <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 11 }}>Explore</Text>
                      <AppIcon name="arrow-right" size={13} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={trending}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 4, gap: 14 }}
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
              <View style={{ backgroundColor: item.bg, paddingBottom: 10 }}>
                {item.headerTitle && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingTop: 16, paddingBottom: 6 }}>
                    <Text style={{ color: item.badgeColor || colors.primary, fontFamily: fontFamily.sansBold, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                      {item.headerTitle}
                    </Text>
                    <TouchableOpacity onPress={() => goShop()}>
                      <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sansMedium, fontSize: 11 }}>View All →</Text>
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
                    Chic Fashion Accessories
                  </Text>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 2 }}>
                    Flat 20% OFF on statement pieces & combo sets
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
                    Lightweight, tarnish-resistant daily staples
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

      {/* ── Tinder Swipe FAB ── */}
      <View style={{ position: 'absolute', bottom: 75, right: 16, zIndex: 9999, elevation: 12 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setAdVisible(true)}
          style={{
            backgroundColor: colors.primary,
            width: 48,
            height: 48,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
          }}
        >
          <AppIcon name="heart-outline" size={20} color="#FFF" />
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

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
  themeCapsuleIcons: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
    zIndex: 1,
  },
  themeIconSlot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
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

  marqueeShell: {
    overflow: 'hidden',
    backgroundColor: '#FDF8F2',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(181,129,74,0.18)',
    marginTop: 10,
  },
  marqueeShellDark: {
    backgroundColor: '#131318',
    borderColor: 'rgba(212,165,116,0.12)',
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
    paddingVertical: 11,
  },
  marqueeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(181,129,74,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marqueeIconWrapDark: {
    backgroundColor: 'rgba(212,165,116,0.10)',
  },
  marqueeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    backgroundColor: '#F3F2FF', // Luxurious Lavender-Periwinkle tint
  },
  newArrivalsBgDark: {
    backgroundColor: '#0E0D1E', // Dark twilight
  },
  trendingNowBg: {
    paddingTop: 24,
    paddingBottom: 20,
    position: 'relative',
    backgroundColor: '#FFF4EE', // Rich Terracotta-rose tint
  },
  trendingNowBgDark: {
    backgroundColor: '#18110D', // Dark amber/bronze
  },
  flashSaleBg: {
    paddingTop: 24,
    paddingBottom: 20,
    position: 'relative',
    backgroundColor: '#FFF7F5', // Warm Sunset Rose
  },
  flashSaleBgDark: {
    backgroundColor: '#1C0B0E',
  },
  emeraldLoungeBg: {
    paddingTop: 24,
    paddingBottom: 20,
    position: 'relative',
    backgroundColor: '#EFF8F3', // Soft Mint Lounge
  },
  emeraldLoungeBgDark: {
    backgroundColor: '#051E14',
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
    width: 146,
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
