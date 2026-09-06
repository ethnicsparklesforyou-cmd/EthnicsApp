import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PageHeader, Screen } from '../../components/common';
import { AppIcon } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import { useWishlist } from '../../context/WishlistContext';
import { fetchProducts } from '../../services/products';
import { ProductCard } from '../../components/ProductCard';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<MainStackParamList, 'Wishlist'> };

export function WishlistScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;
  const { ids, refreshWishlist } = useWishlist();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(ids.size > 0);
  const [refreshing, setRefreshing] = useState(false);
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!initialFetchDone.current) {
      if (ids.size > 0) {
        initialFetchDone.current = true;
        setLoading(true);
        fetchProducts({ limit: 100 })
          .then(res => {
            const all = res?.data?.products || [];
            setProducts(all.filter((p: any) => ids.has(p.id)));
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    } else {
      setProducts(prev => prev.filter(p => ids.has(p.id)));
    }
  }, [ids]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshWishlist();
      const res = await fetchProducts({ limit: 100 });
      const all = res?.data?.products || [];
      setProducts(all.filter((p: any) => ids.has(p.id)));
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [ids, refreshWishlist]);

  const count = products.length;

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      <PageHeader
        title="Wishlist"
        subtitle={count > 0 ? `${count} saved item${count > 1 ? 's' : ''}` : undefined}
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 12 }}>
            Loading your wishlist...
          </Text>
        </View>
      ) : count === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyCircle, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
            <AppIcon name="heart-outline" color="#E11D48" size={34} />
          </View>
          <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xl, marginTop: 20 }}>
            Your wishlist is empty
          </Text>
          <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 8, textAlign: 'center', lineHeight: 20, paddingHorizontal: 32 }}>
            Tap the heart on any product to save it here for later.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('HomeTabs', { screen: 'Shop' } as any)}
            style={[styles.shopBtn, { backgroundColor: colors.primary, borderRadius: radius.xl, marginTop: 28 }]}
          >
            <Text style={{ color: '#fff', fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>Explore Collection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 60, paddingTop: 8 }}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard
                product={item}
                onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
              />
            </View>
          )}
          ListHeaderComponent={
            <View style={[styles.listHeader, { backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, marginBottom: 16 }]}>
              <AppIcon name="heart" color="#E11D48" size={16} />
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>
                {count} item{count > 1 ? 's' : ''} saved
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  shopBtn: { paddingHorizontal: 36, paddingVertical: 14 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
});
