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

type SimpleIcon = { color: string; size?: number };

export function UsersIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3} stroke={color} strokeWidth={1.9} />
      <Path
        d="M3.5 18.5c1.2-2.6 3.2-3.9 5.5-3.9s4.3 1.3 5.5 3.9"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
      <Circle cx={17} cy={8.5} r={2.4} stroke={color} strokeWidth={1.8} />
      <Path
        d="M15.2 14.2c1.7-.3 3.2.4 4.3 2.3"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BriefcaseIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3.5}
        y={7}
        width={17}
        height={12}
        rx={2}
        stroke={color}
        strokeWidth={1.9}
      />
      <Path
        d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7"
        stroke={color}
        strokeWidth={1.9}
      />
      <Path d="M3.5 12h17" stroke={color} strokeWidth={1.9} />
    </Svg>
  );
}

export function BuildingIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 20.5V6.5A1.5 1.5 0 0 1 6 5h8a1.5 1.5 0 0 1 1.5 1.5v14"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <Path
        d="M15.5 10.5H18a1.5 1.5 0 0 1 1.5 1.5v8.5"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <Path
        d="M8 9h2.5M8 12.5h2.5M8 16h2.5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ChartIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 19.5h15"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
      <Path
        d="M7 16V11M12 16V7.5M17 16v-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function WalletIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-9Z"
        stroke={color}
        strokeWidth={1.9}
      />
      <Path
        d="M20 12.5h-3.2a1.8 1.8 0 0 0 0 3.6H20"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SettingsIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.9} />
      <Path
        d="M12 3.8v1.8M12 18.4v1.8M4.8 7.2l1.5 1M17.7 15.8l1.5 1M4.8 16.8l1.5-1M17.7 8.2l1.5-1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LogIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4.5h8.5L18.5 7.5V19a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 19V6A1.5 1.5 0 0 1 7 4.5Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 10.5h7M8.5 14h5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ClockIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.9} />
      <Path
        d="M12 8v4.5l3 2"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckCircleIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={color} strokeWidth={1.9} />
      <Path
        d="M8.5 12.2 11 14.7 15.5 9.8"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function AlertIcon({ color, size = 22 }: SimpleIcon) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4.5 20 19H4L12 4.5Z"
        stroke={color}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <Path
        d="M12 10v4M12 16.5v.5"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}
