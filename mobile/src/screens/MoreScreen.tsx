import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { can, getOrganisationAcl } from "@mytask/services";
import { radii, spacing } from "@mytask/theme";
import {
  BriefcaseIcon,
  BuildingIcon,
  Button,
  ChartIcon,
  ListTile,
  LogIcon,
  ScreenHeader,
  SectionHeader,
  SettingsIcon,
  UsersIcon,
  WalletIcon,
} from "../ui";
import type { MoreStackParamList, OrgStackParamList } from "../navigation/types";
import { useLeaveOrganisation } from "../navigation/LeaveOrganisationContext";
import { useOrgNavigate } from "../navigation/useOrgNavigate";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<MoreStackParamList, "MoreHome">;

type MoreDestination = Exclude<
  keyof OrgStackParamList,
  | "OrgTabs"
  | "TimesheetDayDetail"
  | "PayoutDetail"
  | "OrganisationDetails"
  | "HolidayCalendars"
  | "PayrollCalendars"
>;

type MoreItem = {
  label: string;
  hint: string;
  route: MoreDestination;
  group: "Management" | "Business" | "Settings";
  icon: (color: string) => ReactNode;
};

export function MoreScreen({ route }: Props) {
  const { orgCode } = route.params;
  const navigateOrg = useOrgNavigate();
  const leaveOrganisation = useLeaveOrganisation();
  const organisation = useOrganisationStore((s) => s.organisation);
  const c = useThemeStore((s) => s.colors);
  const acl = getOrganisationAcl(organisation?.role || organisation?.role_code);

  const items: MoreItem[] = [
    ...(can(acl, "employee", "list")
      ? [
          {
            label: "Employees",
            hint: "Team members and invitations",
            route: "EmployeesList" as const,
            group: "Management" as const,
            icon: (color: string) => <UsersIcon color={color} size={20} />,
          },
        ]
      : []),
    ...(can(acl, "customer", "list")
      ? [
          {
            label: "Customers",
            hint: "Client directory",
            route: "CustomersList" as const,
            group: "Management" as const,
            icon: (color: string) => <BuildingIcon color={color} size={20} />,
          },
        ]
      : []),
    ...(can(acl, "job", "list")
      ? [
          {
            label: "Jobs",
            hint: "Work sites and jobs",
            route: "JobsList" as const,
            group: "Management" as const,
            icon: (color: string) => <BriefcaseIcon color={color} size={20} />,
          },
        ]
      : []),
    ...(can(acl, "report", "view")
      ? [
          {
            label: "Reports",
            hint: "Pay reports and PDF",
            route: "Reports" as const,
            group: "Business" as const,
            icon: (color: string) => <ChartIcon color={color} size={20} />,
          },
        ]
      : []),
    ...(can(acl, "payout", "list")
      ? [
          {
            label: "Payouts",
            hint: "Payroll payouts",
            route: "Payouts" as const,
            group: "Business" as const,
            icon: (color: string) => <WalletIcon color={color} size={20} />,
          },
        ]
      : []),
    ...(can(acl, "systemLog", "list")
      ? [
          {
            label: "System logs",
            hint: "Audit trail",
            route: "SystemLogs" as const,
            group: "Settings" as const,
            icon: (color: string) => <LogIcon color={color} size={20} />,
          },
        ]
      : []),
    ...(can(acl, "setting", "list")
      ? [
          {
            label: "Settings",
            hint: "Organisation configuration",
            route: "SettingsHub" as const,
            group: "Settings" as const,
            icon: (color: string) => <SettingsIcon color={color} size={20} />,
          },
        ]
      : []),
  ];

  const groups = (["Management", "Business", "Settings"] as const).filter(
    (g) => items.some((i) => i.group === g),
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="More"
        subtitle="Organisation tools and settings"
      />

      {groups.map((group) => (
        <View key={group} style={styles.group}>
          <SectionHeader title={group} />
          {items
            .filter((item) => item.group === group)
            .map((item) => (
              <ListTile
                key={item.route}
                title={item.label}
                subtitle={item.hint}
                onPress={() => navigateOrg(item.route, { orgCode })}
                left={
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: c.primarySoft },
                    ]}
                  >
                    {item.icon(c.primary)}
                  </View>
                }
              />
            ))}
        </View>
      ))}

      <View style={styles.leaveWrap}>
        <Button
          title="Back to myTask"
          variant="outline"
          onPress={leaveOrganisation}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  group: { marginBottom: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveWrap: { marginTop: spacing.md },
});
