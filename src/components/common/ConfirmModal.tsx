import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Button } from './Button';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  contentStyle?: ViewStyle;
};

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
  icon,
  contentStyle,
}: ConfirmModalProps) {
  const { theme } = useTheme();
  const { colors, radius, shadow, fontFamily, fontSize } = theme;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius['2xl'],
              ...shadow.lg,
            },
            contentStyle,
          ]}>
          <View style={styles.headerRow}>
            {icon ? (
              <View style={[styles.iconWrap, { backgroundColor: danger ? colors.error + '16' : colors.primary + '14' }]}>
                {icon}
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg }}>
                {title}
              </Text>
              <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, marginTop: 6, lineHeight: 20 }}>
                {message}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <View style={styles.actionFlex}>
              <Button label={cancelLabel} onPress={onCancel} variant="outline" size="sm" fullWidth />
            </View>
            <View style={styles.actionFlex}>
              <Button
                label={confirmLabel}
                onPress={onConfirm}
                variant={danger ? 'danger' : 'primary'}
                size="sm"
                loading={loading}
                fullWidth
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderWidth: 1,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionFlex: {
    flex: 1,
  },
});
