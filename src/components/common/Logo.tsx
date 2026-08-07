import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const logoImg = require('../../assets/LogoNew.png');

const sizeMap = {
  xs: { width: 90, height: 60 },
  sm: { width: 120, height: 80 },
  md: { width: 150, height: 100 },
  lg: { width: 180, height: 120 },
};

interface LogoProps {
  size?: keyof typeof sizeMap;
  showTagline?: boolean; // kept for API compat, unused
}

export function Logo({ size = 'md' }: LogoProps) {
  const { width, height } = sizeMap[size];
  return (
    <View style={styles.wrap}>
      <Image source={logoImg} style={{ width, height }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
