import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { AppIcon } from './AppIcon';

type Action = {
  label?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: Action[];
  style?: ViewStyle;
};

export function PageHeader({ title, subtitle, onBack, actions = [], style }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, radius } = theme;

  const rightWidth = actions.length > 1 ? actions.length * 44 : 40;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
        style,
      ]}>
      <View style={styles.row}>
        {/* Left Back Button Slot */}
        <View style={[styles.side, { width: rightWidth, alignItems: 'flex-start' }]}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: radius.full,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.08,
                  shadowRadius: 3,
                  elevation: 2,
                },
              ]}>
              <AppIcon name="chevron-left" color={colors.textPrimary} size={22} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40, height: 40 }} />
          )}
        </View>

        {/* Center Title Slot */}
        <View style={styles.center}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.sansBold,
              fontSize: 17,
              letterSpacing: 0.2,
              textAlign: 'center',
            }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                color: colors.textMuted,
                fontFamily: fontFamily.sansMedium,
                fontSize: 11.5,
                marginTop: 2,
                textAlign: 'center',
              }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right Action Slot */}
        <View style={[styles.side, { minWidth: 40, alignItems: 'flex-end' }]}>
          {actions.length > 0 ? (
            <View style={styles.actions}>
              {actions.map((action, idx) => (
                <TouchableOpacity
                  key={`${action.label ?? 'action'}-${idx}`}
                  onPress={action.onPress}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                  accessibilityLabel={action.accessibilityLabel ?? action.label}
                  style={
                    action.icon
                      ? [
                        styles.iconBtn,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                          borderRadius: radius.full,
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.08,
                          shadowRadius: 3,
                          elevation: 2,
                        },
                      ]
                      : [
                        styles.textBtn,
                        {
                          backgroundColor: colors.primary + '14',
                          borderColor: colors.primary + '30',
                          borderRadius: radius.full,
                        },
                      ]
                  }>
                  {action.icon ?? (action.label ? (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: colors.primary,
                        fontFamily: fontFamily.sansBold,
                        fontSize: 13,
                        textAlign: 'center',
                      }}>
                      {action.label}
                    </Text>
                  ) : null)}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ width: 40, height: 40 }} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  side: {
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBtn: {
    minHeight: 32,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
});
