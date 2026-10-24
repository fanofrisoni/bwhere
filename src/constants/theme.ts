/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Brand scales, lightest (50) to darkest (950), generated in OKLCH so equal steps look equally far apart.
// Each brand color sits unchanged at the step closest to its own lightness (noted per scale).
export const Palette = {
  // Violet Twilight #454ADE at 700
  violet: {
    50: '#F4F6FF',
    100: '#E7ECFF',
    200: '#CFD9FF',
    300: '#B1C0FF',
    400: '#8CA0FF',
    500: '#6B7DFD',
    600: '#515BEA',
    700: '#454ADE',
    800: '#2D2AAA',
    900: '#1F1484',
    950: '#130263',
  },
  // Space Indigo #1B1F3B at 950
  indigo: {
    50: '#F4F6FF',
    100: '#E9ECF9',
    200: '#D7DAE9',
    300: '#BFC3D5',
    400: '#A2A7BC',
    500: '#868BA3',
    600: '#6B708A',
    700: '#535974',
    800: '#3E435F',
    900: '#292E4A',
    950: '#1B1F3B',
  },
  // Hyper Magenta #B14AED at 500
  magenta: {
    50: '#FAF4FF',
    100: '#F4E7FF',
    200: '#EACEFF',
    300: '#DCAEFF',
    400: '#CC80FF',
    500: '#B14AED',
    600: '#9A36D1',
    700: '#7E21B0',
    800: '#640A8E',
    900: '#480069',
    950: '#310049',
  },
  // Orchid Mist #C874D9 at 400
  orchid: {
    50: '#FDF3FF',
    100: '#FBE4FF',
    200: '#F6C8FF',
    300: '#E9A9F6',
    400: '#C874D9',
    500: '#B766C8',
    600: '#984FA7',
    700: '#7C3B8A',
    800: '#62296D',
    900: '#481751',
    950: '#32093A',
  },
  // Pastel Petal #E1BBC9 at 300
  petal: {
    50: '#FFF3F7',
    100: '#FCE6EE',
    200: '#F0D1DC',
    300: '#E1BBC9',
    400: '#C09DAA',
    500: '#A2828E',
    600: '#846973',
    700: '#6B535C',
    800: '#533E46',
    900: '#3C2B31',
    950: '#291A20',
  },
} as const;

// Text/background pairs below meet WCAG AA (4.5:1) contrast.
export const Colors = {
  light: {
    text: Palette.indigo[950],
    background: '#ffffff',
    backgroundElement: Palette.indigo[100],
    backgroundSelected: Palette.indigo[200],
    textSecondary: Palette.indigo[700],
    primary: Palette.violet[700],
    onPrimary: '#ffffff',
    accent: Palette.magenta[600],
  },
  dark: {
    text: Palette.indigo[50],
    background: Palette.indigo[950],
    backgroundElement: Palette.indigo[900],
    backgroundSelected: Palette.indigo[800],
    textSecondary: Palette.indigo[300],
    primary: Palette.violet[600],
    onPrimary: '#ffffff',
    accent: Palette.magenta[400],
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 12,
  md: 20,
  lg: 28,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
