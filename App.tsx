import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppModalProvider } from './src/components/common';

function AppStatusBar() {
  const isDarkMode = useColorScheme() === 'dark';
  const { theme, isDark } = useTheme();

  return (
    <StatusBar
      barStyle={isDarkMode || isDark ? 'light-content' : 'dark-content'}
      backgroundColor={theme.colors.background}
    />
  );
}

function AppShell() {
  useEffect(() => {
    MaterialCommunityIcons.loadFont?.().catch(() => {});
  }, []);

  return (
    <>
      <AppStatusBar />
      <RootNavigator />
    </>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <AppModalProvider>
                <AppShell />
              </AppModalProvider>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
