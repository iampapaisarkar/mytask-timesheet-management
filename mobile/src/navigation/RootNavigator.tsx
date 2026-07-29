import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { OrgHomeScreen } from "../screens/OrgHomeScreen";
import { TimesheetListScreen } from "../screens/TimesheetListScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  OrgHome: { orgCode: string };
  Timesheets: { orgCode: string };
};

export type MainTabParamList = {
  Organisations: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, focused, color }: { label: string; focused: boolean; color: string }) {
  return (
    <Text style={{ color, fontSize: focused ? 12 : 11, fontWeight: focused ? "700" : "500" }}>
      {label === "Organisations" ? "⌂" : "◉"}
    </Text>
  );
}

function MainTabs() {
  const c = useThemeStore((s) => s.colors);

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Organisations"
        component={HomeScreen}
        options={{
          title: "myTask",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Organisations" focused={focused} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon label="Profile" focused={focused} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  const c = useThemeStore((s) => s.colors);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: c.bg },
        animation: "fade_from_bottom",
      }}
    >
      {!token ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrgHome"
            component={OrgHomeScreen}
            options={{ title: "Dashboard" }}
          />
          <Stack.Screen
            name="Timesheets"
            component={TimesheetListScreen}
            options={{ title: "My Timesheets" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
