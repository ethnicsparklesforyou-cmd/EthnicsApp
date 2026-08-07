import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export function Input({
  label,
  error,
  rightIcon,
  onRightIconPress,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const { colors, radius, fontFamily, fontSize } = theme;
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.primary
    : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text
        style={[
          styles.label,
          {
            color: error ? colors.error : focused ? colors.primary : colors.textSecondary,
            fontFamily: fontFamily.sansMedium,
            fontSize: fontSize.sm,
          },
        ]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            borderRadius: radius.md,
            backgroundColor: colors.inputBg,
          },
        ]}>
        <TextInput
          {...props}
          placeholderTextColor={colors.placeholder}
          onFocus={e => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              fontFamily: fontFamily.sans,
              fontSize: fontSize.base,
            },
          ]}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text
          style={[
            styles.error,
            { color: colors.error, fontFamily: fontFamily.sans, fontSize: fontSize.xs },
          ]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { marginBottom: 6, letterSpacing: 0.3 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 54,
  },
  input: { flex: 1, padding: 0 },
  iconBtn: { paddingLeft: 8 },
  error: { marginTop: 4 },
});
