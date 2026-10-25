import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';

export function ThemedInput({ style, ...rest }: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }, style]}
      {...rest}
    />
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: ReactNode;
};

export function Button({ title, onPress, loading, disabled, variant = 'primary', icon }: ButtonProps) {
  const theme = useTheme();
  const gradients = useGradients();
  const primary = variant === 'primary';
  const fg = primary ? theme.onPrimary : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? theme.primary : theme.backgroundElement },
        (pressed || disabled) && styles.dim,
      ]}>
      {primary && <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} pointerEvents="none" />}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <ThemedText type="smallBold" style={{ color: fg }}>{title}</ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRadius: Radius.md },
  button: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: Radius.md, paddingHorizontal: Spacing.three, overflow: 'hidden' },
  dim: { opacity: 0.6 },
});
