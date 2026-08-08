import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StatusBar, StyleSheet, Text, View, Dimensions, useColorScheme } from 'react-native';

const logoImg = require('../../assets/LogoNew.png');
const { width: W, height: H } = Dimensions.get('window');

interface Props { onFinish: () => void }

export function SplashScreen({ onFinish }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const bottomElementsOpacity = useRef(new Animated.Value(0)).current;
  const bottomElementsTranslateY = useRef(new Animated.Value(30)).current;
  const bgGradientOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Phase 1: Background gradient fade in + Logo scale & fade in
    Animated.parallel([
      Animated.timing(bgGradientOpacity, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase 2: Brand text fades in with slide up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 3: Bottom elements fade in with slide up
        Animated.parallel([
          Animated.timing(bottomElementsOpacity, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(bottomElementsTranslateY, {
            toValue: 0,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Phase 4: Hold for a moment then finish
          setTimeout(onFinish, 1200);
        });
      });
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0F0D0B' : '#FFFFFF'} translucent />

      {/* Animated gradient background */}
      <Animated.View
        style={[
          styles.gradientBg,
          {
            opacity: bgGradientOpacity,
          },
        ]}
      >
        <View style={styles.gradientOverlay} />
      </Animated.View>

      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
      <View style={[styles.decorCircle, styles.decorCircle3]} />

      {/* Main content */}
      <View style={styles.contentWrapper}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image source={logoImg} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        {/* Brand text */}
        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.brandName}>ETHNICS RETAIL</Text>
          <Text style={styles.tagline}>Premium Fashion Jewellery</Text>
        </Animated.View>
      </View>

      {/* Bottom elements */}
      <Animated.View
        style={[
          styles.bottomElements,
          {
            opacity: bottomElementsOpacity,
            transform: [{ translateY: bottomElementsTranslateY }],
          },
        ]}
      >
        {/* Dot loader */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
        <Text style={styles.loadingText}>Loading your collection...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(181, 129, 74, 0.03)',
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.05,
  },
  decorCircle1: {
    width: 400,
    height: 400,
    top: -100,
    right: -100,
    backgroundColor: '#D4A574',
  },
  decorCircle2: {
    width: 300,
    height: 300,
    bottom: -80,
    left: -80,
    backgroundColor: '#D4A574',
  },
  decorCircle3: {
    width: 200,
    height: 200,
    top: '50%',
    left: -50,
    backgroundColor: '#E8C9A0',
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logoWrapper: {
    marginBottom: 32,
  },
  logo: {
    width: 140,
    height: 93,
  },
  textBlock: {
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
  },
  tagline: {
    color: '#B5814A',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bottomElements: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4A574',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  loadingText: {
    color: 'rgba(26, 26, 26, 0.6)',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
