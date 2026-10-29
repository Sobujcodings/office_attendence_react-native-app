import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

/** Opens the Android clock picker; resolves with the chosen time, or null if dismissed. */
export function pickTime(initial: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'time',
      is24Hour: false,
      onChange: (event, date) => resolve(event.type === 'set' && date ? date : null),
    });
  });
}
