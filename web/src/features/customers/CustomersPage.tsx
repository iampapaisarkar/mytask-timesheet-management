import { useState } from "react";
import { useCustomers } from "@mytask/hooks";
import { ResourceListPage } from "@/features/shared/ResourceListPage";
import { CreateCustomerDialog } from "./CreateCustomerDialog";

export function CustomersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const query = useCustomers({ rows_per_page: 50, sort_by: "id" });
  return (
    <>
      <ResourceListPage
        title="Customers"
        query={query}
        createLabel="Create"
        onCreate={() => setCreateOpen(true)}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "Name" },
          { key: "contact_name", label: "Contact" },
          { key: "contact_email", label: "Email" },
          { key: "contact_phone_number", label: "Phone" },
        ]}
      />
      <CreateCustomerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
