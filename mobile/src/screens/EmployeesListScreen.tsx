import { useEffect, useRef, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useEmployees, useInviteEmployee } from "@mytask/hooks";
import { DEFAULT_LIST_PAGE_SIZE } from "@mytask/constants";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import {
  formatPhoneDisplay,
  getErrorMessage,
  listPagination,
  listRows,
} from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import { EmployeeFormSheet } from "../components/EmployeeFormSheet";
import { ListPager } from "../components/ListPager";
import { SearchBar } from "../components/SearchBar";
import { SkeletonList } from "../components/Skeleton";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { triggerHaptic } from "../utils/haptics";
import {
  Avatar,
  Button,
  Card,
  ChevronIcon,
  EmptyState,
  ErrorState,
  StatusBadge,
  UsersIcon,
} from "../ui";

type EmployeeRow = {
  id?: number | string;
  details?: {
    id?: number | string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    dob?: string;
    phone_number?: string;
    phone_country_iso?: string;
    preferred_name?: string;
    middle_name?: string;
    is_you?: boolean;
    role?: { id?: number | string; name?: string; code?: string };
    address?: {
      formatted_address?: string;
      address_1?: string;
      address_line_1?: string;
      city?: string;
    };
  };
  invitation?: { status?: { code?: string } | string | null } | null;
  role?: { code?: string } | null;
  wage?: {
    start_date?: string;
    employment_type?: { id?: number | string; code?: string; name?: string };
    payroll_calendar?: { id?: number | string; name?: string };
    pay_type?: string;
    currency?: string;
    hourly_rate_exc_super?: string | number | null;
    fixed_rate_exc_super?: string | number | null;
  } | null;
  payroll?: {
    payment_method?: string;
    account_holder_name?: string;
    bank_name?: string;
    bank_account_number?: string;
    ifsc_code?: string;
    swift_code?: string;
  } | null;
};

function employeeId(row: EmployeeRow) {
  return row.details?.id ?? row.id ?? null;
}

function invitationStatusCode(row: EmployeeRow) {
  const nested = (
    row.details as { invitation?: { status?: { code?: string } } } | undefined
  )?.invitation?.status?.code;
  if (nested) return nested;
  const status = row.invitation?.status;
  if (typeof status === "string") return status;
  return status?.code;
}

function employeeRoleCode(row: EmployeeRow) {
  return (
    row.details?.role?.code ||
    row.role?.code
  );
}

function shouldShowInvite(row: EmployeeRow): boolean {
  if (row.details?.is_you) return false;
  if (employeeRoleCode(row) === "owner") return false;
  if (invitationStatusCode(row) === "accept") return false;
  return true;
}

function addressLabel(details: EmployeeRow["details"]) {
  const a = details?.address;
  if (!a) return "";
  return (
    a.formatted_address ||
    [a.address_line_1 || a.address_1, a.city].filter(Boolean).join(", ")
  );
}

export function EmployeesListScreen() {
  const organisation = useOrganisationStore((s) => s.organisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canList = can(acl, "employee", "list");
  const canCreate = can(acl, "employee", "create");
  const canEdit = can(acl, "employee", "edit");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const sheetRef = useRef<BottomSheetModal>(null);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const inviteMutation = useInviteEmployee();
  const [invitingId, setInvitingId] = useState<string | number | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading, isError, isFetching, refetch } = useEmployees(
    {
      rows_per_page: DEFAULT_LIST_PAGE_SIZE,
      page_number: page,
      sort_by: "id",
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    },
    canList,
  );
  const rows = listRows<EmployeeRow>(data);
  const pagination = listPagination(data);
  const totalPages = Math.max(1, Number(pagination?.total_pages) || 1);
  const currentPage = Number(pagination?.page_number) || page;

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
    sheetRef.current?.present();
  }

  function openEdit(row: EmployeeRow) {
    if (!canEdit || employeeId(row) == null) return;
    setEditing(row);
    setSheetOpen(true);
    sheetRef.current?.present();
  }

  if (!canList) {
    return <AccessDenied />;
  }

  if (isError && !data) {
    return (
      <View style={[styles.flex, { backgroundColor: c.bg }]}>
        <ErrorState
          title="Failed to load employees"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={styles.header}>
        <Text style={[styles.pageSub, { color: c.muted }]}>
          Team members in this organisation
        </Text>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, email, or address"
        />
        {canCreate ? (
          <Button title="Create employee" onPress={openCreate} size="md" />
        ) : null}
      </View>

      {isLoading && !data ? (
        <SkeletonList rows={6} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={rows}
          keyExtractor={(item, index) =>
            String(item.details?.id ?? item.id ?? index)
          }
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
              icon={<UsersIcon color={c.primary} size={28} />}
              title={
                debouncedSearch ? "No employees match your search" : "No employees yet"
              }
              description={
                debouncedSearch
                  ? "Try a different search."
                  : "Employees added to this organisation will appear here."
              }
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
          renderItem={({ item }) => {
            const details = item.details;
            const address = addressLabel(details);
            const name = details?.full_name || `Employee #${details?.id ?? item.id}`;
            const id = employeeId(item);
            const showInvite = shouldShowInvite(item) && id != null;
            return (
              <Card
                style={styles.card}
                onPress={canEdit ? () => openEdit(item) : undefined}
                accessibilityLabel={name}
              >
                <View style={styles.row}>
                  <Avatar name={name} size={44} />
                  <View style={styles.textCol}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <StatusBadge status="active" label="Active" />
                    </View>
                    <Text style={{ color: c.muted }} numberOfLines={1}>
                      {details?.email || "—"}
                      {details?.role?.name ? ` · ${details.role.name}` : ""}
                    </Text>
                    {details?.phone_number ? (
                      <Text style={[styles.meta, { color: c.muted }]} numberOfLines={1}>
                        {formatPhoneDisplay(
                          details.phone_number,
                          details.phone_country_iso,
                        )}
                      </Text>
                    ) : null}
                    {address ? (
                      <Text
                        style={[styles.meta, { color: c.muted }]}
                        numberOfLines={2}
                      >
                        {address}
                      </Text>
                    ) : null}
                    {showInvite ? (
                      <Button
                        title="Invite"
                        variant="soft"
                        size="sm"
                        fullWidth={false}
                        style={styles.inviteBtn}
                        loading={invitingId === id && inviteMutation.isPending}
                        onPress={() => {
                          if (id == null) return;
                          setInvitingId(id);
                          void inviteMutation
                            .mutateAsync(id)
                            .then(() => toast.success("Invitation sent"))
                            .catch((err) =>
                              toast.error("Invite failed", getErrorMessage(err)),
                            )
                            .finally(() => setInvitingId(null));
                        }}
                      />
                    ) : null}
                  </View>
                  {canEdit ? <ChevronIcon color={c.subtle} /> : null}
                </View>
              </Card>
            );
          }}
        />
      )}

      <EmployeeFormSheet
        sheetRef={sheetRef}
        employee={editing as Parameters<typeof EmployeeFormSheet>[0]["employee"]}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pageSub: { fontSize: 13, marginBottom: 8 },
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
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  textCol: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 2,
  },
  name: {
    flex: 1,
    fontSize: typography.sizes.md,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  meta: { marginTop: 4, fontSize: typography.sizes.xs },
  inviteBtn: { alignSelf: "flex-start", marginTop: spacing.sm },
});
