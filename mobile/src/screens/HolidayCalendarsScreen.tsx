import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { holidayCalendarsApi } from "@mytask/api";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { spacing } from "@mytask/theme";
import { listPagination, listRows } from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "HolidayCalendars">;

type HolidayCalendarRow = {
  id?: number | string;
  name?: string;
  code?: string;
  year?: number | string;
  country?: string | null;
  description?: string | null;
};

export function HolidayCalendarsScreen({}: Props) {
  const [page, setPage] = useState(1);
  const c = useThemeStore((s) => s.colors);

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
        pagination?: { total_pages?: number; page_number?: number; total_rows?: number };
        info?: { pagination?: { total_pages?: number; page_number?: number; total_rows?: number } };
      };
      return {
        data: Array.isArray(body.data) ? body.data : [],
        pagination: body.pagination || body.info?.pagination || null,
      };
    },
  });

  const rows = listRows<HolidayCalendarRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

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

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.md }}
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
            <View
              style={[
                styles.card,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <Text style={[styles.name, { color: c.text }]}>
                {item.name || item.code || `Calendar #${item.id}`}
              </Text>
              <Text style={{ color: c.muted }}>
                {[item.year, item.country].filter(Boolean).join(" · ") || "—"}
              </Text>
              {item.description ? (
                <Text style={{ color: c.muted, marginTop: 4 }}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
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
});
