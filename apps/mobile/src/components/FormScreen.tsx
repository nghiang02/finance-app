import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";

import { useAppTheme } from "@/lib/theme";

/** Scrollable form on the app background that moves above the keyboard on iOS. */
export function FormScreen({ children }: { children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.surface }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: 20, padding: 20, paddingBottom: 40 },
});
