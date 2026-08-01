import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = {
  color: string;
  size?: number;
  focused?: boolean;
};

export function HomeIcon({ color, size = 24, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={color}
        strokeWidth={focused ? 2.2 : 1.8}
        strokeLinejoin="round"
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.15 : 0}
      />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 24, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={12}
        cy={8}
        r={3.25}
        stroke={color}
        strokeWidth={focused ? 2.2 : 1.8}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.15 : 0}
      />
      <Path
        d="M5.5 19.5c1.6-3.2 4-4.8 6.5-4.8s4.9 1.6 6.5 4.8"
        stroke={color}
        strokeWidth={focused ? 2.2 : 1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TabIndicatorDot({ color, size = 4 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={color} />
    </Svg>
  );
}

export function CloseIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6 6 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ChevronIcon({ color, size = 18 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlusIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Decorative spacer for layouts that expect a square icon slot. */
export function IconSlot({ size = 24 }: { size?: number }) {
  return <Rect width={size} height={size} fill="transparent" />;
}
