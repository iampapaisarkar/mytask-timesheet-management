import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { holidayCalendarsApi } from "@mytask/api";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { ListPager } from "../components/ListPager";
import { SkeletonList } from "../components/Skeleton";
import type { MoreStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import {
  AppBottomSheet,
  BottomSheetTextInput,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  ScreenHeader,
  SheetsIcon,
} from "../ui";

type Props = NativeStackScreenProps<MoreStackParamList, "HolidayCalendars">;

type HolidayCalendarRow = {
  id?: number | string;
  name?: string;
  date?: string;
};

export function HolidayCalendarsScreen({}: Props) {
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [editing, setEditing] = useState<HolidayCalendarRow | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const qc = useQueryClient();
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "holidayCalendar", "list");
  const canCreate = can(acl, "holidayCalendar", "create");
  const canEdit = can(acl, "holidayCalendar", "edit");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["holiday-calendars", page] as const,
    enabled: canList,
    queryFn: async ({ signal }) => {
      const res = await holidayCalendarsApi.list(
        {
          rows_per_page: DEFAULT_LIST_PAGE_SIZE,
          page_number: page,
          sort_by: "id",
        },
        { signal },
      );
      const body = res.data as {
        data?: HolidayCalendarRow[];
        pagination?: {
          total_pages?: number;
          page_number?: number;
          total_rows?: number;
        };
        info?: {
          pagination?: {
            total_pages?: number;
            page_number?: number;
            total_rows?: number;
          };
        };
      };
      return {
        data: Array.isArray(body.data) ? body.data : [],
        pagination: body.pagination || body.info?.pagination || null,
      };
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; date: string }) => {
      if (editing?.id != null) {
        await holidayCalendarsApi.update(editing.id, payload);
      } else {
        await holidayCalendarsApi.create(payload);
      }
    },
    onSuccess: async () => {
      toast.success(editing ? "Holiday updated" : "Holiday created");
      sheetRef.current?.dismiss();
      await qc.invalidateQueries({ queryKey: ["holiday-calendars"] });
    },
    onError: (err) => {
      toast.error("Save failed", getErrorMessage(err));
    },
  });

  const rows = listRows<HolidayCalendarRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  const openCreate = useCallback(() => {
    setEditing(null);
    setName("");
    setDate("");
    sheetRef.current?.present();
  }, []);

  const openEdit = useCallback((row: HolidayCalendarRow) => {
    if (!canEdit) return;
    setEditing(row);
    setName(String(row.name || ""));
    setDate(String(row.date || "").slice(0, 10));
    sheetRef.current?.present();
  }, [canEdit]);

  function handleSave() {
    if (!name.trim() || !date.trim()) {
      toast.warning("Name and date are required");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      toast.warning("Date must be YYYY-MM-DD");
      return;
    }
    saveMutation.mutate({ name: name.trim(), date: date.trim() });
  }

  if (!canList) {
    return <AccessDenied />;
  }

  if (isError && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load holiday calendars"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const pending = saveMutation.isPending;
  const inputStyle = [
    styles.input,
    { borderColor: c.border, backgroundColor: c.bg, color: c.text },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <ScreenHeader
          title="Holiday calendars"
          subtitle="Public holidays observed by your organisation"
        />
        {canCreate ? (
          <Button title="Create holiday" onPress={openCreate} size="md" />
        ) : null}
      </View>
      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={rows}
          keyExtractor={(item, index) => String(item.id ?? index)}
          showsHorizontalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => {
                void triggerHaptic("light");
                void refetch();
              }}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<SheetsIcon color={c.primary} size={28} />}
              title="No holiday calendars found"
            />
          }
          ListFooterComponent={
            <ListPager
              currentPage={currentPage}
              totalPages={totalPages}
              isFetching={isFetching}
              hasRows={Boolean(rows.length || Number(pagination?.total_rows))}
              onPrev={() => setPage(Math.max(1, currentPage - 1))}
              onNext={() => setPage(Math.min(totalPages, currentPage + 1))}
            />
          }
          renderItem={({ item }) => (
            <Card
              style={styles.card}
              onPress={canEdit ? () => openEdit(item) : undefined}
              accessibilityLabel={item.name || `Holiday #${item.id}`}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardTextCol}>
                  <Text style={[styles.name, { color: c.text }]}>
                    {item.name || `Holiday #${item.id}`}
                  </Text>
                  <Text style={{ color: c.muted, marginTop: 2 }}>
                    {item.date ? String(item.date).slice(0, 10) : "—"}
                  </Text>
                </View>
                {canEdit ? <ChevronIcon color={c.subtle} /> : null}
              </View>
            </Card>
          )}
        />
      )}

      <AppBottomSheet
        ref={sheetRef}
        title={editing ? "Edit holiday" : "Create holiday"}
        snapPoints={["45%", "70%"]}
        footer={
          <Button
            title={pending ? "Saving…" : editing ? "Save" : "Create"}
            onPress={handleSave}
            loading={pending}
          />
        }
      >
        <Text style={[styles.fieldLabel, { color: c.muted }]}>Name *</Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={name}
          onChangeText={setName}
          placeholderTextColor={c.muted}
          autoCapitalize="words"
        />
        <Text style={[styles.fieldLabel, { color: c.muted }]}>
          Date (YYYY-MM-DD) *
        </Text>
        <BottomSheetTextInput
          style={inputStyle}
          value={date}
          onChangeText={setDate}
          placeholder="2026-12-25"
          placeholderTextColor={c.muted}
          autoCapitalize="none"
        />
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  list: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  card: { marginBottom: spacing.sm },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTextCol: { flex: 1, minWidth: 0 },
  name: { fontWeight: "700", fontSize: typography.sizes.md },
  fieldLabel: {
    fontWeight: "700",
    fontSize: 12,
    marginBottom: 6,
    marginTop: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
});
