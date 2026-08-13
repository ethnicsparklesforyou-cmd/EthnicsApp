import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ShopScreen } from '../screens/main/ShopScreen';
import { CartScreen } from '../screens/main/CartScreen';
import { AccountScreen } from '../screens/main/AccountScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AddressesScreen } from '../screens/main/AddressesScreen';
import { SettingsScreen } from '../screens/main/SettingsScreen';
import { ProductDetailScreen } from '../screens/main/ProductDetailScreen';
import { CheckoutScreen } from '../screens/main/CheckoutScreen';
import { OrderSuccessScreen } from '../screens/main/OrderSuccessScreen';
import { OrdersScreen } from '../screens/main/OrdersScreen';
import { WishlistScreen } from '../screens/main/WishlistScreen';
import { OrderDetailScreen } from '../screens/main/OrderDetailScreen';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { AppIcon } from '../components/common';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function HomeTabs() {
  const { totalItems } = useCart();
  const { theme } = useTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 20) : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: tabBarHeight,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          elevation: 16,
          shadowColor: '#6B5040',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
          letterSpacing: 0.1,
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => <AppIcon name={focused ? 'home' : 'home-outline'} color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarLabel: 'Shop',
          tabBarIcon: ({ color, focused }) => <AppIcon name={focused ? 'storefront' : 'storefront-outline'} color={color} size={22} />,
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, focused }) => (
            <View>
              <AppIcon name={focused ? 'cart' : 'cart-outline'} color={color} size={22} />
              {totalItems > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{totalItems > 9 ? '9+' : totalItems}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, focused }) => <AppIcon name={focused ? 'account-circle' : 'account-circle-outline'} color={color} size={22} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="HomeTabs" component={HomeTabs} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 15, height: 15, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#FAFAF8',
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
});
