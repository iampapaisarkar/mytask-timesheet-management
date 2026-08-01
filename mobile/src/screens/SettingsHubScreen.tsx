import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { radii, spacing } from "@mytask/theme";
import { AccessDenied } from "../components/AccessDenied";
import { useOrgAcl } from "../hooks/useOrgAcl";
import type { OrgStackParamList } from "../navigation/types";
import { useOrgNavigate } from "../navigation/useOrgNavigate";
import { useThemeStore } from "../store/themeStore";
import {
  BuildingIcon,
  ClockIcon,
  EmptyState,
  SettingsIcon,
  ListTile,
} from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "SettingsHub">;

type SettingsRoute =
  | "OrganisationDetails"
  | "HolidayCalendars"
  | "PayrollCalendars";

export function SettingsHubScreen({ route }: Props) {
  const { orgCode } = route.params;
  const navigateOrg = useOrgNavigate();
  const c = useThemeStore((s) => s.colors);
  const { can } = useOrgAcl();

  if (!can("setting", "list")) {
    return <AccessDenied />;
  }

  const links: Array<{
    label: string;
    hint: string;
    route: SettingsRoute;
    icon: (color: string) => ReactNode;
  }> = [
    ...(can("organisationSetting", "view")
      ? [
          {
            label: "Organisation details",
            hint: "Name, code, your role",
            route: "OrganisationDetails" as const,
            icon: (color: string) => <BuildingIcon color={color} size={20} />,
          },
        ]
      : []),
    ...(can("holidayCalendar", "list")
      ? [
          {
            label: "Holiday calendars",
            hint: "Public holidays",
            route: "HolidayCalendars" as const,
            icon: (color: string) => <SettingsIcon color={color} size={20} />,
          },
        ]
      : []),
    ...(can("payrollCalendar", "list")
      ? [
          {
            label: "Payroll calendars",
            hint: "Pay periods",
            route: "PayrollCalendars" as const,
            icon: (color: string) => <ClockIcon color={color} size={20} />,
          },
        ]
      : []),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      {links.length === 0 ? (
        <EmptyState
          icon={<SettingsIcon color={c.primary} size={28} />}
          title="No settings available"
          description="Settings for your role will appear here once granted."
        />
      ) : (
        links.map((item) => (
          <ListTile
            key={item.route}
            title={item.label}
            subtitle={item.hint}
            onPress={() => navigateOrg(item.route, { orgCode })}
            left={
              <View
                style={[styles.iconWrap, { backgroundColor: c.primarySoft }]}
              >
                {item.icon(c.primary)}
              </View>
            }
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
