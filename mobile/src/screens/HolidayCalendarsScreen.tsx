import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { holidayCalendarsApi } from "@mytask/api";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import { getErrorMessage, listPagination, listRows } from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { AppBottomSheet, BottomSheetTextInput } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "HolidayCalendars">;

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
  const canCreate = can(acl, "holidayCalendar", "create");
  const canEdit = can(acl, "holidayCalendar", "edit");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["holiday-calendars", page] as const,
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

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load holiday calendars</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
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
      {canCreate ? (
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: c.primary }]}
          onPress={openCreate}
        >
          <Text style={styles.createBtnText}>Create holiday</Text>
        </TouchableOpacity>
      ) : null}
      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{
            padding: spacing.md,
            paddingTop: canCreate ? 0 : spacing.md,
          }}
          data={rows}
          keyExtractor={(item, index) => String(item.id ?? index)}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.muted }]}>
              No holiday calendars found
            </Text>
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
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
              disabled={!canEdit}
              onPress={() => openEdit(item)}
            >
              <Text style={[styles.name, { color: c.text }]}>
                {item.name || `Holiday #${item.id}`}
              </Text>
              <Text style={{ color: c.muted }}>
                {item.date ? String(item.date).slice(0, 10) : "—"}
              </Text>
              {canEdit ? (
                <Text style={{ color: c.primary, marginTop: 8, fontWeight: "600" }}>
                  Edit
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}

      <AppBottomSheet
        ref={sheetRef}
        title={editing ? "Edit holiday" : "Create holiday"}
        snapPoints={["45%", "70%"]}
        footer={
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: c.primary, opacity: pending ? 0.6 : 1 },
            ]}
            disabled={pending}
            onPress={handleSave}
          >
            <Text style={styles.createBtnText}>
              {pending ? "Saving…" : editing ? "Save" : "Create"}
            </Text>
          </TouchableOpacity>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  name: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
  createBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "700" },
  fieldLabel: {
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
});
