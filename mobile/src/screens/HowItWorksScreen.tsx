import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  HOW_IT_WORKS_INTRO,
  HOW_IT_WORKS_PHASES,
  howItWorksPlatformLabel,
  type HowItWorksPhase,
  type HowItWorksStep,
} from "@mytask/constants";
import { radii, spacing, typography } from "@mytask/theme";
import type { RootStackParamList } from "../navigation/types";
import { useThemeStore } from "../store/themeStore";
import { Button, Card } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "HowItWorks">;

function PlatformBadge({
  platform,
  primary,
  soft,
}: {
  platform: HowItWorksStep["platform"];
  primary: string;
  soft: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: soft, borderColor: primary }]}>
      <Text style={[styles.badgeText, { color: primary }]}>
        {howItWorksPlatformLabel(platform)}
      </Text>
    </View>
  );
}

function StepCard({
  step,
  index,
  isLast,
}: {
  step: HowItWorksStep;
  index: number;
  isLast: boolean;
}) {
  const c = useThemeStore((s) => s.colors);

  return (
    <View style={styles.stepRow}>
      <View style={styles.rail}>
        <View style={[styles.stepDot, { backgroundColor: c.primary }]}>
          <Text style={styles.stepDotText}>{index}</Text>
        </View>
        {!isLast ? (
          <View style={[styles.railLine, { backgroundColor: c.border }]} />
        ) : null}
      </View>
      <Card style={styles.stepCard}>
        <View style={styles.stepTitleRow}>
          <Text style={[styles.stepTitle, { color: c.text }]}>{step.title}</Text>
          <PlatformBadge
            platform={step.platform}
            primary={c.primary}
            soft={c.primarySoft}
          />
        </View>
        <Text style={[styles.stepSummary, { color: c.muted }]}>
          {step.summary}
        </Text>
        {step.details.map((line) => (
          <View key={line} style={styles.detailRow}>
            <View style={[styles.detailDot, { backgroundColor: c.primary }]} />
            <Text style={[styles.detailText, { color: c.text }]}>{line}</Text>
          </View>
        ))}
      </Card>
    </View>
  );
}

function PhaseBlock({
  phase,
  stepOffset,
}: {
  phase: HowItWorksPhase;
  stepOffset: number;
}) {
  const c = useThemeStore((s) => s.colors);

  return (
    <View style={styles.phase}>
      <Text style={[styles.phaseEyebrow, { color: c.primary }]}>Setup phase</Text>
      <Text style={[styles.phaseTitle, { color: c.text }]}>{phase.title}</Text>
      <Text style={[styles.phaseSubtitle, { color: c.muted }]}>
        {phase.subtitle}
      </Text>
      {phase.steps.map((step, i) => (
        <StepCard
          key={step.id}
          step={step}
          index={stepOffset + i + 1}
          isLast={i === phase.steps.length - 1}
        />
      ))}
    </View>
  );
}

export function HowItWorksScreen({ navigation }: Props) {
  const c = useThemeStore((s) => s.colors);

  const phasesWithOffset = HOW_IT_WORKS_PHASES.reduce<
    Array<{ phase: HowItWorksPhase; stepOffset: number }>
  >((acc, phase) => {
    const stepOffset = acc.reduce(
      (sum, row) => sum + row.phase.steps.length,
      0,
    );
    acc.push({ phase, stepOffset });
    return acc;
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.hero,
          {
            backgroundColor: c.surface,
            borderColor: c.primary + "33",
          },
        ]}
      >
        <Text style={[styles.heroEyebrow, { color: c.primary }]}>
          Product guide
        </Text>
        <Text style={[styles.heroTitle, { color: c.text }]}>
          {HOW_IT_WORKS_INTRO.title}
        </Text>
        <Text style={[styles.heroSubtitle, { color: c.muted }]}>
          {HOW_IT_WORKS_INTRO.subtitle}
        </Text>
        <View
          style={[
            styles.tipBox,
            { backgroundColor: c.primarySoft, borderColor: c.border },
          ]}
        >
          <Text style={[styles.tipText, { color: c.text }]}>
            {HOW_IT_WORKS_INTRO.tip}
          </Text>
        </View>
      </View>

      {phasesWithOffset.map(({ phase, stepOffset }) => (
        <PhaseBlock key={phase.id} phase={phase} stepOffset={stepOffset} />
      ))}

      <Card style={styles.footerCard}>
        <Text style={[styles.footerTitle, { color: c.text }]}>
          Ready to try it?
        </Text>
        <Text style={[styles.footerSub, { color: c.muted }]}>
          Log in to create an organisation, or open Help if you get stuck.
        </Text>
        <Button
          title="Back to login"
          onPress={() => navigation.navigate("Login")}
          style={styles.footerBtn}
        />
        <Button
          title="Help & FAQ"
          variant="soft"
          onPress={() => navigation.navigate("Legal", { kind: "help" })}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  hero: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  tipBox: {
    marginTop: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  tipText: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  phase: {
    gap: spacing.md,
  },
  phaseEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  phaseTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
  },
  phaseSubtitle: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  rail: {
    width: 32,
    alignItems: "center",
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  railLine: {
    flex: 1,
    width: 2,
    marginTop: 4,
    marginBottom: 4,
    minHeight: 24,
    borderRadius: 1,
  },
  stepCard: {
    flex: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  stepTitleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepTitle: {
    flexShrink: 1,
    fontSize: typography.sizes.md,
    fontWeight: "700",
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  stepSummary: {
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  detailDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  detailText: {
    flex: 1,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  footerCard: {
    gap: spacing.sm,
    alignItems: "stretch",
  },
  footerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    textAlign: "center",
  },
  footerSub: {
    fontSize: typography.sizes.sm,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  footerBtn: {
    marginBottom: spacing.xs,
  },
});
