import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
}

export interface OtpInputHandle {
  reset: () => void;
}

export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(
  ({ length = 6, onComplete, disabled }, ref) => {
    const { theme } = useTheme();
    const { colors, radius, fontFamily, fontSize } = theme;
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const inputRef = useRef<TextInput | null>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        setValues(Array(length).fill(''));
        requestAnimationFrame(() => inputRef.current?.focus());
      },
    }));

    const focusInput = () => {
      if (!disabled) {
        inputRef.current?.focus();
      }
    };

    const handleChange = (text: string) => {
      // Keep a single text field so the keyboard stays open and stable.
      const cleaned = text.replace(/\D/g, '');
      if (cleaned.length > 1) {
        const next = Array(length).fill('');
        cleaned.split('').slice(0, length).forEach((d, i) => { next[i] = d; });
        setValues(next);
        if (cleaned.length >= length) onComplete(next.join(''));
        return;
      }

      const next = cleaned.split('').slice(0, length);
      while (next.length < length) next.push('');
      setValues(next);
      if (next.every(v => v !== '')) {
        onComplete(next.join(''));
      }
    };

    return (
      <Pressable onPress={focusInput} style={styles.row}>
        <TextInput
          ref={inputRef}
          value={values.join('')}
          onChangeText={handleChange}
          keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
          maxLength={length}
          autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
          textContentType="oneTimeCode"
          importantForAutofill="yes"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          selectTextOnFocus
          blurOnSubmit={false}
          caretHidden
          autoFocus
          style={styles.hiddenInput}
          returnKeyType="done"
        />
        {values.map((val, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={[
              styles.box,
              {
                borderColor: val ? colors.primary : colors.border,
                borderRadius: radius.md,
                backgroundColor: val ? colors.primary + '10' : colors.inputBg,
                borderWidth: val ? 2 : 1.5,
                opacity: disabled ? 0.6 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.xl }}>
              {val}
            </Text>
          </View>
        ))}
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center', position: 'relative' },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
    fontSize: 1,
    zIndex: 10,
  },
  box: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
