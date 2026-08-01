import { useEffect, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@mytask/theme";
import { useThemeStore } from "../store/themeStore";
import { elevation, touchTarget } from "../ui";

const SPRING = { damping: 18, stiffness: 220, mass: 0.7 };

function TabItem({
  label,
  focused,
  color,
  onPress,
  onLongPress,
  icon,
}: {
  label: string;
  focused: boolean;
  color: string;
  onPress: () => void;
  onLongPress: () => void;
  icon: (props: {
    color: string;
    focused: boolean;
    size: number;
  }) => ReactNode;
}) {
  const scale = useSharedValue(focused ? 1 : 0.96);
  const lift = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.96, SPRING);
    lift.value = withSpring(focused ? 1 : 0, SPRING);
  }, [focused, lift, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: (1 - lift.value) * 1.5 },
    ],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ scaleX: 0.6 + lift.value * 0.4 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
    >
      <Animated.View style={[styles.itemInner, animStyle]}>
        <View style={styles.iconWrap}>
          {icon({ color, focused, size: 22 })}
          <Animated.View
            style={[
              styles.pill,
              { backgroundColor: color },
              pillStyle,
            ]}
          />
        </View>
        <Text
          style={[
            styles.label,
            {
              color,
              fontWeight: focused ? "700" : "500",
              opacity: focused ? 1 : 0.72,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Premium organisation tab bar — floating surface, spring micro-interactions,
 * pill indicator under the active icon.
 */
export function OrgTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useThemeStore((s) => s.colors);
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <View
      style={[
        styles.shell,
        {
          paddingBottom: bottomPad,
          backgroundColor: c.bg,
        },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: c.surface,
            borderColor: c.border,
          },
          elevation.tabBar,
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title || route.name;
          const color = focused ? c.primary : c.muted;
          const icon =
            options.tabBarIcon ||
            (() => null);

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              label={String(label)}
              focused={focused}
              color={color}
              onPress={onPress}
              onLongPress={onLongPress}
              icon={({ color: iconColor, focused: isFocused, size }) =>
                icon({ focused: isFocused, color: iconColor, size })
              }
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
  },
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
  },
  item: {
    flex: 1,
    minHeight: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  itemInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    width: "100%",
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 28,
  },
  pill: {
    marginTop: 4,
    width: 14,
    height: 3,
    borderRadius: 99,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.15,
  },
});
