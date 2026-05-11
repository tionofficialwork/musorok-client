import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

const PHONE_MASK = "+7 (___) ___-__-__";
const PHONE_DIGIT_SLOTS = new Set([4, 5, 6, 9, 10, 11, 13, 14, 16, 17]);

export function getRussianPhoneNationalDigits(value: string) {
  const trimmed = value.trim();
  const digits = value.replace(/\D/g, "");

  if (trimmed.startsWith("+7")) {
    return digits.slice(1, 11);
  }

  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return digits.slice(1, 11);
  }

  return digits.slice(0, 10);
}

type RussianPhoneInputProps = {
  digits: string;
  onChangeDigits: (digits: string) => void;
  editable?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  focusedContainerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  placeholderTextStyle?: StyleProp<TextStyle>;
  textContentType?: TextInputProps["textContentType"];
};

export default function RussianPhoneInput({
  digits,
  onChangeDigits,
  editable = true,
  containerStyle,
  focusedContainerStyle,
  textStyle,
  placeholderTextStyle,
  textContentType = "telephoneNumber",
}: RussianPhoneInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const cleanDigits = useMemo(
    () => getRussianPhoneNationalDigits(digits),
    [digits]
  );

  const handleChangeText = useCallback(
    (value: string) => {
      onChangeDigits(getRussianPhoneNationalDigits(value));
    },
    [onChangeDigits]
  );

  const handlePress = useCallback(() => {
    if (editable) {
      inputRef.current?.focus();
    }
  }, [editable]);

  let digitIndex = 0;

  return (
    <Pressable
      onPress={handlePress}
      disabled={!editable}
      style={[
        styles.container,
        containerStyle,
        isFocused && focusedContainerStyle,
        !editable && styles.disabled,
      ]}
    >
      <Text
        numberOfLines={1}
        allowFontScaling={false}
        style={[styles.displayText, textStyle]}
      >
        {PHONE_MASK.split("").map((maskChar, index) => {
          if (!PHONE_DIGIT_SLOTS.has(index)) {
            return <Text key={index}>{maskChar}</Text>;
          }

          const digit = cleanDigits[digitIndex];
          digitIndex += 1;

          return (
            <Text
              key={index}
              style={!digit ? [styles.placeholderText, placeholderTextStyle] : null}
            >
              {digit || "_"}
            </Text>
          );
        })}
      </Text>

      <TextInput
        ref={inputRef}
        value={cleanDigits}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        keyboardType="phone-pad"
        textContentType={textContentType}
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        caretHidden
        selection={{ start: cleanDigits.length, end: cleanDigits.length }}
        selectionColor="transparent"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.6,
  },
  displayText: {
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
  placeholderText: {
    opacity: 0.35,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: "transparent",
    backgroundColor: "transparent",
    opacity: 0.01,
    fontSize: 1,
  },
});
