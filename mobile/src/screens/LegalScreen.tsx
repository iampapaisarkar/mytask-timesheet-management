import { useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  FAQ_SECTIONS,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
} from "@mytask/constants";
import { spacing } from "@mytask/theme";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useThemeStore } from "../store/themeStore";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, "Legal">;

function FaqAccordion({
  title,
  items,
}: {
  title: string;
  items: Array<{ q: string; a: string }>;
}) {
  const c = useThemeStore((s) => s.colors);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: c.surface, borderColor: c.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {items.map((item) => {
        const open = openId === item.q;
        return (
          <View
            key={item.q}
            style={[styles.faqItem, { borderTopColor: c.border }]}
          >
            <TouchableOpacity
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setOpenId(open ? null : item.q);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.faqQ, { color: c.text }]}>{item.q}</Text>
            </TouchableOpacity>
            {open ? (
              <Text style={[styles.faqA, { color: c.muted }]}>{item.a}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export function LegalScreen({ route }: Props) {
  const { kind } = route.params;
  const c = useThemeStore((s) => s.colors);

  const title =
    kind === "help"
      ? "Help & FAQ"
      : kind === "terms"
        ? "Terms & Conditions"
        : "Privacy Policy";

  const description =
    kind === "help"
      ? "Account, organisations, plans & billing, timesheets, payroll, and notifications."
      : kind === "terms"
        ? "The agreement that governs use of myTask, including plans and payments."
        : "How myTask handles personal, organisation, and billing data.";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <Text style={[styles.brand, { color: c.primary }]}>myTask</Text>
      <Text style={[styles.desc, { color: c.muted }]}>{description}</Text>

      {kind === "help"
        ? FAQ_SECTIONS.map((section) => (
            <FaqAccordion
              key={section.title}
              title={section.title}
              items={section.items}
            />
          ))
        : (kind === "terms" ? TERMS_SECTIONS : PRIVACY_SECTIONS).map(
            (section) => (
              <View
                key={section.title}
                style={[
                  styles.sectionCard,
                  { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: c.text }]}>
                  {section.title}
                </Text>
                <Text style={[styles.body, { color: c.muted }]}>
                  {section.body}
                </Text>
              </View>
            ),
          )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  title: { fontSize: 22, fontWeight: "700" },
  brand: { fontSize: 14, fontWeight: "700" },
  desc: { fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  faqItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  faqQ: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  faqA: { marginTop: 8, fontSize: 13, lineHeight: 20 },
  body: { fontSize: 14, lineHeight: 22 },
});
