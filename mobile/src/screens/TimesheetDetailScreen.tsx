import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSubmitTimesheet, useTimesheet } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

type Props = NativeStackScreenProps<RootStackParamList, "TimesheetDetail">;

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
  status?: { name?: string; code?: string };
  total_hours?: number | string;
  is_public_holiday?: boolean;
};

type TimesheetDetail = {
  id?: number;
  code?: string;
  period_range?: string;
  period_start_date?: string;
  period_end_date?: string;
  status?: { name?: string; code?: string };
  job?: { id?: number; name?: string } | null;
  jobs?: Array<{ id?: number; name?: string }> | null;
  days?: TimesheetDay[];
  permissions?: { can_submit?: boolean };
};

export function TimesheetDetailScreen({ navigation, route }: Props) {
  const { id, orgCode } = route.params;
  const query = useTimesheet(id);
  const submit = useSubmitTimesheet();
  const toast = useToastStore();
  const c = useThemeStore((s) => s.colors);
  const data = query.data as TimesheetDetail | undefined;
  const days = Array.isArray(data?.days) ? data.days : [];
  const canSubmit = Boolean(data?.permissions?.can_submit);

  async function handleSubmit() {
    try {
      await submit.mutateAsync(id);
      toast.success("Submitted", "Timesheet submitted for approval");
      void query.refetch();
    } catch (err) {
      toast.error("Submit failed", getErrorMessage(err));
    }
  }

  if (query.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load timesheet</Text>
        <TouchableOpacity onPress={() => void query.refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>
          Timesheet #{data?.id ?? id}
        </Text>
        <Text style={[styles.meta, { color: c.muted }]}>
          {data?.period_range ||
            [data?.period_start_date, data?.period_end_date]
              .filter(Boolean)
              .join(" → ") ||
            data?.code ||
            "—"}
          {Array.isArray(data?.jobs) && data.jobs.length
            ? ` · ${data.jobs.map((j) => j.name).filter(Boolean).join(", ")}`
            : data?.job?.name
              ? ` · ${data.job.name}`
              : ""}
        </Text>
        <Text style={[styles.status, { color: c.primary }]}>
          {data?.status?.name || data?.status?.code || "—"}
        </Text>
        {canSubmit ? (
          <TouchableOpacity
            style={[
              styles.submit,
              { backgroundColor: c.primary, opacity: submit.isPending ? 0.7 : 1 },
            ]}
            disabled={submit.isPending}
            onPress={() => void handleSubmit()}
          >
            <Text style={styles.submitText}>
              {submit.isPending ? "Submitting…" : "Submit for approval"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={days}
        keyExtractor={(item, index) => String(item.id ?? item.date ?? index)}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        ListHeaderComponent={
          <Text style={[styles.section, { color: c.text }]}>Days</Text>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.muted }]}>
            No days on this timesheet
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
            disabled={item.id == null}
            onPress={() => {
              if (item.id == null) return;
              navigation.navigate("TimesheetDayDetail", {
                orgCode,
                timesheetId: id,
                dayId: String(item.id),
              });
            }}
          >
            <Text style={[styles.dayTitle, { color: c.text }]}>
              {item.date || "—"}
              {item.day_name ? ` · ${item.day_name}` : ""}
            </Text>
            <Text style={{ color: c.muted }}>
              {item.total_hours != null ? `${item.total_hours} hrs` : "—"} ·{" "}
              {item.status?.name || item.status?.code || "—"}
              {item.is_public_holiday ? " · Holiday" : ""}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { marginTop: 4, fontSize: 13 },
  status: { marginTop: 8, fontWeight: "700", fontSize: 13 },
  submit: {
    marginTop: spacing.md,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "700" },
  section: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  dayTitle: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 24 },
  link: { fontWeight: "700", marginTop: 8 },
});
