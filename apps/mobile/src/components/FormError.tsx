import { type ClientErrorCode, describeError, serverFieldErrors } from "@finance/api-client";
import { StyleSheet, Text } from "react-native";

import { useAppTheme } from "@/lib/theme";

interface FormErrorProps {
  error: unknown;
  overrides?: Partial<Record<ClientErrorCode, string>>;
}

/**
 * Error of a mutation that does not belong to a single field. Field errors from the server
 * are shown next to their field instead, so they are skipped here.
 */
export function FormError({ error, overrides }: FormErrorProps) {
  const theme = useAppTheme();
  if (!error || Object.keys(serverFieldErrors(error)).length > 0) {
    return null;
  }
  return (
    <Text
      accessibilityRole="alert"
      style={[styles.error, { color: theme.expense, backgroundColor: `${theme.expense}14` }]}
    >
      {describeError(error, overrides)}
    </Text>
  );
}

const styles = StyleSheet.create({
  error: {
    fontSize: 14,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: "hidden",
  },
});
