import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToastStore } from "../store/toastStore";
import { useThemeStore } from "../store/themeStore";

const TONE: Record<string, string> = {
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
};

export function ToastViewport() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  const c = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();

  if (!items.length) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + 72 }]}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => dismiss(item.id)}
          style={[
            styles.toast,
            {
              backgroundColor: c.surface,
              borderColor: TONE[item.tone],
            },
          ]}
        >
          <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
          {item.description ? (
            <Text style={[styles.desc, { color: c.muted }]}>
              {item.description}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 100,
    gap: 8,
  },
  toast: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: { fontSize: 14, fontWeight: "700" },
  desc: { marginTop: 4, fontSize: 12 },
});
