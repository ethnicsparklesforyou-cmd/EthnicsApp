import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const { colors, radius, fontFamily, fontSize, fontWeight, letterSpacing } =
    theme;

  const isDisabled = disabled || loading;

  const sizeMap = {
    sm: { height: 40, px: 16, fs: fontSize.sm },
    md: { height: 52, px: 24, fs: fontSize.base },
    lg: { height: 60, px: 32, fs: fontSize.md },
  };

  const s = sizeMap[size];

  const variantStyles: Record<Variant, ViewStyle> = {
    primary: {
      backgroundColor: isDisabled ? colors.primaryLight : colors.primary,
      borderWidth: 1.5,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDisabled ? 0 : 0.18,
      shadowRadius: 10,
      elevation: isDisabled ? 0 : 3,
    },
    outline: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: {
      backgroundColor: colors.error,
      borderWidth: 1.5,
      borderColor: colors.error,
    },
  };

  const textColor: Record<Variant, string> = {
    primary: colors.textOnPrimary,
    outline: colors.primary,
    ghost: colors.primary,
    danger: '#fff',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.px,
          borderRadius: radius.lg,
          opacity: isDisabled ? 0.6 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variantStyles[variant],
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textOnPrimary : colors.primary}
          size="small"
        />
      ) : (
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontFamily: fontFamily.sansMedium,
            fontSize: s.fs,
            fontWeight: fontWeight.semibold,
            color: textColor[variant],
            letterSpacing: letterSpacing.wider,
            textTransform: 'uppercase',
            textAlign: 'center',
            includeFontPadding: false,
            lineHeight: s.fs + 4,
            flexShrink: 1,
          }}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// Divider with "OR" text used between auth options
export function OrDivider() {
  const { theme } = useTheme();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
      <Text style={[styles.dividerText, { color: theme.colors.textMuted, fontFamily: theme.fontFamily.sans }]}>
        OR
      </Text>
      <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 12 },
});
