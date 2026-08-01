import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { organisationsApi } from "@mytask/api";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing, typography } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import { AccessDenied } from "../components/AccessDenied";
import type { MoreStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { Button, Card, ScreenHeader, TextField } from "../ui";

type Props = NativeStackScreenProps<MoreStackParamList, "OrganisationDetails">;

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
  const [name, setName] = useState(organisation?.name || "");
  const [saving, setSaving] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.warning("Name is required");
      return;
    }
    if (!organisation) return;
    setSaving(true);
    try {
      await organisationsApi.update({
        name: trimmed,
        code: organisation.code || orgCode,
        id: organisation.id,
      });
      await setOrganisation({ ...organisation, name: trimmed });
      toast.success("Saved", "Organisation name updated");
    } catch (err) {
      toast.error("Update failed", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return <AccessDenied />;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <ScreenHeader
        title="Organisation"
        subtitle="Identity and workspace settings"
      />

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
            <TextField
              value={name}
              onChangeText={setName}
              editable={!saving}
              containerStyle={styles.nameField}
            />
            <Button
              title="Save name"
              onPress={() => void saveName()}
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
