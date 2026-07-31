import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCustomers, useJobs } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { spacing } from "@mytask/theme";
import { listPagination, listRows } from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import { SearchBar } from "../components/SearchBar";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "JobsList">;

type JobRow = {
  id?: number | string;
  name?: string;
  details?: { id?: number; name?: string };
  customer?: { id?: number; name?: string } | null;
  site_contact_name?: string;
};

type CustomerRow = {
  id?: number | string;
  name?: string;
};

export function JobsListScreen(_props: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [filterOpen, setFilterOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const c = useThemeStore((s) => s.colors);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, customerId]);

  const customersQuery = useCustomers({ rows_per_page: 200, sort_by: "name" });
  const customers = listRows<CustomerRow>(customersQuery.data);
  const selectedCustomer = useMemo(
    () => customers.find((x) => String(x.id) === customerId),
    [customers, customerId],
  );

  const { data, isLoading, isError, isFetching, refetch } = useJobs({
    rows_per_page: DEFAULT_LIST_PAGE_SIZE,
    page_number: page,
    sort_by: "id",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(customerId ? { customer_id: customerId } : {}),
  });
  const rows = listRows<JobRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load jobs</Text>
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
          placeholder="Search by job name"
        />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              { borderColor: c.border, backgroundColor: c.surface },
            ]}
            onPress={() => setFilterOpen(true)}
          >
            <Text style={{ color: c.text, fontWeight: "600" }} numberOfLines={1}>
              {selectedCustomer?.name
                ? `Customer: ${selectedCustomer.name}`
                : "Filter by customer"}
            </Text>
          </TouchableOpacity>
          {customerId ? (
            <TouchableOpacity
              onPress={() => setCustomerId("")}
              style={styles.clearBtn}
            >
              <Text style={{ color: c.primary, fontWeight: "700" }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      {isLoading && !data ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
          data={rows}
          keyExtractor={(item, index) =>
            String(item.details?.id ?? item.id ?? index)
          }
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.muted }]}>
              {debouncedSearch || customerId
                ? "No jobs match your filters"
                : "No jobs"}
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
          renderItem={({ item }) => {
            const name = item.details?.name || item.name || `Job #${item.id}`;
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Text style={[styles.name, { color: c.text }]}>{name}</Text>
                <Text style={{ color: c.muted }}>
                  {item.customer?.name || "No customer"}
                  {item.site_contact_name
                    ? ` · ${item.site_contact_name}`
                    : ""}
                </Text>
              </View>
            );
          }}
        />
      )}

      <Modal
        visible={filterOpen}
        animationType="slide"
        onRequestClose={() => setFilterOpen(false)}
      >
        <View style={[styles.modal, { backgroundColor: c.bg }]}>
          <Text style={[styles.modalTitle, { color: c.text }]}>
            Filter by customer
          </Text>
          <ScrollView>
            <Pressable
              style={[
                styles.option,
                {
                  borderColor: !customerId ? c.primary : c.border,
                  backgroundColor: c.surface,
                },
              ]}
              onPress={() => {
                setCustomerId("");
                setFilterOpen(false);
              }}
            >
              <Text style={{ color: c.text, fontWeight: "600" }}>
                All customers
              </Text>
            </Pressable>
            {customers.map((cust) => {
              const id = String(cust.id);
              const selected = customerId === id;
              return (
                <Pressable
                  key={id}
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? c.primary : c.border,
                      backgroundColor: c.surface,
                    },
                  ]}
                  onPress={() => {
                    setCustomerId(id);
                    setFilterOpen(false);
                  }}
                >
                  <Text style={{ color: c.text }}>
                    {cust.name || `Customer #${cust.id}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: c.primary }]}
            onPress={() => setFilterOpen(false)}
          >
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  clearBtn: { paddingHorizontal: 8, paddingVertical: 8 },
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
  modal: { flex: 1, padding: spacing.lg, paddingTop: 56 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: spacing.md },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  doneBtn: {
    marginTop: spacing.md,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneText: { color: "#fff", fontWeight: "700" },
});
