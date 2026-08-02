import { createContext, useCallback, useContext, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { formatTimesheetLabel } from "@mytask/utils";
import { can, getOrganisationAcl } from "@mytask/services";
import { OrgHeader } from "../components/OrgHeader";
import { OrgHomeScreen } from "../features/organisation";
import { TrackingScreen } from "../screens/TrackingScreen";
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
import { LeaveOrganisationProvider } from "./LeaveOrganisationContext";
import { useLeaveOrganisation } from "./LeaveOrganisationContext";
import { OrgTabBar } from "./OrgTabBar";
import {
  orgStackAnimation,
  nativeBackScreenOptions,
  standaloneScreenOptions,
} from "./standaloneOptions";
import type {
  DashboardStackParamList,
  ManageStackParamList,
  MoreStackParamList,
  OrgStackParamList,
  OrgTabParamList,
  RootStackParamList,
  SheetsStackParamList,
} from "./types";

const OrgCodeContext = createContext("");

function useOrgCodeParam() {
  return useContext(OrgCodeContext);
}

const OrgStack = createNativeStackNavigator<OrgStackParamList>();
const Tab = createBottomTabNavigator<OrgTabParamList>();
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
const SheetsStack = createNativeStackNavigator<SheetsStackParamList>();
const ManageStack = createNativeStackNavigator<ManageStackParamList>();
const MoreStackNav = createNativeStackNavigator<MoreStackParamList>();

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
    </MoreStackNav.Navigator>
  );
}

/**
 * Organisation chrome + bottom tabs. Pushed org-stack screens cover this
 * entirely so header and tab bar disappear without display hacks.
 */
function OrgTabsScreen() {
  const orgCode = useOrgCodeParam();
  const leaveOrganisation = useLeaveOrganisation();
  const organisation = useOrganisationStore((s) => s.organisation);
  const c = useThemeStore((s) => s.colors);
  const acl = getOrganisationAcl(organisation?.role || organisation?.role_code);
  const canManage = can(acl, "timesheetManagement", "list");
  const canSheets = can(acl, "timesheet", "list");

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <OrgHeader
        orgCode={orgCode}
        onLeaveOrganisation={leaveOrganisation}
      />
      <View style={styles.tabs}>
        <Tab.Navigator
          tabBar={(props) => <OrgTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: c.bg },
            tabBarStyle: {
              position: "absolute",
              backgroundColor: "transparent",
              borderTopWidth: 0,
              elevation: 0,
            },
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
          {canSheets ? (
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
          ) : null}
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
  );
}

export function OrgNavigator({ navigation, route }: OrgProps) {
  const { orgCode } = route.params;
  const clearOrganisation = useOrganisationStore((s) => s.clear);
  const c = useThemeStore((s) => s.colors);
  const codeValue = useMemo(() => orgCode, [orgCode]);

  const leaveOrganisation = useCallback(() => {
    void (async () => {
      await clearOrganisation();
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    })();
  }, [clearOrganisation, navigation]);

  return (
    <OrgCodeContext.Provider value={codeValue}>
      <LeaveOrganisationProvider value={leaveOrganisation}>
        <OrgStack.Navigator
          screenOptions={{
            contentStyle: { backgroundColor: c.bg },
            headerShown: false,
            headerStyle: { backgroundColor: c.surface },
            headerTintColor: c.text,
            headerTitleStyle: { fontWeight: "700", fontSize: 17 },
            headerShadowVisible: false,
            ...nativeBackScreenOptions,
            animation: orgStackAnimation,
          }}
        >
          <OrgStack.Screen
            name="OrgTabs"
            component={OrgTabsScreen}
            options={{ gestureEnabled: false }}
          />
          <OrgStack.Screen
            name="Tracking"
            component={TrackingScreen}
            options={{
              headerShown: false,
              animation: "slide_from_bottom",
              presentation: "fullScreenModal",
            }}
          />
          <OrgStack.Screen
            name="TimesheetDetail"
            component={TimesheetDetailScreen}
            options={({ route: detailRoute }) =>
              standaloneScreenOptions(
                detailRoute.params.timesheetCode ||
                  formatTimesheetLabel({ id: detailRoute.params.id }),
              )
            }
          />
          <OrgStack.Screen
            name="TimesheetManagementDetail"
            component={TimesheetManagementDetailScreen}
            options={({ route: detailRoute }) =>
              standaloneScreenOptions(
                detailRoute.params.timesheetCode ||
                  formatTimesheetLabel({ id: detailRoute.params.id }),
              )
            }
          />
          <OrgStack.Screen
            name="TimesheetDayDetail"
            component={TimesheetDayDetailScreen}
            options={({ route: dayRoute }) =>
              standaloneScreenOptions(
                dayRoute.params.timesheetCode ||
                  formatTimesheetLabel({
                    id: dayRoute.params.timesheetId,
                  }),
              )
            }
          />
          <OrgStack.Screen
            name="EmployeesList"
            component={EmployeesListScreen}
            options={standaloneScreenOptions("Employees")}
          />
          <OrgStack.Screen
            name="CustomersList"
            component={CustomersListScreen}
            options={standaloneScreenOptions("Customers")}
          />
          <OrgStack.Screen
            name="JobsList"
            component={JobsListScreen}
            options={standaloneScreenOptions("Jobs")}
          />
          <OrgStack.Screen
            name="Reports"
            component={ReportsScreen}
            options={standaloneScreenOptions("Reports")}
          />
          <OrgStack.Screen
            name="Payouts"
            component={PayoutsScreen}
            options={standaloneScreenOptions("Payouts")}
          />
          <OrgStack.Screen
            name="PayoutDetail"
            component={PayoutDetailScreen}
            options={standaloneScreenOptions("Payout detail")}
          />
          <OrgStack.Screen
            name="SystemLogs"
            component={SystemLogsScreen}
            options={standaloneScreenOptions("System logs")}
          />
          <OrgStack.Screen
            name="SettingsHub"
            component={SettingsHubScreen}
            options={standaloneScreenOptions("Settings")}
          />
          <OrgStack.Screen
            name="OrganisationDetails"
            component={OrganisationDetailsScreen}
            options={standaloneScreenOptions("Organisation")}
          />
          <OrgStack.Screen
            name="HolidayCalendars"
            component={HolidayCalendarsScreen}
            options={standaloneScreenOptions("Holiday calendars")}
          />
          <OrgStack.Screen
            name="PayrollCalendars"
            component={PayrollCalendarsScreen}
            options={standaloneScreenOptions("Payroll calendars")}
          />
        </OrgStack.Navigator>
      </LeaveOrganisationProvider>
    </OrgCodeContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flex: 1 },
});
