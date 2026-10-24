<<<<<<< HEAD
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
=======
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useGradients, useTheme } from '@/hooks/use-theme';
>>>>>>> 938030ce76af7488d5631a2b159fce0342938d0b

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
<<<<<<< HEAD
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <ThemedText type="smallBold" style={{ color: fg }}>{title}</ThemedText>
        </>
      )}
=======
      {primary && <LinearGradient colors={gradients.primary} style={StyleSheet.absoluteFill} pointerEvents="none" />}
      {loading ? <ActivityIndicator color={fg} /> : <ThemedText type="smallBold" style={{ color: fg }}>{title}</ThemedText>}
>>>>>>> 938030ce76af7488d5631a2b159fce0342938d0b
    </Pressable>
  );
}

const styles = StyleSheet.create({
<<<<<<< HEAD
  input: { fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRadius: Radius.md },
  button: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: Radius.md, paddingHorizontal: Spacing.three },
=======
  input: { fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRadius: Spacing.three },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: Spacing.three, paddingHorizontal: Spacing.three, overflow: 'hidden' },
>>>>>>> 938030ce76af7488d5631a2b159fce0342938d0b
  dim: { opacity: 0.6 },
});
