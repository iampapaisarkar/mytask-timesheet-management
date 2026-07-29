import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useOrganisations } from "@mysheet/hooks";
import { colors, spacing } from "@mysheet/theme";
import type { OrganisationMembership } from "@mysheet/types";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useOrganisationStore } from "../store/organisationStore";
import { useAuthStore } from "../store/authStore";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { data, isLoading, isError, refetch } = useOrganisations();
  const setOrganisation = useOrganisationStore((s) => s.setOrganisation);
  const clearSession = useAuthStore((s) => s.clearSession);
  const organisations = (data || []) as OrganisationMembership[];

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text>Failed to load organisations</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={styles.link}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => clearSession()} style={styles.logout}>
        <Text style={styles.link}>Logout</Text>
      </TouchableOpacity>
      <FlatList
        data={organisations}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>No organisations yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
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
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.code}>{item.code}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: "600" },
  code: { color: colors.greyDark, marginTop: 4 },
  empty: { textAlign: "center", color: colors.greyDark, marginTop: 40 },
  link: { color: colors.primary, fontWeight: "600" },
  logout: { alignSelf: "flex-end", marginBottom: spacing.sm },
});
