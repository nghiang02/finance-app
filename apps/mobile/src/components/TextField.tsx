import { useState } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";

import { useAppTheme } from "@/lib/theme";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | undefined;
  /** Shown inside the field on the right, e.g. "₫". */
  suffix?: string;
}

/** Filled input: gray background, green border while focused, red when invalid. */
export function TextField({
  label,
  error,
  suffix,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.expense : focused ? theme.brand : "transparent";
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.ink }]}>{label}</Text>
      <View
        style={[
          styles.box,
          { backgroundColor: focused ? theme.surface : theme.field, borderColor },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.ink }, style]}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        {suffix ? <Text style={[styles.suffix, { color: theme.muted }]}>{suffix}</Text> : null}
      </View>
      {error ? <Text style={[styles.error, { color: theme.expense }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
  suffix: { fontSize: 16, fontWeight: "600", marginLeft: 8 },
  error: { fontSize: 13 },
});
