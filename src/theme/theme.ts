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

    primary: palette.primary,          // #7C3AED (Royal Purple)
    primaryLight: palette.primaryLight,
    primaryDark: palette.primaryDark,
    accent: palette.rose,              // #EC4899 (Hot Rose Pink)
    rose: palette.rose,
    gold: palette.gold,
    vanilla: palette.lightSurfaceElevated,
    stone: palette.lightBorder,

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

    primary: '#A855F7',                // Electric Amethyst Neon Purple
    primaryLight: '#C084FC',           // Radiant Lavender Glow
    primaryDark: '#7E22CE',            // Deep Royal Purple
    accent: '#F43F5E',                 // Electric Rose Pink highlight
    rose: '#F43F5E',
    gold: '#FBBF24',                   // 18K Sparkling Gold
    vanilla: palette.darkSurfaceElevated,
    stone: palette.darkBorder,

    textPrimary: palette.darkTextPrimary,
    textSecondary: palette.darkTextSecondary,
    textMuted: palette.darkTextMuted,
    textOnPrimary: '#08070D',
    textInverse: '#A855F7',

    border: palette.darkBorder,
    borderLight: palette.darkBorderSoft,

    success: '#34D399',
    error: '#F87171',
    warning: '#FBBF24',
    info: '#60A5FA',
    overlay: 'rgba(0,0,0,0.78)',
    statusBar: palette.darkBg,
    tabBar: palette.darkSurface,
    inputBg: palette.darkSurfaceElevated,
    placeholder: palette.darkTextMuted,
  },
} as const;

export type AppTheme = typeof lightTheme | typeof darkTheme;
export type ThemeColors = AppTheme['colors'];
