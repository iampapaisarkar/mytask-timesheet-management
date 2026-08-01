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
import { Card, ChevronIcon, ScreenHeader } from "../ui";

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
    <Card style={styles.sectionCard}>
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
              style={styles.faqQRow}
            >
              <Text style={[styles.faqQ, { color: c.text }]}>{item.q}</Text>
              <View style={open ? styles.chevronOpen : undefined}>
                <ChevronIcon color={c.subtle} size={16} />
              </View>
            </TouchableOpacity>
            {open ? (
              <Text style={[styles.faqA, { color: c.muted }]}>{item.a}</Text>
            ) : null}
          </View>
        );
      })}
    </Card>
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
      <Text style={[styles.brand, { color: c.primary }]}>myTask</Text>
      <ScreenHeader title={title} subtitle={description} />

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
              <Card key={section.title} style={styles.sectionCard}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>
                  {section.title}
                </Text>
                <Text style={[styles.body, { color: c.muted }]}>
                  {section.body}
                </Text>
              </Card>
            ),
          )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  brand: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  sectionCard: { marginBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  faqItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  faqQRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  chevronOpen: { transform: [{ rotate: "90deg" }] },
  faqA: { marginTop: 8, fontSize: 13, lineHeight: 20 },
  body: { fontSize: 14, lineHeight: 22 },
});
