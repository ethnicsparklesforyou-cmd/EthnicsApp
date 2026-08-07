import { palette } from './colors';
import { fontFamily, fontSize, fontWeight, letterSpacing } from './typography';
import { radius, shadow, spacing } from './spacing';

const baseTheme = { spacing, radius, shadow, fontFamily, fontSize, fontWeight, letterSpacing };

export const lightTheme = {
  ...baseTheme,
  dark: false,
  colors: {
    background: palette.lightBg,
    surface: palette.lightSurface,
    surfaceElevated: palette.lightSurfaceElevated,
    card: palette.lightSurface,

    primary: palette.primary,
    primaryLight: palette.primaryLight,
    primaryDark: palette.primaryDark,
    accent: palette.primary,
    gold: palette.primary,
    vanilla: palette.lightSurfaceElevated,
    stone: '#E8E2D9',

    textPrimary: palette.lightTextPrimary,
    textSecondary: palette.lightTextSecondary,
    textMuted: palette.lightTextMuted,
    textOnPrimary: palette.white,
    textInverse: palette.primary,

    border: palette.lightBorder,
    borderLight: palette.lightBorderSoft,

    success: palette.success,
    error: palette.error,
    warning: palette.warning,
    info: palette.info,
    overlay: palette.overlay,
    statusBar: palette.lightBg,
    tabBar: palette.lightSurface,
    inputBg: palette.lightSurface,
    placeholder: palette.lightTextMuted,
  },
} as const;

export const darkTheme = {
  ...baseTheme,
  dark: true,
  colors: {
    background: palette.darkBg,
    surface: palette.darkSurface,
    surfaceElevated: palette.darkSurfaceElevated,
    card: palette.darkSurface,

    primary: '#D4A574',          // brighter gold — pops on dark
    primaryLight: '#E8C49A',
    primaryDark: '#B5814A',
    accent: '#D4A574',
    gold: '#D4A574',
    vanilla: palette.darkSurfaceElevated,
    stone: palette.darkBorder,

    textPrimary: palette.darkTextPrimary,
    textSecondary: palette.darkTextSecondary,
    textMuted: palette.darkTextMuted,
    textOnPrimary: '#0A0A0F',
    textInverse: '#D4A574',

    border: palette.darkBorder,
    borderLight: '#222230',

    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
    overlay: 'rgba(0,0,0,0.65)',
    statusBar: palette.darkBg,
    tabBar: palette.darkSurface,
    inputBg: palette.darkSurfaceElevated,
    placeholder: palette.darkTextMuted,
  },
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
export type ThemeColors = AppTheme['colors'];
