import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { LoginScreen } from "../features/auth";
import { HomeScreen } from "../features/home";
import { OrgHomeScreen } from "../features/organisation";
import {
  TimesheetListScreen,
  TimesheetDetailScreen,
  TimesheetDayDetailScreen,
} from "../features/timesheet";
import { TimesheetManagementListScreen } from "../features/timesheet-management";
import { EmployeesListScreen } from "../features/employees";
import { CustomersListScreen } from "../features/customers";
import { JobsListScreen } from "../features/jobs";
import { SettingsHubScreen, ProfileScreen } from "../features/settings";
import { NotificationsListScreen } from "../features/notifications";

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  OrgHome: { orgCode: string };
  Timesheets: { orgCode: string };
  TimesheetDetail: { orgCode: string; id: string };
  TimesheetDayDetail: {
    orgCode: string;
    timesheetId: string;
    dayId: string;
  };
  TimesheetManagementList: { orgCode: string };
  EmployeesList: { orgCode: string };
  CustomersList: { orgCode: string };
  JobsList: { orgCode: string };
  NotificationsList: { orgCode: string };
  SettingsHub: { orgCode: string };
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
          <Stack.Screen
            name="TimesheetDetail"
            component={TimesheetDetailScreen}
            options={{ title: "Timesheet" }}
          />
          <Stack.Screen
            name="TimesheetDayDetail"
            component={TimesheetDayDetailScreen}
            options={{
              title: "Day detail",
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="TimesheetManagementList"
            component={TimesheetManagementListScreen}
            options={{ title: "Timesheet management" }}
          />
          <Stack.Screen
            name="EmployeesList"
            component={EmployeesListScreen}
            options={{ title: "Employees" }}
          />
          <Stack.Screen
            name="CustomersList"
            component={CustomersListScreen}
            options={{ title: "Customers" }}
          />
          <Stack.Screen
            name="JobsList"
            component={JobsListScreen}
            options={{ title: "Jobs" }}
          />
          <Stack.Screen
            name="NotificationsList"
            component={NotificationsListScreen}
            options={{
              title: "Notifications",
              presentation: "fullScreenModal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="SettingsHub"
            component={SettingsHubScreen}
            options={{ title: "Settings" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
