import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";

type Props = {
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Divider({ inset = false, style }: Props) {
  const c = useThemeStore((s) => s.colors);
  return (
    <View
      style={[
        styles.line,
        {
          backgroundColor: c.border,
          marginLeft: inset ? spacing.md : 0,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
});
