import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const logoImg = require('../../assets/LogoNew.png');

const sizeMap = {
  xs: { width: 44, height: 44 },
  sm: { width: 64, height: 64 },
  md: { width: 90, height: 90 },
  lg: { width: 130, height: 130 },
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
