import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutDown,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { useToastStore, type ToastItem, type ToastTone } from "../store/toastStore";
import { useThemeStore, type AppColors } from "../store/themeStore";
import { elevation } from "../ui/tokens";

const TONE: Record<ToastTone, string> = {
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#04B6B1",
};

function SOFT_TONE(c: AppColors): Record<ToastTone, string> {
  return {
    success: c.positiveSoft,
    error: c.negativeSoft,
    warning: c.warningSoft,
    info: c.primarySoft,
  };
}

function ToastIcon({ tone, color }: { tone: ToastTone; color: string }) {
  if (tone === "success") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
        <Path
          d="M8 12.5l2.5 2.5L16 9.5"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (tone === "error") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
        <Path
          d="M9 9l6 6M15 9l-6 6"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (tone === "warning") {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 4l9 16H3L12 4Z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <Path d="M12 10v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Circle cx={12} cy={17} r={1} fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M12 11v5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={12} cy={8} r={1} fill={color} />
    </Svg>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const c = useThemeStore((s) => s.colors);
  const accent = TONE[item.tone];
  const soft = SOFT_TONE(c)[item.tone];

  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), 3400);
    return () => clearTimeout(t);
  }, [item.id, onDismiss]);

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(18).stiffness(220)}
      exiting={FadeOutDown.duration(180)}
      layout={Layout.springify()}
    >
      <Pressable
        onPress={() => onDismiss(item.id)}
        accessibilityRole="alert"
        style={[
          styles.toast,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
          },
          elevation.raised,
        ]}
      >
        <View style={[styles.icon, { backgroundColor: soft }]}>
          <ToastIcon tone={item.tone} color={accent} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
          {item.description ? (
            <Text style={[styles.desc, { color: c.muted }]}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  if (!items.length) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 88 }]}
    >
      {items.slice(-3).map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 200,
    gap: 10,
  },
  toast: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    padding: 10,
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
  },
  title: { fontSize: 14, fontWeight: "700" },
  desc: { marginTop: 3, fontSize: 12, lineHeight: 16 },
});
