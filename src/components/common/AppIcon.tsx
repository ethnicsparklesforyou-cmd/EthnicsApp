import React from 'react';
import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export function AppIcon({ name, size = 20, color = '#000', style }: Props) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={[styles.icon, { lineHeight: size }, style]} />;
}

const styles = StyleSheet.create({
  icon: {
    includeFontPadding: false,
    textAlignVertical: 'center',
    alignSelf: 'center',
  },
});
