import type { ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { HomeIcon, ProfileIcon, TabIndicatorDot, elevation } from "../ui";
import { LoginScreen } from "../features/auth";
import { SignupScreen } from "../screens/SignupScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { HomeScreen } from "../features/home";
import { OrgHomeScreen } from "../features/organisation";
import {
  TimesheetListScreen,
  TimesheetDetailScreen,
  TimesheetDayDetailScreen,
} from "../features/timesheet";
import {
  TimesheetManagementListScreen,
  TimesheetManagementDetailScreen,
} from "../features/timesheet-management";
import { EmployeesListScreen } from "../features/employees";
import { CustomersListScreen } from "../features/customers";
import { JobsListScreen } from "../features/jobs";
import { SettingsHubScreen, ProfileScreen } from "../features/settings";
import { OrganisationDetailsScreen } from "../screens/OrganisationDetailsScreen";
import { HolidayCalendarsScreen } from "../screens/HolidayCalendarsScreen";
import { PayrollCalendarsScreen } from "../screens/PayrollCalendarsScreen";
import { NotificationsListScreen } from "../features/notifications";
import { ReportsScreen } from "../screens/ReportsScreen";
import { PayoutsScreen } from "../screens/PayoutsScreen";
import { PayoutDetailScreen } from "../screens/PayoutDetailScreen";
import { SystemLogsScreen } from "../screens/SystemLogsScreen";
import { CreateOrganisationScreen } from "../screens/CreateOrganisationScreen";
import { LegalScreen } from "../screens/LegalScreen";
import { OrgInvitationScreen } from "../screens/OrgInvitationScreen";
import {
  PricingScreen,
  SubscriptionScreen,
  BillingHistoryScreen,
} from "../features/billing";

export type RootStackParamList = {
  Login: { invitationToken?: string } | undefined;
  Signup: { invitationToken?: string } | undefined;
  ForgotPassword: undefined;
  OrgInvitation: { token: string };
  MainTabs: undefined;
  OrgHome: { orgCode: string };
  Timesheets: { orgCode: string };
  TimesheetDetail: { orgCode: string; id: string };
  TimesheetDayDetail: {
    orgCode: string;
    timesheetId: string;
    dayId: string;
    mode?: "self" | "management";
    employeeId?: string;
  };
  TimesheetManagementList: { orgCode: string };
  TimesheetManagementDetail: { orgCode: string; id: string };
  EmployeesList: { orgCode: string };
  CustomersList: { orgCode: string };
  JobsList: { orgCode: string };
  Reports: { orgCode: string };
  Payouts: { orgCode: string };
  PayoutDetail: { orgCode: string; id: string };
  SystemLogs: { orgCode: string };
  NotificationsList: { orgCode: string };
  SettingsHub: { orgCode: string };
  OrganisationDetails: { orgCode: string };
  HolidayCalendars: { orgCode: string };
  PayrollCalendars: { orgCode: string };
  CreateOrganisation: undefined;
  Legal: { kind: "help" | "terms" | "privacy" };
  Pricing: undefined;
  Subscription: undefined;
  BillingHistory: undefined;
};

export type MainTabParamList = {
  Organisations: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const stackAnimation = Platform.select<"default" | "fade_from_bottom" | "slide_from_right">({
  ios: "default",
  android: "slide_from_right",
  default: "default",
});

function MainTabs() {
  const c = useThemeStore((s) => s.colors);
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const tabHeight = 56 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerShadowVisible: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabHeight,
          paddingTop: 8,
          paddingBottom: bottomPad,
          ...elevation.tabBar,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tab.Screen
        name="Organisations"
        component={HomeScreen}
        options={{
          title: "myTask",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused, color }) => (
            <TabIconWrap focused={focused} color={color}>
              <HomeIcon color={color} focused={focused} />
            </TabIconWrap>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIconWrap focused={focused} color={color}>
              <ProfileIcon color={color} focused={focused} />
            </TabIconWrap>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function TabIconWrap({
  children,
  focused,
  color,
}: {
  children: ReactNode;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={{ alignItems: "center", gap: 3 }}>
      {children}
      <TabIndicatorDot color={focused ? color : "transparent"} />
    </View>
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
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerShadowVisible: false,
        headerBackTitle: "",
        contentStyle: { backgroundColor: c.bg },
        animation: stackAnimation,
        animationDuration: Platform.OS === "ios" ? undefined : 280,
      }}
    >
      {!token ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: "Create account" }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: "Reset password" }}
          />
          <Stack.Screen
            name="OrgInvitation"
            component={OrgInvitationScreen}
            options={{ title: "Organisation invitation" }}
          />
          <Stack.Screen
            name="Pricing"
            component={PricingScreen}
            options={{ title: "Pricing" }}
          />
          <Stack.Screen
            name="Legal"
            component={LegalScreen}
            options={({ route }) => ({
              title:
                route.params.kind === "help"
                  ? "Help"
                  : route.params.kind === "terms"
                    ? "Terms"
                    : "Privacy",
            })}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OrgInvitation"
            component={OrgInvitationScreen}
            options={{ title: "Organisation invitation" }}
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
            name="TimesheetManagementDetail"
            component={TimesheetManagementDetailScreen}
            options={{ title: "Manage timesheet" }}
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
            name="Reports"
            component={ReportsScreen}
            options={{ title: "Reports" }}
          />
          <Stack.Screen
            name="Payouts"
            component={PayoutsScreen}
            options={{ title: "Payouts" }}
          />
          <Stack.Screen
            name="PayoutDetail"
            component={PayoutDetailScreen}
            options={{ title: "Payout detail" }}
          />
          <Stack.Screen
            name="SystemLogs"
            component={SystemLogsScreen}
            options={{ title: "System logs" }}
          />
          <Stack.Screen
            name="NotificationsList"
            component={NotificationsListScreen}
            options={{
              title: "Notifications",
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="SettingsHub"
            component={SettingsHubScreen}
            options={{ title: "Settings" }}
          />
          <Stack.Screen
            name="OrganisationDetails"
            component={OrganisationDetailsScreen}
            options={{ title: "Organisation" }}
          />
          <Stack.Screen
            name="HolidayCalendars"
            component={HolidayCalendarsScreen}
            options={{ title: "Holiday calendars" }}
          />
          <Stack.Screen
            name="PayrollCalendars"
            component={PayrollCalendarsScreen}
            options={{ title: "Payroll calendars" }}
          />
          <Stack.Screen
            name="CreateOrganisation"
            component={CreateOrganisationScreen}
            options={{ title: "Create organisation" }}
          />
          <Stack.Screen
            name="Legal"
            component={LegalScreen}
            options={({ route }) => ({
              title:
                route.params.kind === "help"
                  ? "Help"
                  : route.params.kind === "terms"
                    ? "Terms"
                    : "Privacy",
            })}
          />
          <Stack.Screen
            name="Pricing"
            component={PricingScreen}
            options={{ title: "Pricing" }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{ title: "Subscription" }}
          />
          <Stack.Screen
            name="BillingHistory"
            component={BillingHistoryScreen}
            options={{ title: "Billing history" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
