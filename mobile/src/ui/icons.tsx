import Svg, { Circle, Path, Rect } from "react-native-svg";

type IconProps = {
  color: string;
  size?: number;
  focused?: boolean;
};

function stroke(focused?: boolean) {
  return focused ? 2.15 : 1.75;
}

export function HomeIcon({ color, size = 24, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={color}
        strokeWidth={stroke(focused)}
        strokeLinejoin="round"
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.14 : 0}
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
        strokeWidth={stroke(focused)}
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.14 : 0}
      />
      <Path
        d="M5.5 19.5c1.6-3.2 4-4.8 6.5-4.8s4.9 1.6 6.5 4.8"
        stroke={color}
        strokeWidth={stroke(focused)}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SheetsIcon({ color, size = 24, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 3.75h7.5L19 8.25V19.5A1.75 1.75 0 0 1 17.25 21.25H7A1.75 1.75 0 0 1 5.25 19.5V5.5A1.75 1.75 0 0 1 7 3.75Z"
        stroke={color}
        strokeWidth={stroke(focused)}
        strokeLinejoin="round"
        fill={focused ? color : "none"}
        fillOpacity={focused ? 0.12 : 0}
      />
      <Path
        d="M14.25 3.75V8.5H19"
        stroke={color}
        strokeWidth={stroke(focused)}
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 12.25h7M8.5 15.75h5"
        stroke={color}
        strokeWidth={stroke(focused)}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ManageIcon({ color, size = 24, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.25 6.5h11.5M8.25 12h11.5M8.25 17.5h11.5"
        stroke={color}
        strokeWidth={stroke(focused)}
        strokeLinecap="round"
      />
      <Circle
        cx={5}
        cy={6.5}
        r={1.35}
        fill={focused ? color : "none"}
        stroke={color}
        strokeWidth={stroke(focused)}
      />
      <Circle
        cx={5}
        cy={12}
        r={1.35}
        fill={focused ? color : "none"}
        stroke={color}
        strokeWidth={stroke(focused)}
      />
      <Circle
        cx={5}
        cy={17.5}
        r={1.35}
        fill={focused ? color : "none"}
        stroke={color}
        strokeWidth={stroke(focused)}
      />
    </Svg>
  );
}

export function MoreIcon({ color, size = 24, focused }: IconProps) {
  const r = focused ? 2.15 : 1.9;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={7} cy={7} r={r} fill={color} fillOpacity={focused ? 1 : 0.85} />
      <Circle cx={17} cy={7} r={r} fill={color} fillOpacity={focused ? 1 : 0.85} />
      <Circle cx={7} cy={17} r={r} fill={color} fillOpacity={focused ? 1 : 0.85} />
      <Circle cx={17} cy={17} r={r} fill={color} fillOpacity={focused ? 1 : 0.85} />
    </Svg>
  );
}

export function BellIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.2 1.5 5.5 1.5 5.5H5s1.5-1.3 1.5-5.5Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <Path
        d="M10 18.25a2 2 0 0 0 4 0"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SunIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3.6} stroke={color} strokeWidth={1.9} />
      <Path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MoonIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.5 3.8A8.6 8.6 0 1 0 20.2 14 7 7 0 0 1 16.5 3.8Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TabIndicatorDot({
  color,
  size = 4,
}: {
  color: string;
  size?: number;
}) {
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

export function ChevronIcon({
  color,
  size = 18,
}: {
  color: string;
  size?: number;
}) {
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
