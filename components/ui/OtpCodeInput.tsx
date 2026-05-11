import {
  useCallback,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

type OtpCodeInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  editable?: boolean;
  onFocus?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  focusedContainerStyle?: StyleProp<ViewStyle>;
  slotStyle?: StyleProp<TextStyle>;
  activeSlotStyle?: StyleProp<TextStyle>;
  textStyle?: StyleProp<TextStyle>;
  placeholderTextStyle?: StyleProp<TextStyle>;
};

export default function OtpCodeInput({
  value,
  onChangeText,
  length = 6,
  editable = true,
  onFocus,
  containerStyle,
  focusedContainerStyle,
  slotStyle,
  activeSlotStyle,
  textStyle,
  placeholderTextStyle,
}: OtpCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const cleanValue = value.replace(/\D/g, "").slice(0, length);
  const activeIndex = Math.min(cleanValue.length, length - 1);

  const handlePress = useCallback(() => {
    if (editable) {
      inputRef.current?.focus();
    }
  }, [editable]);

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
      {Array.from({ length }).map((_, index) => {
        const digit = cleanValue[index];
        const isActive = isFocused && index === activeIndex && cleanValue.length < length;

        return (
          <Text
            key={index}
            allowFontScaling={false}
            style={[
              styles.slot,
              slotStyle,
              isActive && activeSlotStyle,
              digit ? textStyle : [textStyle, styles.placeholder, placeholderTextStyle],
            ]}
          >
            {digit || "0"}
          </Text>
        );
      })}

      <TextInput
        ref={inputRef}
        value={cleanValue}
        onChangeText={(nextValue) =>
          onChangeText(nextValue.replace(/\D/g, "").slice(0, length))
        }
        onFocus={() => {
          setIsFocused(true);
          onFocus?.();
        }}
        onBlur={() => setIsFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        maxLength={length}
        caretHidden
        selection={{ start: cleanValue.length, end: cleanValue.length }}
        selectionColor="transparent"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  disabled: {
    opacity: 0.6,
  },
  slot: {
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    includeFontPadding: false,
  },
  placeholder: {
    opacity: 0.4,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: "transparent",
    backgroundColor: "transparent",
    opacity: 0.01,
    fontSize: 1,
  },
});
