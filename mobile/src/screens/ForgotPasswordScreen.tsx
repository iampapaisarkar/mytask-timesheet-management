import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@mytask/validation";
import { spacing } from "@mytask/theme";
import { getErrorMessage } from "@mytask/utils";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { sendPasswordReset } from "../services/firebase";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function ForgotPasswordScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordFormValues) {
    setError(null);
    setLoading(true);
    try {
      await sendPasswordReset(values.email);
      setSent(true);
      toast.success(
        "Check your email",
        "We sent a password reset link if that account exists.",
      );
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
  }

  return (
    <FormKeyboardScroll contentContainerStyle={styles.container} bottomOffset={32}>
        <Text style={[styles.title, { color: c.text }]}>Reset password</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Enter your email and we'll send a reset link.
        </Text>

        {sent ? (
          <View
            style={[
              styles.successCard,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.successText, { color: c.text }]}>
              If an account exists for that email, a reset link is on its way.
            </Text>
          </View>
        ) : (
          <>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value }, fieldState }) => (
                <View style={styles.field}>
                  <Text style={[styles.label, { color: c.muted }]}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[
                      styles.input,
                      {
                        borderColor: c.border,
                        backgroundColor: c.surface,
                        color: c.text,
                      },
                    ]}
                    value={value}
                    onChangeText={onChange}
                    placeholderTextColor={c.muted}
                    editable={!loading}
                  />
                  {fieldState.error ? (
                    <Text style={[styles.error, { color: c.negative }]}>
                      {fieldState.error.message}
                    </Text>
                  ) : null}
                </View>
              )}
            />

            {error ? (
              <Text style={[styles.errorBanner, { color: c.negative }]}>
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 },
              ]}
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send reset link</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("Login")}
          disabled={loading}
        >
          <Text style={{ color: c.primary, fontWeight: "700" }}>
            Back to login
          </Text>
        </TouchableOpacity>
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { marginTop: 6, marginBottom: spacing.lg, fontSize: 14 },
  field: { marginBottom: spacing.md },
  label: { marginBottom: 6, fontWeight: "600", fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  error: { marginTop: 4, fontSize: 12 },
  errorBanner: { marginBottom: spacing.sm, fontSize: 13 },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  linkRow: { marginTop: spacing.lg, alignItems: "center" },
  successCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: { fontSize: 14, lineHeight: 20 },
});
