import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { organisationsApi } from "@mytask/api";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import {
  organisationDetailsSchema,
  type OrganisationDetailsFormValues,
} from "@mytask/validation";
import { AccessDenied } from "../components/AccessDenied";
import { FormTextField } from "../components/FormTextField";
import type { OrgStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { useAppForm, useValidatedSubmit } from "../hooks/useAppForm";
import { Button, Card } from "../ui";

type Props = NativeStackScreenProps<OrgStackParamList, "OrganisationDetails">;

export function OrganisationDetailsScreen({ route }: Props) {
  const { orgCode } = route.params;
  const organisation = useOrganisationStore((s) => s.organisation);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
  const canView = can(acl, "organisationSetting", "view");
  const canEdit = can(acl, "organisationSetting", "edit");
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [saving, setSaving] = useState(false);

  const form = useAppForm<OrganisationDetailsFormValues>({
    schema: organisationDetailsSchema,
    defaultValues: {
      name: organisation?.name || "",
      website: "",
      email: "",
      phone_number: "",
      phone_country_code: null,
      phone_country_iso: null,
    },
  });

  useEffect(() => {
    form.reset({
      name: organisation?.name || "",
      website: "",
      email: "",
      phone_number: "",
      phone_country_code: null,
      phone_country_iso: null,
    });
  }, [organisation?.name, form.reset]);

  const saveName = useValidatedSubmit(form, async (values) => {
    if (!organisation) return;
    setSaving(true);
    try {
      await organisationsApi.update({
        name: values.name.trim(),
        code: organisation.code || orgCode,
        id: organisation.id,
      });
      await setOrganisation({ ...organisation, name: values.name.trim() });
      toast.success("Saved", "Organisation name updated");
    } catch (err) {
      toast.error("Update failed", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  });

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.pageSub, { color: c.muted }]}>
        Identity and workspace settings
      </Text>

      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Text style={[styles.label, { color: c.muted }]}>Code</Text>
            <Text style={[styles.value, { color: c.text }]}>
              {organisation?.code || orgCode}
            </Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={[styles.label, { color: c.muted }]}>Your role</Text>
            <Text style={[styles.value, { color: c.text }]}>
              {String(role || "—")}
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.label, { color: c.muted }]}>Name</Text>
        {canEdit ? (
          <>
            <FormTextField
              control={form.control}
              name="name"
              editable={!saving}
              containerStyle={styles.nameField}
            />
            <Button
              title="Save name"
              onPress={saveName}
              loading={saving}
            />
          </>
        ) : (
          <Text style={[styles.value, { color: c.text, marginTop: 6 }]}>
            {organisation?.name || "—"}
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageSub: { fontSize: 13, marginBottom: 8 },
  container: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.lg },
  rowItem: { flex: 1 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  value: { fontSize: typography.sizes.md, fontWeight: "700" },
  nameField: { marginTop: 6 },
});
