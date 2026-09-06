import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useTheme } from '../../context/ThemeContext';

export type ModalType = 'info' | 'success' | 'error' | 'warning' | 'confirm';

export interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'outline' | 'secondary';
}

export interface ModalOptions {
  type?: ModalType;
  title: string;
  message: string;
  actions?: ModalAction[];
}

interface ModalState extends ModalOptions {
  visible: boolean;
}

interface AppModalContextValue {
  show: (opts: ModalOptions) => void;
  hide: () => void;
}

const AppModalContext = createContext<AppModalContextValue | null>(null);

const TYPE_CONFIG: Record<
  ModalType,
  {
    icon: React.ComponentProps<typeof AppIcon>['name'];
    accent: string;
    bg: string;
    border: string;
    badgeText?: string;
  }
> = {
  info: {
    icon: 'information',
    accent: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
  },
  success: {
    icon: 'check-decagram',
    accent: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  error: {
    icon: 'alert-circle',
    accent: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
  warning: {
    icon: 'alert',
    accent: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
  },
  confirm: {
    icon: 'help-circle',
    accent: '#026670',
    bg: '#F0FDFA',
    border: '#99F6E4',
  },
};

function AppModalView({ state, hide }: { state: ModalState; hide: () => void }) {
  const { theme, isDark } = useTheme();
  const { colors, fontFamily, fontSize, radius, shadow } = theme;
  const cfg = TYPE_CONFIG[state.type ?? 'info'];

  const actions: ModalAction[] = state.actions ?? [{ label: 'Got It', onPress: hide, variant: 'primary' }];

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={hide}>
      <Pressable style={styles.backdrop} onPress={actions.length === 1 ? hide : undefined}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1E293B' : colors.surface,
              borderRadius: 24,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)',
              ...shadow.lg,
            },
          ]}
        >
          {/* Top subtle decorative strip */}
          <View style={[styles.topStrip, { backgroundColor: cfg.accent }]} />

          <View style={styles.body}>
            {/* Elegant Icon Badge with Outer Ring */}
            <View style={[styles.iconOuterRing, { borderColor: isDark ? cfg.accent + '40' : cfg.border, backgroundColor: isDark ? cfg.accent + '15' : cfg.bg }]}>
              <View style={[styles.iconInnerCircle, { backgroundColor: isDark ? cfg.accent + '30' : cfg.bg }]}>
                <AppIcon name={cfg.icon} color={cfg.accent} size={32} />
              </View>
            </View>

            {/* Title */}
            <Text
              style={[
                styles.titleText,
                {
                  color: colors.textPrimary,
                  fontFamily: fontFamily.sansBold,
                  fontSize: fontSize.lg + 1,
                },
              ]}
            >
              {state.title}
            </Text>

            {/* Message Body */}
            <Text
              style={[
                styles.messageText,
                {
                  color: isDark ? '#94A3B8' : colors.textSecondary,
                  fontFamily: fontFamily.sans,
                  fontSize: fontSize.sm + 0.5,
                },
              ]}
            >
              {state.message}
            </Text>

            {/* Action Buttons */}
            <View style={[styles.actionsRow, actions.length === 1 && styles.actionsSingle]}>
              {actions.map((action, i) => {
                const isPrimary = action.variant === 'primary' || (!action.variant && i === actions.length - 1);
                const isDanger = action.variant === 'danger';
                const isOutline = action.variant === 'outline' || action.variant === 'secondary';

                const btnBg = isDanger
                  ? '#DC2626'
                  : isPrimary
                  ? colors.primary
                  : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : '#F1F5F9';

                const btnBorder = isDanger
                  ? '#DC2626'
                  : isPrimary
                  ? colors.primary
                  : isDark
                  ? 'rgba(255,255,255,0.15)'
                  : '#E2E8F0';

                const textCol = isDanger || isPrimary ? '#FFFFFF' : colors.textPrimary;

                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      action.onPress();
                      hide();
                    }}
                    activeOpacity={0.82}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: btnBg,
                        borderColor: btnBorder,
                        flex: actions.length > 1 ? 1 : undefined,
                        minWidth: actions.length === 1 ? '100%' : undefined,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionBtnText,
                        {
                          color: textCol,
                          fontFamily: fontFamily.sansBold,
                          fontSize: fontSize.sm + 0.5,
                        },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function AppModalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ visible: false, title: '', message: '' });

  const show = useCallback((opts: ModalOptions) => {
    setState({ ...opts, visible: true });
  }, []);

  const hide = useCallback(() => {
    setState(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <AppModalContext.Provider value={{ show, hide }}>
      {children}
      <AppModalView state={state} hide={hide} />
    </AppModalContext.Provider>
  );
}

export function useAppModal() {
  const ctx = useContext(AppModalContext);
  if (!ctx) throw new Error('useAppModal must be used inside AppModalProvider');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  topStrip: {
    height: 3.5,
    width: '100%',
  },
  body: {
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  iconOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  messageText: {
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 6,
    marginBottom: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionsSingle: {
    justifyContent: 'center',
  },
  actionBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  actionBtnText: {
    letterSpacing: 0.3,
  },
});
