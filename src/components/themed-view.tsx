import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  /** Fades a faint tint in from the top; meant for full-screen containers. */
  gradient?: boolean;
};

export function ThemedView({ style, lightColor, darkColor, type, gradient, children, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();
  const gradients = useGradients();

  return (
    <View style={[{ backgroundColor: theme[type ?? 'background'] }, style]} {...otherProps}>
      {gradient && (
        <LinearGradient colors={gradients.screen} locations={[0, 0.45]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}
      {children}
    </View>
  );
}

/** Soft top-to-bottom shading behind a card; the parent needs `overflow: 'hidden'` for rounded corners. */
export function CardGradient() {
  const gradients = useGradients();
  return <LinearGradient colors={gradients.card} style={StyleSheet.absoluteFill} pointerEvents="none" />;
}
