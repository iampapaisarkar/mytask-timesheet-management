import { StyleSheet, View } from "react-native";
import { radii } from "@mytask/theme";
import { useThemeStore } from "../../store/themeStore";

type Props = {
  progress: number;
  color?: string;
  height?: number;
  trackColor?: string;
};

export function ProgressBar({
  progress,
  color,
  height = 8,
  trackColor,
}: Props) {
  const c = useThemeStore((s) => s.colors);
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clamped * 100),
      }}
      style={[
        styles.track,
        {
          height,
          backgroundColor: trackColor || c.bgMuted,
          borderRadius: radii.full,
        },
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: "100%",
          backgroundColor: color || c.primary,
          borderRadius: radii.full,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
  },
});
