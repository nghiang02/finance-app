import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/lib/theme";

interface PickerSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Bottom sheet built on React Native's Modal: slides up over the form, closes on the
 * backdrop or the system back button. Used to keep long choices (categories, wallets)
 * out of the form until they are needed.
 */
export function PickerSheet({ visible, title, onClose, children }: PickerSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.surface, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.line }]} />
          <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>
          <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { maxHeight: "80%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 8 },
  handle: { alignSelf: "center", width: 40, height: 5, borderRadius: 999, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  content: { paddingHorizontal: 8, paddingBottom: 8 },
});
