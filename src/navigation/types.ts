import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
};

export type MainStackParamList = {
  HomeTabs: NavigatorScreenParams<TabParamList>;
  ProductDetail: { productId: number };
  Cart: undefined;
  Checkout: undefined;
  OrderSuccess: { invoiceNumber: string; orderId: number; isCod: boolean };
  Orders: undefined;
  OrderDetail: { orderId: number };
  Wishlist: undefined;
  Profile: undefined;
  Addresses: undefined;
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Shop:
    | {
        search?: string;
        categoryId?: number;
        subcategoryId?: number;
        categoryName?: string;
      }
    | undefined;
  CartTab: undefined;
  Account: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};
