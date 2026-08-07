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

function BackChevron({ color }: { color: string }) {
  return (
    <View style={styles.chevronWrap}>
      <AppIcon name="chevron-left" color={color} size={22} />
    </View>
  );
}

export function PageHeader({ title, subtitle, onBack, actions = [], style }: Props) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, radius, spacing } = theme;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingHorizontal: spacing[5],
          paddingTop: spacing[4],
          paddingBottom: spacing[3],
          backgroundColor: colors.background,
        },
        style,
      ]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <TouchableOpacity
              onPress={onBack}
              accessibilityLabel="Go back"
              style={[
                styles.iconBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: radius.full,
                  shadowColor: '#000',
                },
              ]}>
              <BackChevron color={colors.textPrimary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        <View style={styles.center}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.textPrimary,
              fontFamily: fontFamily.sansBold,
              fontSize: fontSize.lg,
              textAlign: 'center',
            }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                color: colors.textMuted,
                fontFamily: fontFamily.sans,
                fontSize: fontSize.xs,
                marginTop: 2,
                textAlign: 'center',
              }}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View style={styles.side}>
          {actions.length > 0 ? (
            <View style={styles.actions}>
              {actions.map((action, idx) => (
                <TouchableOpacity
                  key={`${action.label ?? 'action'}-${idx}`}
                  onPress={action.onPress}
                  accessibilityLabel={action.accessibilityLabel ?? action.label}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surfaceElevated,
                      borderColor: colors.border,
                      borderRadius: radius.full,
                    },
                  ]}>
                  {action.icon ?? (action.label ? (
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={{
                        color: colors.textPrimary,
                        fontFamily: fontFamily.sansMedium,
                        fontSize: fontSize.sm,
                        textAlign: 'center',
                        flexShrink: 1,
                      }}>
                      {action.label}
                    </Text>
                  ) : null)}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  side: { width: 72, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  placeholder: { width: 42, height: 42 },
  iconBtn: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  actionBtn: {
    minWidth: 72,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    maxWidth: 160,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 8 },
  chevronWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
