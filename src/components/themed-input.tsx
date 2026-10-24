import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
};

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const fg = primary ? theme.background : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? theme.text : theme.backgroundElement },
        (pressed || disabled) && styles.dim,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <ThemedText type="smallBold" style={{ color: fg }}>{title}</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 16, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderRadius: Spacing.three },
  button: { alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: Spacing.three, paddingHorizontal: Spacing.three },
  dim: { opacity: 0.6 },
});
