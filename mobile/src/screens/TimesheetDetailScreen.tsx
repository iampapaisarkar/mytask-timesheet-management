import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSubmitTimesheet, useTimesheet } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import { formatTimesheetLabel, getErrorMessage } from "@mytask/utils";
import type { SheetsStackParamList } from "../navigation/types";
import { FullScreenSheet } from "../components/FullScreenSheet";
import { SkeletonDetail } from "../components/Skeleton";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

type Props = NativeStackScreenProps<SheetsStackParamList, "TimesheetDetail">;

type TimesheetDay = {
  id?: number;
  date?: string;
  day_name?: string;
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
  approval_reason?: string | null;
  reject_reason?: string | null;
  permissions?: { can_submit?: boolean };
};

export function TimesheetDetailScreen({ navigation, route }: Props) {
  const { id, orgCode } = route.params;
  const query = useTimesheet(id);
  const submit = useSubmitTimesheet();
  const toast = useToastStore();
  const c = useThemeStore((s) => s.colors);
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [remarksError, setRemarksError] = useState<string | undefined>();
  const data = query.data as TimesheetDetail | undefined;
  const days = Array.isArray(data?.days) ? data.days : [];
  const canSubmit = Boolean(data?.permissions?.can_submit);
  const existingRemarks =
    (data?.reject_reason || data?.approval_reason || "").trim() || null;
  const existingRemarksLabel = data?.reject_reason
    ? "Reject remarks"
    : "Approval remarks";

  function openSubmitRemarks() {
    setRemarks("");
    setRemarksError(undefined);
    setRemarksOpen(true);
  }

  function closeSubmitRemarks() {
    setRemarksOpen(false);
    setRemarks("");
    setRemarksError(undefined);
  }

  async function confirmSubmit() {
    const trimmed = remarks.trim();
    if (!trimmed) {
      setRemarksError("Remarks are required.");
      return;
    }
    try {
      await submit.mutateAsync({ id, remarks: trimmed });
      toast.success("Submitted", "Timesheet submitted for approval");
      closeSubmitRemarks();
      void query.refetch();
    } catch (err) {
      toast.error("Submit failed", getErrorMessage(err));
    }
  }

  if (query.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <SkeletonDetail />
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
          {formatTimesheetLabel(
            { code: data?.code, id: data?.id ?? id },
            { prefix: true },
          )}
        </Text>
        <Text style={[styles.meta, { color: c.muted }]}>
          {data?.period_range ||
            [data?.period_start_date, data?.period_end_date]
              .filter(Boolean)
              .join(" → ") ||
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
        {existingRemarks && !canSubmit ? (
          <View
            style={[
              styles.remarksBox,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.remarksLabel, { color: c.muted }]}>
              {existingRemarksLabel}
            </Text>
            <Text style={{ color: c.text }}>{existingRemarks}</Text>
          </View>
        ) : null}
        {canSubmit ? (
          <TouchableOpacity
            style={[
              styles.submit,
              { backgroundColor: c.primary, opacity: submit.isPending ? 0.7 : 1 },
            ]}
            disabled={submit.isPending}
            onPress={openSubmitRemarks}
          >
            <Text style={styles.submitText}>Submit for approval</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={days}
        keyExtractor={(item, index) => String(item.id ?? item.date ?? index)}
        showsHorizontalScrollIndicator={false}
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
                mode: "self",
              });
            }}
          >
            <Text style={[styles.dayTitle, { color: c.text }]}>
              {item.date || "—"}
              {item.day_name ? ` · ${item.day_name}` : ""}
            </Text>
            <Text style={{ color: c.muted }}>
              {item.total_hours != null ? `${item.total_hours} hrs` : "—"}
              {item.is_public_holiday ? " · Holiday" : ""}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FullScreenSheet
        open={remarksOpen}
        onClose={closeSubmitRemarks}
        title="Submit for approval"
        footer={
          <View style={styles.footerRow}>
            <TouchableOpacity
              style={[styles.footerBtn, { borderColor: c.border }]}
              onPress={closeSubmitRemarks}
              disabled={submit.isPending}
            >
              <Text style={{ color: c.text, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.footerPrimary,
                {
                  backgroundColor: c.primary,
                  opacity: submit.isPending ? 0.7 : 1,
                },
              ]}
              disabled={submit.isPending}
              onPress={() => void confirmSubmit()}
            >
              <Text style={styles.submitText}>
                {submit.isPending ? "Submitting…" : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        }
      >
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: c.muted, marginBottom: spacing.sm }}>
            Remarks are required before this status change can proceed.
          </Text>
          <Text style={[styles.inputLabel, { color: c.text }]}>Remarks</Text>
          <TextInput
            value={remarks}
            onChangeText={(value) => {
              setRemarks(value);
              if (remarksError) setRemarksError(undefined);
            }}
            placeholder="Enter remarks"
            placeholderTextColor={c.muted}
            multiline
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: remarksError ? "#ef4444" : c.border,
                backgroundColor: c.surface,
              },
            ]}
          />
          {remarksError ? (
            <Text style={styles.errorText}>{remarksError}</Text>
          ) : null}
        </View>
      </FullScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { marginTop: 4, fontSize: 13 },
  status: { marginTop: 8, fontWeight: "700", fontSize: 13 },
  remarksBox: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
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
  inputLabel: { fontWeight: "600", marginBottom: 8 },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  errorText: { color: "#ef4444", marginTop: 8, fontSize: 13 },
  footerRow: { flexDirection: "row", gap: 10 },
  footerBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  footerPrimary: { borderWidth: 0 },
});
