import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@mytask/validation";
import { authApi } from "@mytask/api";
import { radii, spacing, typography } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FormTextField } from "../components/FormTextField";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import { useAppForm, useValidatedSubmit } from "../hooks/useAppForm";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { sendPasswordReset } from "../services/firebase";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { Button, CheckCircleIcon } from "../ui";

export function ForgotPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useAppForm<ForgotPasswordFormValues>({
    schema: forgotPasswordSchema,
    defaultValues: { email: "" },
  });

  const onSubmit = useValidatedSubmit(form, async (values) => {
    setError(null);
    setLoading(true);
    try {
      try {
        await authApi.forgotPassword({ email: values.email });
      } catch {
        // Backend may fail if Admin SDK is misconfigured; client Firebase still sends mail.
        await sendPasswordReset(values.email);
      }
      setSent(true);
      const msg =
        "If an account exists for that email, password reset instructions have been sent.";
      toast.success("Check your email", msg);
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Unable to send reset email. Please try again.",
      );
      setError(message);
      toast.error("Reset failed", message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <FormKeyboardScroll contentContainerStyle={styles.container} bottomOffset={32}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: c.text }]}>Reset password</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Enter your email and we&rsquo;ll send you a reset link.
        </Text>
      </View>

      {sent ? (
        <View
          style={[
            styles.card,
            styles.successCard,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <View style={[styles.successIcon, { backgroundColor: c.positiveSoft }]}>
            <CheckCircleIcon color={c.positive} size={26} />
          </View>
          <Text style={[styles.successTitle, { color: c.text }]}>
            Check your inbox
          </Text>
          <Text style={[styles.successText, { color: c.muted }]}>
            If an account exists for that email, a reset link is on its way.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <FormTextField
            control={form.control}
            name="email"
            label="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={() => Keyboard.dismiss()}
          />

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: c.negativeSoft }]}>
              <Text style={[styles.errorBannerText, { color: c.negativeText }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            title="Send reset link"
            onPress={onSubmit}
            disabled={loading}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      )}

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => navigation.navigate("Login")}
        disabled={loading}
      >
        <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>
          Back to login
        </Text>
      </TouchableOpacity>
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: { marginBottom: spacing.lg },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 6,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
  },
  card: {
    borderRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  successCard: { alignItems: "center" },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: "700",
  },
  successText: {
    marginTop: 6,
    fontSize: typography.sizes.sm,
    lineHeight: 20,
    textAlign: "center",
  },
  errorBanner: {
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorBannerText: { fontSize: typography.sizes.sm, fontWeight: "500" },
  submitBtn: { marginTop: spacing.xs },
  linkRow: { marginTop: spacing.lg, alignItems: "center" },
});
