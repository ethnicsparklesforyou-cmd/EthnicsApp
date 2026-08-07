import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useTheme } from '../../context/ThemeContext';

type ModalType = 'info' | 'success' | 'error' | 'warning' | 'confirm';

interface ModalAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'outline';
}

interface ModalOptions {
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

const TYPE_CONFIG: Record<ModalType, { icon: React.ComponentProps<typeof AppIcon>['name']; accent: string; bg: string }> = {
  info:    { icon: 'information-outline', accent: '#026670', bg: '#E6F4F5' },
  success: { icon: 'check-circle-outline', accent: '#16A34A', bg: '#F0FDF4' },
  error:   { icon: 'close-circle-outline', accent: '#DC2626', bg: '#FEF2F2' },
  warning: { icon: 'alert-outline', accent: '#D97706', bg: '#FFFBEB' },
  confirm: { icon: 'help-circle-outline', accent: '#026670', bg: '#E6F4F5' },
};

function AppModalView({ state, hide }: { state: ModalState; hide: () => void }) {
  const { theme } = useTheme();
  const { colors, fontFamily, fontSize, radius, shadow } = theme;
  const cfg = TYPE_CONFIG[state.type ?? 'info'];

  const actions: ModalAction[] = state.actions ?? [{ label: 'OK', onPress: hide, variant: 'primary' }];

  return (
    <Modal visible={state.visible} transparent animationType="fade" onRequestClose={hide}>
      <Pressable style={styles.backdrop} onPress={actions.length === 1 ? hide : undefined}>
        <Pressable onPress={() => {}} style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius['2xl'], borderColor: colors.border, ...shadow.lg }]}>
          {/* Top accent bar */}
          <View style={[styles.accentBar, { backgroundColor: cfg.accent, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'] }]} />

          <View style={styles.body}>
            {/* Icon */}
            <View style={[styles.iconWrap, { backgroundColor: cfg.bg, borderRadius: radius.xl }]}>
              <AppIcon name={cfg.icon} color={cfg.accent} size={30} />
            </View>

            {/* Text */}
            <Text style={{ color: colors.textPrimary, fontFamily: fontFamily.sansBold, fontSize: fontSize.lg, textAlign: 'center', marginTop: 14 }}>
              {state.title}
            </Text>
            <Text style={{ color: colors.textMuted, fontFamily: fontFamily.sans, fontSize: fontSize.sm, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
              {state.message}
            </Text>

            {/* Actions */}
            <View style={[styles.actions, actions.length === 1 && styles.actionsSingle]}>
              {actions.map((action, i) => {
                const isPrimary = action.variant === 'primary' || (!action.variant && i === actions.length - 1);
                const isDanger = action.variant === 'danger';
                const bg = isDanger ? '#DC2626' : isPrimary ? cfg.accent : 'transparent';
                const border = isDanger ? '#DC2626' : isPrimary ? cfg.accent : colors.border;
                const textCol = (isPrimary || isDanger) ? '#fff' : colors.textPrimary;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => { action.onPress(); hide(); }}
                    activeOpacity={0.8}
                    style={[styles.actionBtn, { backgroundColor: bg, borderColor: border, borderRadius: radius.xl, flex: actions.length > 1 ? 1 : undefined, minWidth: actions.length === 1 ? 160 : undefined }]}>
                    <Text style={{ color: textCol, fontFamily: fontFamily.sansBold, fontSize: fontSize.sm, letterSpacing: 0.4 }}>
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
    backgroundColor: 'rgba(10,20,30,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: { height: 4, width: '100%' },
  body: { padding: 24, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' },
  actionsSingle: { justifyContent: 'center' },
  actionBtn: { paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', borderWidth: 1.5 },
});
