import { useEffect, useState } from "react";
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
import { useCustomers } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { spacing } from "@mytask/theme";
import { listPagination, listRows } from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import { SearchBar } from "../components/SearchBar";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "CustomersList">;

type CustomerRow = {
  id?: number | string;
  name?: string;
  contact_email?: string;
  contact_phone_number?: string;
  abn?: string;
};

export function CustomersListScreen(_props: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const c = useThemeStore((s) => s.colors);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching, refetch } = useCustomers({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  });
  const rows = listRows<CustomerRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load customers</Text>
        <TouchableOpacity onPress={() => void refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or email"
        />
      </View>
      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
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
              {debouncedSearch
                ? "No customers match your search"
                : "No customers"}
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
                {item.name || `Customer #${item.id}`}
              </Text>
              <Text style={{ color: c.muted }}>
                {item.contact_email || "—"}
              </Text>
              {item.abn ? (
                <Text style={[styles.meta, { color: c.muted }]}>ABN {item.abn}</Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  name: { fontWeight: "700", marginBottom: 4 },
  meta: { marginTop: 4, fontSize: 12 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
});
