import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { organisationsApi } from "@mytask/api";
import { can, getOrganisationAcl } from "@mytask/services";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import type { MoreStackParamList } from "../navigation/types";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";

type Props = NativeStackScreenProps<MoreStackParamList, "OrganisationDetails">;

export function OrganisationDetailsScreen({ route }: Props) {
  const { orgCode } = route.params;
  const organisation = useOrganisationStore((s) => s.organisation);
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const role = organisation?.role || organisation?.role_code;
  const acl = getOrganisationAcl(role);
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={[styles.label, { color: c.muted }]}>Code</Text>
        <Text style={[styles.value, { color: c.text }]}>
          {organisation?.code || orgCode}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={[styles.label, { color: c.muted }]}>Your role</Text>
        <Text style={[styles.value, { color: c.text }]}>
          {String(role || "—")}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        <Text style={[styles.label, { color: c.muted }]}>Name</Text>
        {canEdit ? (
          <>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: c.border,
                  backgroundColor: c.bg,
                  color: c.text,
                },
              ]}
              value={name}
              onChangeText={setName}
              editable={!saving}
              placeholderTextColor={c.muted}
            />
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: c.primary, opacity: saving ? 0.7 : 1 },
              ]}
              onPress={() => void saveName()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save name</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <Text style={[styles.value, { color: c.text }]}>
            {organisation?.name || "—"}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 6 },
  value: { fontSize: 16, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
});
