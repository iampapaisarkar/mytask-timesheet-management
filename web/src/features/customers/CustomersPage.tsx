import { useState } from "react";
import { useCustomers } from "@mytask/hooks";
import { can, getOrganisationAcl } from "@mytask/services";
import { formatPhoneDisplay } from "@mytask/utils";
import { Button } from "@/components/ui/Button";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { useOrganisationStore } from "@/store/organisationStore";
import {
  CustomerFormDialog,
  type CustomerRow,
} from "./CreateCustomerDialog";

export function CustomersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const role = useOrganisationStore((s) => s.organisation?.role);
  const acl = getOrganisationAcl(role);
  const canCreate = can(acl, "customer", "create");
  const canEdit = can(acl, "customer", "edit");
  const query = useCustomers({ rows_per_page: 50, sort_by: "id" });

  return (
    <>
      <ResourceListPage
        title="Customers"
        query={query}
        createLabel={canCreate ? "Create" : undefined}
        onCreate={
          canCreate
            ? () => {
                setEditing(null);
                setDialogOpen(true);
              }
            : undefined
        }
        onRowClick={
          canEdit
            ? (row) => {
                setEditing(row as CustomerRow);
                setDialogOpen(true);
              }
            : undefined
        }
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "abn", label: "Business / tax ID" },
          { key: "contact_name", label: "Contact" },
          { key: "contact_email", label: "Email" },
          {
            key: "contact_phone_number",
            label: "Phone",
            accessor: (row) =>
              formatPhoneDisplay(
                row.contact_phone_number as string | undefined,
                row.contact_phone_country_iso as string | undefined,
              ) || "—",
          },
          {
            key: "is_active",
            label: "Active",
            accessor: (row) => (row.is_active === false ? "No" : "Yes"),
          },
        ]}
        rowActions={
          canEdit
            ? (row) => (
                <Button
                  variant="soft"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() => {
                    setEditing(row as CustomerRow);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
              )
            : undefined
        }
      />
      <CustomerFormDialog
        open={dialogOpen}
        customer={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
      />
    </>
  );
}
