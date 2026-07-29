import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing } from "@mysheet/theme";
import { useOrganisationStore } from "../store/organisationStore";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OrgHome">;

export function OrgHomeScreen({ navigation, route }: Props) {
  const organisation = useOrganisationStore((s) => s.organisation);
  const { orgCode } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{organisation?.name || orgCode}</Text>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("Timesheets", { orgCode })}
      >
        <Text style={styles.cardTitle}>My Timesheets</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: "700", marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: colors.primary },
});
