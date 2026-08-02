import { useContext, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing } from "@mytask/theme";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useLocalTrackingLive } from "../hooks/useLocalTrackingLive";
import { useOrgNavigate } from "./useOrgNavigate";
import { elevation, touchTarget, TrackingPinIcon } from "../ui";
import { useEffect } from "react";

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
            style={[styles.pill, { backgroundColor: color }, pillStyle]}
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
 * Centered circular tracking button — overlaps the tab bar slightly.
 */
function TrackingTabButton({
  orgCode,
  active,
}: {
  orgCode: string;
  active: boolean;
}) {
  const c = useThemeStore((s) => s.colors);
  const navigate = useOrgNavigate();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (active) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [active, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.05 }],
  }));

  return (
    <View style={styles.trackSlot} pointerEvents="box-none">
      <Animated.View style={pulseStyle}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open location and time tracking"
          onPress={() => navigate("Tracking", { orgCode })}
          style={({ pressed }) => [
            styles.trackBtn,
            elevation.fab,
            {
              backgroundColor: c.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <TrackingPinIcon color="#FFFFFF" size={28} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

/**
 * Org bottom tab bar with a centered overlapping tracking button.
 */
export function OrgTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const c = useThemeStore((s) => s.colors);
  const orgCode = useOrganisationStore((s) => s.organisation?.code) || "";
  const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const bottomPad = Math.max(insets.bottom, 10);
  const trackingActive = useLocalTrackingLive();

  const mid = Math.floor(state.routes.length / 2);
  const left = state.routes.slice(0, mid);
  const right = state.routes.slice(mid);

  function renderRoute(route: (typeof state.routes)[number], index: number) {
    const focused = state.index === index;
    const { options } = descriptors[route.key];
    const label =
      typeof options.tabBarLabel === "string"
        ? options.tabBarLabel
        : options.title || route.name;
    const color = focused ? c.primary : c.muted;
    const icon = options.tabBarIcon || (() => null);

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
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.shell, { paddingBottom: bottomPad }]}
      onLayout={(e) => {
        onHeightChange?.(e.nativeEvent.layout.height);
      }}
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
        {left.map((route) =>
          renderRoute(route, state.routes.indexOf(route)),
        )}
        <TrackingTabButton orgCode={orgCode} active={trackingActive} />
        {right.map((route) =>
          renderRoute(route, state.routes.indexOf(route)),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    backgroundColor: "transparent",
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
  trackSlot: {
    width: 76,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22,
  },
  trackBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
});
