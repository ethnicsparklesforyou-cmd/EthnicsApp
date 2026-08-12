import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PageHeader, Screen } from '../../components/common';
import { AppIcon } from '../../components/common';
import { ProductCard } from '../../components/ProductCard';
import { useTheme } from '../../context/ThemeContext';
import { fetchCategories, fetchProducts } from '../../services/products';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { MainStackParamList, TabParamList } from '../../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'HomeTabs'>;
  route: RouteProp<TabParamList, 'Shop'>;
};

const CATEGORY_IMAGES = {
  ring: require('../../../assets/images/Ring.jpeg'),
  chain: require('../../../assets/images/Chain.jpeg'),
  earrings: require('../../../assets/images/Earrings.jpeg'),
  bracelet: require('../../../assets/images/Bracelet.jpeg'),
} as const;

const SORT_OPTIONS = [
  { label: 'Newest', sortBy: 'createAt', sortOrder: 'DESC' },
  { label: 'Price: Low', sortBy: 'basePrice', sortOrder: 'ASC' },
  { label: 'Price: High', sortBy: 'basePrice', sortOrder: 'DESC' },
];

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

/* ── Memoized Sub-components for 60fps performance ── */

const CategoryItem = React.memo(({ item, index, isSelected, onSelect, colors, fontFamily }: any) => {
  const isAll = item.id === 'all';
  const catImg = !isAll ? getCategorySource(item, index - 1) : null;

  return (
    <TouchableOpacity
      onPress={() => onSelect(isAll ? null : item.id)}
      activeOpacity={0.85}
      style={{ alignItems: 'center', width: 68 }}
    >
      <View style={{
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: isSelected ? colors.primary + '15' : colors.surfaceElevated,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isAll ? 0 : 2,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? colors.primary : colors.border,
      }}>
        {isAll ? (
          <AppIcon name="grid-large" size={24} color={isSelected ? colors.primary : colors.textMuted} />
        ) : (
          <Image source={catImg!} style={{ width: '100%', height: '100%', borderRadius: 28 }} resizeMode="cover" />
        )}
      </View>
      <Text
        style={{
          color: isSelected ? colors.primary : colors.textPrimary,
          fontFamily: isSelected ? fontFamily.sansBold : fontFamily.sansMedium,
          fontSize: 11,
          marginTop: 6,
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );
});

const ProductListItem = React.memo(({ item, onPress }: { item: any; onPress: (id: number) => void }) => {
  const handlePress = useCallback(() => onPress(item.id), [onPress, item.id]);
  return (
    <View style={{ flex: 1, maxWidth: '50%' }}>
      <ProductCard product={item} onPress={handlePress} />
    </View>
  );
});

const ShopSkeleton = React.memo(({ colors, spacing, radius }: any) => {
  const dummyArray = [1, 2, 3, 4, 5, 6];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing[5], gap: 12, paddingTop: 4 }}>
      {dummyArray.map(key => (
        <View
          key={key}
          style={{
            flex: 1,
            minWidth: '45%',
            maxWidth: '50%',
            height: 220,
            borderRadius: radius.xl,
            backgroundColor: colors.surfaceElevated,
            borderWidth: 1,
            borderColor: colors.border + '40',
            padding: 8,
            marginBottom: 12,
            opacity: 0.6,
          }}
        >
          <View style={{ width: '100%', height: 130, backgroundColor: colors.surface, borderRadius: radius.lg }} />
          <View style={{ width: '70%', height: 12, backgroundColor: colors.surface, borderRadius: 6, marginTop: 12 }} />
          <View style={{ width: '40%', height: 14, backgroundColor: colors.surface, borderRadius: 6, marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
});

export function ShopScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const params = route?.params as any;

  const [search, setSearch] = useState(params?.search || '');
  const [selectedCatId, setSelectedCatId] = useState<number | string | null>(params?.categoryId || null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sortIdx, setSortIdx] = useState(0);
  const [showSort, setShowSort] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingMoreRef = useRef(false);
  const routeSearch = params?.search?.trim() || '';

  const cancelSearchDebounce = useCallback(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
      searchTimeout.current = null;
    }
  }, []);

  const buildFilters = useCallback(
    (pg: number, q: string, si: number, catId: number | string | null) => {
      const numCatId = catId && catId !== 'all' ? Number(catId) : null;
      return {
        page: pg,
        limit: 20,
        ...(q.trim() ? { search: q.trim() } : {}),
        ...(numCatId && !isNaN(numCatId) ? { categoryId: [numCatId] } : {}),
        ...(params?.subcategoryId ? { subcategoryId: [params.subcategoryId] } : {}),
        sortBy: SORT_OPTIONS[si].sortBy,
        sortOrder: SORT_OPTIONS[si].sortOrder,
      };
    },
    [params?.subcategoryId],
  );

  const load = useCallback(
    async (pg: number, q: string, si: number, catId: number | string | null, append = false) => {
      if (pg === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await fetchProducts(buildFilters(pg, q, si, catId));
        const prods = res?.data?.products || [];
        const pagination = res?.data?.pagination || {};
        const inStockProds = prods.filter((p: any) => p.stockQuantity === undefined || p.stockQuantity === null || Number(p.stockQuantity) > 0);
        setProducts(prev => (append ? [...prev, ...inStockProds] : inStockProds));
        setHasMore(pagination.hasNextPage ?? false);
        setTotalCount(prev => (append ? prev + inStockProds.length : inStockProds.length));
        setPage(pg);
      } finally {
        setLoading(false);
        setIsInitialLoad(false);
        setLoadingMore(false);
        isLoadingMoreRef.current = false;
      }
    },
    [buildFilters],
  );

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories().then(res => {
      const cats = unwrapArray(res);
      if (cats.length > 0) setCategories(cats);
    }).catch(() => {});
  }, []);

  // Sync route params when navigation occurs
  useEffect(() => {
    cancelSearchDebounce();
    setSearch(routeSearch);
    const initialCat = params?.categoryId || null;
    setSelectedCatId(initialCat);
    load(1, routeSearch, sortIdx, initialCat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSearch, params?.categoryId, params?.subcategoryId]);

  useEffect(() => {
    return () => {
      cancelSearchDebounce();
    };
  }, [cancelSearchDebounce]);

  const searchRef = useRef(search);
  const selectedCatIdRef = useRef(selectedCatId);
  const sortIdxRef = useRef(sortIdx);

  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { selectedCatIdRef.current = selectedCatId; }, [selectedCatId]);
  useEffect(() => { sortIdxRef.current = sortIdx; }, [sortIdx]);

  const handleCategorySelect = useCallback((catId: number | string | null) => {
    cancelSearchDebounce();
    setSelectedCatId(prev => {
      const nextCat = (catId === prev || catId === 'all') && prev !== null ? null : catId;
      selectedCatIdRef.current = nextCat;
      load(1, searchRef.current, sortIdxRef.current, nextCat);
      return nextCat;
    });
  }, [cancelSearchDebounce, load]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    searchRef.current = text;
    cancelSearchDebounce();
    searchTimeout.current = setTimeout(() => {
      load(1, text, sortIdxRef.current, selectedCatIdRef.current);
    }, 350);
  }, [cancelSearchDebounce, load]);

  const handleSubmitSearch = useCallback(() => {
    cancelSearchDebounce();
    load(1, searchRef.current, sortIdxRef.current, selectedCatIdRef.current);
  }, [cancelSearchDebounce, load]);

  const handleClearSearch = useCallback(() => {
    cancelSearchDebounce();
    setSearch('');
    searchRef.current = '';
    load(1, '', sortIdxRef.current, selectedCatIdRef.current);
  }, [cancelSearchDebounce, load]);

  const handleSortSelect = useCallback((idx: number) => {
    cancelSearchDebounce();
    setSortIdx(idx);
    sortIdxRef.current = idx;
    setShowSort(false);
    load(1, searchRef.current, idx, selectedCatIdRef.current);
  }, [cancelSearchDebounce, load]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMoreRef.current || loadingMore) return;
    isLoadingMoreRef.current = true;
    load(page + 1, search, sortIdx, selectedCatId, true);
  }, [hasMore, loadingMore, load, page, search, sortIdx, selectedCatId]);

  const handleProductPress = useCallback(
    (productId: number) => {
      navigation.navigate('ProductDetail', { productId });
    },
    [navigation],
  );

  const productKeyExtractor = useCallback((item: any) => String(item.id), []);
  const categoryKeyExtractor = useCallback((item: any) => 'shopcat-' + item.id, []);

  const renderProductItem = useCallback(
    ({ item }: { item: any }) => (
      <ProductListItem item={item} onPress={handleProductPress} />
    ),
    [handleProductPress],
  );

  const renderCategoryItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isAll = item.id === 'all';
      const isSelected = isAll
        ? selectedCatId === null || selectedCatId === 'all'
        : selectedCatId === item.id || String(selectedCatId) === String(item.id);

      return (
        <CategoryItem
          item={item}
          index={index}
          isSelected={isSelected}
          onSelect={handleCategorySelect}
          colors={colors}
          fontFamily={fontFamily}
        />
      );
    },
    [selectedCatId, handleCategorySelect, colors, fontFamily],
  );

  const categoryListData = React.useMemo(() => {
    return [{ id: 'all', name: 'All' }, ...categories];
  }, [categories]);

  const selectedCategoryObj = categories.find(c => String(c.id) === String(selectedCatId));
  const pageTitle = selectedCategoryObj?.name || params?.categoryName || 'Shop';

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <PageHeader
        title={pageTitle}
        subtitle={!loading ? `${totalCount} products` : undefined}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/* ── Search & Sort Row ── */}
      <View style={{ position: 'relative', zIndex: 100, paddingHorizontal: spacing[5], paddingBottom: spacing[3] }}>
        <View style={[styles.filterRow, { gap: 10 }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, flex: 1 }]}>
            <AppIcon name="magnify" color={colors.textMuted} size={18} />
            <TextInput
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Search products..."
              placeholderTextColor={colors.placeholder}
              returnKeyType="search"
              onSubmitEditing={handleSubmitSearch}
              blurOnSubmit
              style={[styles.searchInput, { color: colors.textPrimary, fontFamily: fontFamily.sans, fontSize: fontSize.sm }]}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={{ paddingRight: 12 }}>
                <AppIcon name="close" color={colors.textMuted} size={16} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setShowSort(v => !v)}
            activeOpacity={0.85}
            style={[styles.sortBtn, {
              backgroundColor: showSort ? colors.primary : colors.surfaceElevated,
              borderColor: showSort ? colors.primary : colors.border,
              borderRadius: radius.lg,
            }]}
          >
            <Text style={{ color: showSort ? colors.textOnPrimary : colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {SORT_OPTIONS[sortIdx].label} ▾
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Sort Dropdown Floating Absolute Overlay ── */}
        {showSort && (
          <View style={[
            styles.sortDropdown,
            {
              position: 'absolute',
              top: 50,
              left: spacing[5],
              right: spacing[5],
              zIndex: 1000,
              elevation: 10,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.lg,
              shadowColor: '#6B5040',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            }
          ]}>
            {SORT_OPTIONS.map((opt, i) => (
              <TouchableOpacity
                key={opt.label}
                onPress={() => handleSortSelect(i)}
                style={[styles.sortOption, i < SORT_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              >
                <Text style={{ color: i === sortIdx ? colors.primary : colors.textPrimary, fontFamily: i === sortIdx ? fontFamily.sansBold : fontFamily.sans, fontSize: fontSize.sm }}>
                  {opt.label}
                </Text>
                {i === sortIdx && <Text style={{ color: colors.primary, fontSize: 14 }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── Top Categories Carousel ── */}
      <View style={{ marginBottom: 12 }}>
        <FlatList
          data={categoryListData}
          extraData={selectedCatId}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing[5], gap: 16 }}
          keyExtractor={categoryKeyExtractor}
          renderItem={renderCategoryItem}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      </View>

      {/* Subtle inline progress bar when refreshing / filter updating */}
      {loading && products.length > 0 && (
        <View style={styles.topLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.topLoaderText, { color: colors.primary, fontFamily: fontFamily.sansMedium }]}>
            Updating products...
          </Text>
        </View>
      )}

      {/* ── Main Content Area ── */}
      {isInitialLoad && products.length === 0 ? (
        <ShopSkeleton colors={colors} spacing={spacing} radius={radius} />
      ) : !loading && products.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIconContainer, { borderColor: colors.border, borderRadius: radius.full }]}>
            <AppIcon name="diamond-stone" color={colors.primary} size={34} />
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg, marginTop: 24 }}>
            No creations found
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 8, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 }}>
            We couldn't find any items matching your criteria. Try adjusting your search query or selected category.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, opacity: loading && products.length > 0 ? 0.7 : 1 }}>
          <FlatList
            data={products}
            numColumns={2}
            keyExtractor={productKeyExtractor}
            renderItem={renderProductItem}
            contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: 100, paddingTop: 4, gap: 12 }}
            columnWrapperStyle={{ justifyContent: 'flex-start', gap: 12 }}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            updateCellsBatchingPeriod={50}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs, marginTop: 8 }}>
                    Loading more creations...
                  </Text>
                </View>
              ) : hasMore ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>
                    Scroll for more creations
                  </Text>
                </View>
              ) : products.length > 0 ? (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.xs }}>
                    Showing all {totalCount} exquisite pieces
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', alignItems: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', height: 46, borderWidth: 1, paddingLeft: 12 },
  searchInput: { flex: 1, paddingHorizontal: 10, height: '100%' },
  sortBtn: { height: 46, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sortDropdown: { borderWidth: 1, overflow: 'hidden' },
  sortOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIconContainer: { width: 96, height: 96, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  topLoader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 8 },
  topLoaderText: { fontSize: 12 },
});
