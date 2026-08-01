import { createContext, useContext, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { can, getOrganisationAcl } from "@mytask/services";
import { OrgHeader } from "../components/OrgHeader";
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
import { SettingsHubScreen } from "../features/settings";
import { OrganisationDetailsScreen } from "../screens/OrganisationDetailsScreen";
import { HolidayCalendarsScreen } from "../screens/HolidayCalendarsScreen";
import { PayrollCalendarsScreen } from "../screens/PayrollCalendarsScreen";
import { ReportsScreen } from "../screens/ReportsScreen";
import { PayoutsScreen } from "../screens/PayoutsScreen";
import { PayoutDetailScreen } from "../screens/PayoutDetailScreen";
import { SystemLogsScreen } from "../screens/SystemLogsScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { HomeIcon, ManageIcon, MoreIcon, SheetsIcon } from "../ui";
import { OrgTabBar } from "./OrgTabBar";
import type {
  DashboardStackParamList,
  ManageStackParamList,
  MoreStackParamList,
  OrgTabParamList,
  RootStackParamList,
  SheetsStackParamList,
} from "./types";

const OrgCodeContext = createContext("");

function useOrgCodeParam() {
  return useContext(OrgCodeContext);
}

const Tab = createBottomTabNavigator<OrgTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const SheetsStack = createNativeStackNavigator<SheetsStackParamList>();
const ManageStack = createNativeStackNavigator<ManageStackParamList>();
const MoreStackNav = createNativeStackNavigator<MoreStackParamList>();

const stackAnimation = Platform.select<
  "default" | "slide_from_right" | "fade_from_bottom"
>({
  ios: "default",
  android: "slide_from_right",
  default: "default",
});

const detailScreenOptions = {
  headerShown: true as const,
  gestureEnabled: true,
  fullScreenGestureEnabled: false,
  animation: stackAnimation,
  headerBackTitle: "",
};

const rootTabScreenOptions = {
  headerShown: false as const,
  gestureEnabled: false,
  fullScreenGestureEnabled: false,
  animation: "fade" as const,
};

type OrgProps = NativeStackScreenProps<RootStackParamList, "Organisation">;

function useOrgStackTheme() {
  const c = useThemeStore((s) => s.colors);
  return {
    headerStyle: { backgroundColor: c.surface },
    headerTintColor: c.text,
    headerTitleStyle: { fontWeight: "700" as const, fontSize: 17 },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: c.bg },
  };
}

function DashboardStackScreen() {
  const orgCode = useOrgCodeParam();
  const theme = useOrgStackTheme();
  return (
    <DashboardStack.Navigator
      screenOptions={{ ...theme, ...rootTabScreenOptions }}
    >
      <DashboardStack.Screen
        name="OrgDashboard"
        component={OrgHomeScreen}
        initialParams={{ orgCode }}
      />
    </DashboardStack.Navigator>
  );
}

function SheetsStackScreen() {
  const orgCode = useOrgCodeParam();
  const theme = useOrgStackTheme();
  return (
    <SheetsStack.Navigator screenOptions={{ ...theme, ...rootTabScreenOptions }}>
      <SheetsStack.Screen
        name="TimesheetList"
        component={TimesheetListScreen}
        initialParams={{ orgCode }}
      />
      <SheetsStack.Screen
        name="TimesheetDetail"
        component={TimesheetDetailScreen}
        options={{ ...detailScreenOptions, title: "Timesheet" }}
      />
      <SheetsStack.Screen
        name="TimesheetDayDetail"
        component={TimesheetDayDetailScreen}
        options={{
          ...detailScreenOptions,
          title: "Day detail",
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </SheetsStack.Navigator>
  );
}

function ManageStackScreen() {
  const orgCode = useOrgCodeParam();
  const theme = useOrgStackTheme();
  return (
    <ManageStack.Navigator screenOptions={{ ...theme, ...rootTabScreenOptions }}>
      <ManageStack.Screen
        name="TimesheetManagementList"
        component={TimesheetManagementListScreen}
        initialParams={{ orgCode }}
      />
      <ManageStack.Screen
        name="TimesheetManagementDetail"
        component={TimesheetManagementDetailScreen}
        options={{ ...detailScreenOptions, title: "Manage timesheet" }}
      />
      <ManageStack.Screen
        name="TimesheetDayDetail"
        component={TimesheetDayDetailScreen}
        options={{
          ...detailScreenOptions,
          title: "Day detail",
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
          headerShown: false,
          gestureEnabled: true,
        }}
      />
    </ManageStack.Navigator>
  );
}

function MoreStackScreen() {
  const orgCode = useOrgCodeParam();
  const theme = useOrgStackTheme();
  return (
    <MoreStackNav.Navigator
      screenOptions={{ ...theme, ...rootTabScreenOptions }}
    >
      <MoreStackNav.Screen
        name="MoreHome"
        component={MoreScreen}
        initialParams={{ orgCode }}
      />
      <MoreStackNav.Screen
        name="EmployeesList"
        component={EmployeesListScreen}
        options={{ ...detailScreenOptions, title: "Employees" }}
      />
      <MoreStackNav.Screen
        name="CustomersList"
        component={CustomersListScreen}
        options={{ ...detailScreenOptions, title: "Customers" }}
      />
      <MoreStackNav.Screen
        name="JobsList"
        component={JobsListScreen}
        options={{ ...detailScreenOptions, title: "Jobs" }}
      />
      <MoreStackNav.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ ...detailScreenOptions, title: "Reports" }}
      />
      <MoreStackNav.Screen
        name="Payouts"
        component={PayoutsScreen}
        options={{ ...detailScreenOptions, title: "Payouts" }}
      />
      <MoreStackNav.Screen
        name="PayoutDetail"
        component={PayoutDetailScreen}
        options={{ ...detailScreenOptions, title: "Payout detail" }}
      />
      <MoreStackNav.Screen
        name="SystemLogs"
        component={SystemLogsScreen}
        options={{ ...detailScreenOptions, title: "System logs" }}
      />
      <MoreStackNav.Screen
        name="SettingsHub"
        component={SettingsHubScreen}
        options={{ ...detailScreenOptions, title: "Settings" }}
      />
      <MoreStackNav.Screen
        name="OrganisationDetails"
        component={OrganisationDetailsScreen}
        options={{ ...detailScreenOptions, title: "Organisation" }}
      />
      <MoreStackNav.Screen
        name="HolidayCalendars"
        component={HolidayCalendarsScreen}
        options={{ ...detailScreenOptions, title: "Holiday calendars" }}
      />
      <MoreStackNav.Screen
        name="PayrollCalendars"
        component={PayrollCalendarsScreen}
        options={{ ...detailScreenOptions, title: "Payroll calendars" }}
      />
    </MoreStackNav.Navigator>
  );
}

export function OrgNavigator({ navigation, route }: OrgProps) {
  const { orgCode } = route.params;
  const organisation = useOrganisationStore((s) => s.organisation);
  const clearOrganisation = useOrganisationStore((s) => s.clear);
  const c = useThemeStore((s) => s.colors);
  const acl = getOrganisationAcl(organisation?.role || organisation?.role_code);
  const canManage = can(acl, "timesheetManagement", "list");
  const codeValue = useMemo(() => orgCode, [orgCode]);

  async function leaveOrganisation() {
    await clearOrganisation();
    navigation.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  }

  return (
    <OrgCodeContext.Provider value={codeValue}>
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <OrgHeader
          orgCode={orgCode}
          onLeaveOrganisation={() => void leaveOrganisation()}
        />
        <View style={styles.tabs}>
          <Tab.Navigator
            tabBar={(props) => <OrgTabBar {...props} />}
            screenOptions={{
              headerShown: false,
              sceneStyle: { backgroundColor: c.bg },
            }}
          >
            <Tab.Screen
              name="Dashboard"
              component={DashboardStackScreen}
              options={{
                title: "Home",
                tabBarLabel: "Home",
                tabBarIcon: ({ color, focused, size }) => (
                  <HomeIcon color={color} focused={focused} size={size} />
                ),
              }}
            />
            <Tab.Screen
              name="Sheets"
              component={SheetsStackScreen}
              options={{
                title: "Sheets",
                tabBarLabel: "Sheets",
                tabBarIcon: ({ color, focused, size }) => (
                  <SheetsIcon color={color} focused={focused} size={size} />
                ),
              }}
            />
            {canManage ? (
              <Tab.Screen
                name="Manage"
                component={ManageStackScreen}
                options={{
                  title: "Manage",
                  tabBarLabel: "Manage",
                  tabBarIcon: ({ color, focused, size }) => (
                    <ManageIcon color={color} focused={focused} size={size} />
                  ),
                }}
              />
            ) : null}
            <Tab.Screen
              name="More"
              component={MoreStackScreen}
              options={{
                title: "More",
                tabBarLabel: "More",
                tabBarIcon: ({ color, focused, size }) => (
                  <MoreIcon color={color} focused={focused} size={size} />
                ),
              }}
            />
          </Tab.Navigator>
        </View>
      </View>
    </OrgCodeContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flex: 1 },
});
