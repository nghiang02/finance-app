import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { Icon, ICONS } from "@/components/Icon";
import { PickerSheet } from "@/components/PickerSheet";
import { PrimaryButton } from "@/components/PrimaryButton";
import { FieldRow } from "@/components/transactions/FieldRow";
import { formatDateTime } from "@/lib/format";
import { useAppTheme } from "@/lib/theme";

interface DateTimeFieldProps {
  /** ISO instant. */
  value: string;
  onChange: (iso: string) => void;
  timeZone: string;
  error?: string | undefined;
  separated?: boolean;
}

/**
 * Date and time of the transaction with the platform's own picker
 * (@react-native-community/datetimepicker, included in Expo Go):
 * - Android: the system date dialog, then the time dialog.
 * - iOS: an inline calendar with a time row, in a bottom sheet.
 * The picker works in the phone's time zone; the label uses the user's time zone
 * (the same for almost everyone: Asia/Ho_Chi_Minh).
 */
export function DateTimeField({ value, onChange, timeZone, error, separated }: DateTimeFieldProps) {
  const theme = useAppTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date(value));

  function openAndroid() {
    const current = new Date(value);
    DateTimePickerAndroid.open({
      value: current,
      mode: "date",
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        if (event.type !== "set" || !date) {
          return;
        }
        // Keep the chosen day, then ask for the time on that day.
        DateTimePickerAndroid.open({
          value: date,
          mode: "time",
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, time?: Date) => {
            onChange((timeEvent.type === "set" && time ? time : date).toISOString());
          },
        });
      },
    });
  }

  function open() {
    if (Platform.OS === "android") {
      openAndroid();
    } else {
      setDraft(new Date(value));
      setIosOpen(true);
    }
  }

  return (
    <>
      <FieldRow
        label="Ngày giờ"
        value={formatDateTime(value, timeZone)}
        placeholder="Chọn ngày giờ"
        leading={<Icon name={ICONS.calendar} size={22} color={theme.brand} />}
        onPress={open}
        error={error}
        separated={separated}
      />
      {Platform.OS === "ios" ? (
        <PickerSheet visible={iosOpen} title="Ngày giờ" onClose={() => setIosOpen(false)}>
          <View style={styles.ios}>
            <DateTimePicker
              value={draft}
              mode="datetime"
              display="inline"
              locale="vi-VN"
              accentColor={theme.brand}
              themeVariant={theme.dark ? "dark" : "light"}
              onChange={(_event: DateTimePickerEvent, date?: Date) => {
                if (date) {
                  setDraft(date);
                }
              }}
            />
            <PrimaryButton
              title="Xong"
              onPress={() => {
                onChange(draft.toISOString());
                setIosOpen(false);
              }}
            />
          </View>
        </PickerSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  ios: { gap: 12, paddingHorizontal: 8 },
});
