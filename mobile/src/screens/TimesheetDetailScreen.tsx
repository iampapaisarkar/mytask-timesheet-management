import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSubmitTimesheet, useTimesheet } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import { formatTimesheetLabel, getErrorMessage } from "@mytask/utils";
import type { OrgStackParamList } from "../navigation/types";
import { useOrgNavigate } from "../navigation/useOrgNavigate";
import { AccessDenied } from "../components/AccessDenied";
import { FullScreenSheet } from "../components/FullScreenSheet";
import { SkeletonDetail } from "../components/Skeleton";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  BriefcaseIcon,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  SheetsIcon,
  StatusBadge,
  TextField,
} from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "TimesheetDetail">;

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
  const { id, orgCode, timesheetCode: codeParam } = route.params;
  const navigateOrg = useOrgNavigate();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canView = can(acl, "timesheet", "view");
  const query = useTimesheet(id, canView);
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

  const headerCode =
    formatTimesheetLabel(
      { code: data?.code, id: data?.id ?? id },
      { prefix: true },
    ) ||
    codeParam ||
    formatTimesheetLabel({ id });

  useEffect(() => {
    navigation.setOptions({ title: headerCode });
  }, [headerCode, navigation]);

  const jobsLabel =
    Array.isArray(data?.jobs) && data.jobs.length
      ? data.jobs.map((j) => j.name).filter(Boolean).join(", ")
      : data?.job?.name || "";

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

  if (!canView) {
    return <AccessDenied />;
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
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load timesheet"
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <Text style={[styles.pageSub, { color: c.muted }]}>
          {data?.period_range ||
            [data?.period_start_date, data?.period_end_date]
              .filter(Boolean)
              .join(" → ") ||
            "—"}
        </Text>

        <View style={styles.metaRow}>
          <StatusBadge status={data?.status} size="md" />
          {jobsLabel ? (
            <View style={styles.jobRow}>
              <BriefcaseIcon color={c.subtle} size={14} />
              <Text style={[styles.jobText, { color: c.muted }]} numberOfLines={1}>
                {jobsLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {existingRemarks && !canSubmit ? (
          <Card style={styles.remarksCard}>
            <Text style={[styles.remarksLabel, { color: c.muted }]}>
              {existingRemarksLabel}
            </Text>
            <Text style={{ color: c.text }}>{existingRemarks}</Text>
          </Card>
        ) : null}

        {canSubmit ? (
          <View style={styles.submitWrap}>
            <Button
              title="Submit for approval"
              onPress={openSubmitRemarks}
              loading={submit.isPending}
            />
          </View>
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
          <EmptyState
            icon={<SheetsIcon color={c.primary} size={28} />}
            title="No days on this timesheet"
          />
        }
        renderItem={({ item }) => (
          <Card
            style={styles.dayCard}
            onPress={
              item.id == null
                ? undefined
                : () => {
                    navigateOrg("TimesheetDayDetail", {
                      orgCode,
                      timesheetId: id,
                      dayId: String(item.id),
                      mode: "self",
                      timesheetCode: formatTimesheetLabel({
                        code: data?.code,
                        id: data?.id ?? id,
                      }),
                    });
                  }
            }
            accessibilityLabel={`Day ${item.date || ""}`}
          >
            <View style={styles.dayRow}>
              <View style={styles.dayTextCol}>
                <Text style={[styles.dayTitle, { color: c.text }]}>
                  {item.date || "—"}
                  {item.day_name ? ` · ${item.day_name}` : ""}
                </Text>
                <Text style={{ color: c.muted, marginTop: 2 }}>
                  {item.total_hours != null ? `${item.total_hours} hrs` : "—"}
                  {item.is_public_holiday ? " · Holiday" : ""}
                </Text>
              </View>
              {item.id != null ? (
                <ChevronIcon color={c.subtle} />
              ) : null}
            </View>
          </Card>
        )}
      />

      <FullScreenSheet
        open={remarksOpen}
        onClose={closeSubmitRemarks}
        title="Submit for approval"
        footer={
          <View style={styles.footerRow}>
            <View style={styles.footerHalf}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={closeSubmitRemarks}
                disabled={submit.isPending}
              />
            </View>
            <View style={styles.footerHalf}>
              <Button
                title={submit.isPending ? "Submitting…" : "Submit"}
                onPress={() => void confirmSubmit()}
                loading={submit.isPending}
              />
            </View>
          </View>
        }
      >
        <View style={{ padding: spacing.lg }}>
          <Text style={{ color: c.muted, marginBottom: spacing.md }}>
            Remarks are required before this status change can proceed.
          </Text>
          <TextField
            label="Remarks"
            value={remarks}
            onChangeText={(value) => {
              setRemarks(value);
              if (remarksError) setRemarksError(undefined);
            }}
            placeholder="Enter remarks"
            multiline
            numberOfLines={5}
            style={styles.textArea}
            error={remarksError}
          />
        </View>
      </FullScreenSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  pageSub: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: 4,
  },
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  jobText: {
    fontSize: typography.sizes.sm,
    fontWeight: "500",
  },
  remarksCard: {
    marginTop: spacing.md,
  },
  remarksLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  submitWrap: { marginTop: spacing.md },
  section: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  dayCard: { marginBottom: spacing.sm },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  dayTextCol: { flex: 1, minWidth: 0 },
  dayTitle: { fontWeight: "700" },
  footerRow: { flexDirection: "row", gap: spacing.sm },
  footerHalf: { flex: 1 },
  textArea: { minHeight: 120, textAlignVertical: "top", paddingTop: 12 },
});
