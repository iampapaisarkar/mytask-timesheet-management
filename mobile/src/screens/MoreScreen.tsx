import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import type { MoreStackParamList, RootStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<MoreStackParamList, "MoreHome">;

type MoreRoute = Exclude<keyof MoreStackParamList, "MoreHome">;

type MoreItem = {
  label: string;
  hint: string;
  route: MoreRoute;
  group: "Management" | "Business" | "Settings";
  icon: (color: string) => ReactNode;
};

export function MoreScreen({ navigation, route }: Props) {
  const { orgCode } = route.params;
  const rootNav =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const organisation = useOrganisationStore((s) => s.organisation);
  const clear = useOrganisationStore((s) => s.clear);
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

  async function leaveOrganisation() {
    await clear();
    rootNav.reset({
      index: 0,
      routes: [{ name: "Home" }],
    });
  }

  function navigateTo(itemRoute: MoreRoute) {
    switch (itemRoute) {
      case "EmployeesList":
        navigation.navigate("EmployeesList", { orgCode });
        break;
      case "CustomersList":
        navigation.navigate("CustomersList", { orgCode });
        break;
      case "JobsList":
        navigation.navigate("JobsList", { orgCode });
        break;
      case "Reports":
        navigation.navigate("Reports", { orgCode });
        break;
      case "Payouts":
        navigation.navigate("Payouts", { orgCode });
        break;
      case "SystemLogs":
        navigation.navigate("SystemLogs", { orgCode });
        break;
      case "SettingsHub":
        navigation.navigate("SettingsHub", { orgCode });
        break;
      default:
        break;
    }
  }

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
                onPress={() => navigateTo(item.route)}
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
          onPress={() => void leaveOrganisation()}
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
