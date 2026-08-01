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
import { usePayouts } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE, formatMoney } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import { listPagination, listRows } from "@mytask/utils";
import { ListPager } from "../components/ListPager";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";

type Props = NativeStackScreenProps<RootStackParamList, "Payouts">;

type PayoutRow = {
  id?: number | string;
  payout_number?: string | null;
  amount?: number | string | null;
  net_amount?: number | string | null;
  currency?: string | null;
  status?: string;
  period_start_date?: string | null;
  period_end_date?: string | null;
  employee?: {
    id?: number;
    details?: { full_name?: string };
    user?: { full_name?: string };
  };
};

function employeeName(row: PayoutRow) {
  return (
    row.employee?.details?.full_name ||
    row.employee?.user?.full_name ||
    (row.employee?.id != null ? `#${row.employee.id}` : "—")
  );
}

export function PayoutsScreen({}: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "payout", "list");
  const [page, setPage] = useState(1);
  const c = useThemeStore((s) => s.colors);

  const { data, isLoading, isError, isFetching, refetch } = usePayouts(
    {
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
    },
    canList,
  );
  const rows = listRows<PayoutRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  if (!canList) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>
          You do not have permission to view payouts.
        </Text>
      </View>
    );
  }

  if (isError && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load payouts</Text>
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
              No payouts found
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
            const amount = item.net_amount ?? item.amount;
            return (
              <View
                style={[
                  styles.card,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Text style={[styles.id, { color: c.text }]}>
                  {item.payout_number ||
                    (item.id != null ? `Payout #${item.id}` : "Payout")}
                </Text>
                <Text style={{ color: c.muted }}>{employeeName(item)}</Text>
                <Text style={{ color: c.text, marginTop: 4, fontWeight: "600" }}>
                  {amount != null
                    ? formatMoney(Number(amount), item.currency || "AUD")
                    : "—"}
                </Text>
                <Text style={{ color: c.muted, marginTop: 2 }}>
                  {item.status || "—"}
                  {item.period_start_date && item.period_end_date
                    ? ` · ${item.period_start_date} → ${item.period_end_date}`
                    : ""}
                </Text>
              </View>
            );
          }}
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
  id: { fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
});
