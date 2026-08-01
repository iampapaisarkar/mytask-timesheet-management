import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@mytask/validation";
import { radii, spacing, typography } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import { FormTextField } from "../components/FormTextField";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import {
  useAppForm,
  useFormFieldChain,
  useValidatedSubmit,
  fieldChainProps,
} from "../hooks/useAppForm";
import type { RootStackParamList } from "../navigation/RootNavigator";
import {
  applyActionCode,
  confirmPasswordReset,
} from "../services/firebase";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { Button } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "AuthActions">;

type AuthActionMode = "resetPassword" | "verifyEmail" | string;

/**
 * Mirrors web AuthActionsPage:
 * - resetPassword → form → confirmPasswordReset → Login
 * - verifyEmail → auto applyActionCode → Login (failure → Home/Login)
 */
export function AuthActionsScreen({ navigation, route }: Props) {
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const verifyStarted = useRef(false);

  const mode = (route.params?.mode || "") as AuthActionMode;
  const oobCode = route.params?.oobCode || "";

  const [error, setError] = useState<string | null>(null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  const form = useAppForm<ResetPasswordFormValues>({
    schema: resetPasswordSchema,
    defaultValues: { password: "", confirm_password: "" },
  });
  const chain = useFormFieldChain(form, ["password", "confirm_password"]);

  useEffect(() => {
    if (!mode && !oobCode) {
      navigation.replace("Login");
      return;
    }

    if (mode !== "verifyEmail" || !oobCode || verifyStarted.current) return;
    verifyStarted.current = true;

    let cancelled = false;
    (async () => {
      setVerifyingEmail(true);
      try {
        await applyActionCode(oobCode);
        if (cancelled) return;
        toast.success(
          "Email verified",
          "Email verified successfully. You can login now.",
        );
        navigation.replace("Login");
      } catch (err) {
        if (cancelled) return;
        const message = getErrorMessage(err, "Unable to verify email.");
        toast.error("Verification failed", message);
        navigation.replace("Login");
      } finally {
        if (!cancelled) setVerifyingEmail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, oobCode, navigation, toast]);

  const onResetPassword = useValidatedSubmit(form, async (values) => {
    if (!oobCode) {
      setError("Reset link is missing or invalid.");
      return;
    }
    setError(null);
    try {
      await confirmPasswordReset(oobCode, values.password);
      toast.success(
        "Password reset",
        "Password successfully reset. You can login now.",
      );
      navigation.replace("Login");
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Unable to reset password. The link may have expired.",
      );
      setError(message);
      toast.error("Reset failed", message);
    }
  });

  if (mode === "verifyEmail") {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.primary} size="large" />
        <Text style={[styles.title, { color: c.text, marginTop: spacing.md }]}>
          Verifying email
        </Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {verifyingEmail
            ? "Please wait while we confirm your email address…"
            : "Finishing up…"}
        </Text>
      </View>
    );
  }

  if (mode === "resetPassword") {
    return (
      <FormKeyboardScroll
        contentContainerStyle={styles.container}
        bottomOffset={32}
      >
        <View style={styles.hero}>
          <Text style={[styles.title, { color: c.text }]}>Reset password</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>
            Choose a new password for your myTask account
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: c.surface, borderColor: c.border },
          ]}
        >
          <FormTextField
            control={form.control}
            name="password"
            label="Password"
            secureTextEntry
            editable={!form.formState.isSubmitting}
            {...fieldChainProps(chain, "password")}
          />
          <FormTextField
            control={form.control}
            name="confirm_password"
            label="Confirm password"
            secureTextEntry
            editable={!form.formState.isSubmitting}
            {...fieldChainProps(chain, "confirm_password")}
          />

          {error ? (
            <View
              style={[styles.errorBanner, { backgroundColor: c.negativeSoft }]}
            >
              <Text style={[styles.errorBannerText, { color: c.negativeText }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            title="Reset password"
            onPress={onResetPassword}
            disabled={form.formState.isSubmitting}
            loading={form.formState.isSubmitting}
            style={styles.submitBtn}
          />
        </View>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("Login")}
          disabled={form.formState.isSubmitting}
        >
          <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>
            Back to login
          </Text>
        </TouchableOpacity>
      </FormKeyboardScroll>
    );
  }

  return (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.text }]}>Invalid link</Text>
      <Text style={[styles.subtitle, { color: c.muted, textAlign: "center" }]}>
        This auth action link is missing a valid mode. Request a new email and
        try again.
      </Text>
      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>
          Back to login
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
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
  errorBanner: {
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorBannerText: { fontSize: typography.sizes.sm, fontWeight: "500" },
  submitBtn: { marginTop: spacing.xs },
  linkRow: { marginTop: spacing.lg, alignItems: "center" },
});
