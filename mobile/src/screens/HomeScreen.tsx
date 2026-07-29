import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useOrganisations } from "@mytask/hooks";
import { spacing } from "@mytask/theme";
import type { OrganisationMembership } from "@mytask/types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useThemeStore } from "../store/themeStore";

export function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { data, isLoading, isError, refetch } = useOrganisations();
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const organisations = (data || []) as OrganisationMembership[];
  const c = useThemeStore((s) => s.colors);

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} />
        <Text style={{ color: c.muted, marginTop: 12 }}>Loading…</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.text }}>Failed to load organisations</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={[styles.link, { color: c.primary }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.heading, { color: c.text }]}>Your organisations</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Select an organisation to continue
      </Text>
      <FlatList
        data={organisations}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.muted }]}>
            No organisations yet
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
            onPress={async () => {
              await setOrganisation({
                id: item.id,
                code: item.code,
                name: item.name,
                role: (item.role || item.role_code) as string,
              });
              navigation.navigate("OrgHome", { orgCode: item.code });
            }}
          >
            <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
            <Text style={[styles.code, { color: c.muted }]}>{item.code}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heading: { fontSize: 22, fontWeight: "700" },
  sub: { marginTop: 4, marginBottom: spacing.md, fontSize: 13 },
  card: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  name: { fontSize: 16, fontWeight: "700" },
  code: { marginTop: 4, fontSize: 12 },
  empty: { textAlign: "center", marginTop: 40 },
  link: { fontWeight: "700", marginTop: 8 },
});
