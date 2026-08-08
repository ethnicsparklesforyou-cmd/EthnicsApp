/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { Button, Input, Logo, Screen } from '../../components/common';
import { AppIcon } from '../../components/common';
import { OtpInput } from '../../components/common/OtpInput';
import type { OtpInputHandle } from '../../components/common/OtpInput';
import { isValidPhone } from '../../utils/helpers';
import { sendOtp as sendOtpRequest, verifyOtp as verifyOtpRequest, registerWithPhone } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { addToServerCart } from '../../services/cart';
import type { AuthStackParamList } from '../../navigation/types';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };
type Step = 'phone' | 'otp';

export function LoginScreen({ navigation: _navigation }: Props) {
  const { theme } = useTheme();
  const { login } = useAuth();
  const { items: guestCartItems } = useCart();
  const { colors, fontFamily, fontSize, spacing, radius } = theme;

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRef = useRef<OtpInputHandle>(null);

  // Sheet animation
  const slideY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    setResendTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const migrateCart = async (userId: number) => {
    if (guestCartItems.length === 0) return;
    await Promise.allSettled(
      guestCartItems.map(item =>
        addToServerCart({ userId, productId: Number(item.productId), quantity: item.quantity, size: item.size || null })
      )
    );
  };

  const handlePhoneSubmit = async () => {
    if (!isValidPhone(phone)) { setPhoneError('Enter a valid 10-digit mobile number'); return; }
    setPhoneError(''); setError(''); setLoading(true);
    try {
      const res = await sendOtpRequest({ contactType: 'mobile', contactValue: phone.trim(), isLoginAuth: true });
      const bodyStatus = (res.json as any)?.status;
      if (res.ok || bodyStatus === 200) {
        setStep('otp');
        startTimer();
        // Delay focus to ensure keyboard opens smoothly
        setTimeout(() => {
          otpRef.current?.reset();
        }, 300);
      } else { setPhoneError((res.json as any).statusMessage || 'Failed to send OTP. Please try again.'); }
    } catch { setPhoneError('Network error. Please check your connection.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async (accountType: 'retail' | 'b2b') => {
    try {
      const res = await registerWithPhone({ phone: phone.trim(), accountType });
      const payload = (res.json as any)?.data;
      if (res.ok && payload?.user && payload?.token) {
        await migrateCart(payload.user.id);
        await login(payload.user, payload.token);
      } else {
        setError((res.json as any).statusMessage || 'Registration failed. Please try again.');
        otpRef.current?.reset();
      }
    } catch {
      setError('Network error. Please check your connection.');
      otpRef.current?.reset();
    }
  };

  const verifyCode = async (otp: string) => {
    setLoading(true); setError('');
    try {
      const res = await verifyOtpRequest({ contactType: 'mobile', contactValue: phone.trim(), otpCode: otp, isLoginAuth: true });
      const payload = (res.json as any)?.data;
      if (res.ok && payload?.isExist && payload?.user && payload?.token) {
        await migrateCart(payload.user.id);
        await login(payload.user, payload.token);
      } else if (res.ok && (payload?.isExist === false || ((res.json as any).status === 200 && !payload?.isExist))) {
        await handleRegister('retail');
      } else {
        setError((res.json as any).statusMessage || 'Invalid OTP. Please try again.');
        otpRef.current?.reset();
      }
    } catch { setError('Network error. Please check your connection.'); otpRef.current?.reset(); }
    finally { setLoading(false); }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    setError(''); setLoading(true);
    try {
      const res = await sendOtpRequest({ contactType: 'mobile', contactValue: phone.trim(), isLoginAuth: true });
      const bodyStatus = (res.json as any)?.status;
      if (res.ok || bodyStatus === 200) { startTimer(); otpRef.current?.reset(); }
      else { setError((res.json as any).statusMessage || 'Failed to resend OTP'); }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  const stepTitle = step === 'otp' ? 'Verify OTP' : 'Welcome Back';
  const stepSub = step === 'otp'
    ? `Code sent to +91 ${phone}`
    : 'Sign in or create your account';

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      {/* Background — logo + tagline */}
      <View style={styles.bg}>
        <Logo size="lg" />
        <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', marginTop: 10 }}>
          Curating Elegance for Every Moment
        </Text>
      </View>

      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]} />

      {/* Bottom sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kavWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Step badge + close area */}
          <View style={styles.sheetHeader}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
              <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
              <Text style={{ color: colors.primary, fontFamily: fontFamily.sansBold, fontSize: 10, letterSpacing: 1.2 }}>
                {step === 'phone' ? 'STEP 1 OF 2' : 'STEP 2 OF 2'}
              </Text>
            </View>
          </View>

          <View style={[styles.sheetBody, { paddingHorizontal: spacing[5] }]}>
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: 22, marginBottom: 4 }}>
              {stepTitle}
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginBottom: 24 }}>
              {stepSub}
            </Text>

            {/* ── Phone step ── */}
            {step === 'phone' && (
              <>
                <View style={styles.phoneRow}>
                  <View style={[styles.countryCode, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderRadius: radius.md }]}>
                    <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.base }}>+91</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Mobile Number"
                      value={phone}
                      onChangeText={v => { setPhone(v); setPhoneError(''); }}
                      keyboardType="phone-pad"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      error={phoneError}
                    />
                  </View>
                </View>
                <Button label="Send OTP" onPress={handlePhoneSubmit} loading={loading} />
              </>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <>
                <TouchableOpacity onPress={() => { setStep('phone'); setError(''); otpRef.current?.reset(); }} style={{ marginBottom: 20 }}>
                  <Text style={{ color: colors.primary, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>← Change number</Text>
                </TouchableOpacity>
                <OtpInput ref={otpRef} onComplete={verifyCode} disabled={loading} />
                {loading && (
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 12, textAlign: 'center' }}>
                    Verifying...
                  </Text>
                )}
                <View style={styles.resendRow}>
                  <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm }}>Didn't receive?{'  '}</Text>
                  <TouchableOpacity onPress={resendOtp} disabled={resendTimer > 0 || loading}>
                    <Text style={{ color: resendTimer > 0 ? colors.textMuted : colors.primary, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm }}>
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Error */}
            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: colors.error + '12', borderColor: colors.error + '50', borderRadius: radius.lg }]}>
                <AppIcon name="alert-circle-outline" size={15} color={colors.error} />
                <Text style={{ color: colors.error, fontFamily: fontFamily.sans, fontSize: fontSize.sm, flex: 1, marginLeft: 8 }}>{error}</Text>
              </View>
            )}

            {/* Footer */}
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: 11, textAlign: 'center', lineHeight: 17, marginTop: 20, marginBottom: 8 }}>
              By continuing, you agree to our{' '}
              <Text style={{ color: colors.primary }}>Terms</Text>
              {' '}and{' '}
              <Text style={{ color: colors.primary }}>Privacy Policy</Text>.
            </Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)' },
  kavWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: { paddingBottom: 36 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  stepBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  stepDot: { width: 6, height: 6, borderRadius: 3 },
  sheetBody: { paddingTop: 12 },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 16 },
  countryCode: { height: 54, width: 72, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  phoneBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 12, marginBottom: 20 },
  typeGrid: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  typeCard: { flex: 1, borderWidth: 1.5, padding: 16, alignItems: 'center' },
  typeIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 12, marginTop: 12 },
});
