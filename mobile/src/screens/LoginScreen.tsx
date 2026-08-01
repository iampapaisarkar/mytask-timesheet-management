import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { spacing } from "@mytask/theme";
import { getErrorMessage, getTimezone } from "@mytask/utils";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import {
  AuthCancelledError,
  isAuthCancelled,
  signInWithEmail,
  signInWithGoogle,
} from "../services/firebase";
import { isFirebaseConfigured, isGoogleSignInConfigured } from "../config/env";
import type { RootStackParamList } from "../navigation/RootNavigator";

export function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setSession = useAuthStore((s) => s.setSession);
  const c = useThemeStore((s) => s.colors);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const mode = useThemeStore((s) => s.mode);
  const toast = useToastStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const busy = loading || googleLoading;
  const googleEnabled = isFirebaseConfigured() && isGoogleSignInConfigured();

  async function completeBackendLogin(email: string, token: string) {
    useAuthStore.setState({ token });
    const response = await authApi.login({
      email,
      platform: Platform.OS,
      timezone: getTimezone(),
    });
    await setSession(token, response.data.data);
  }

  async function onSubmit(values: LoginFormValues) {
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithEmail(values.email, values.password);
      const token = await credential.user.getIdToken();
      await completeBackendLogin(values.email, token);
      toast.success("Welcome back", "You are signed in to myTask");
    } catch (err) {
      const message = getErrorMessage(err, "Unable to login. Please try again.");
      setError(message);
      toast.error("Login failed", message);
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const credential = await signInWithGoogle();
      const email = credential.user.email;
      if (!email) {
        throw new Error("Google did not return an email for this account.");
      }
      const token = await credential.user.getIdToken();
      await completeBackendLogin(email, token);
      toast.success("Welcome back", "You are signed in to myTask");
    } catch (err) {
      if (err instanceof AuthCancelledError || isAuthCancelled(err)) {
        setError("Sign-in was cancelled.");
        return;
      }
      const message = getErrorMessage(
        err,
        "Unable to sign in with Google. Please try again.",
      );
      setError(message);
      toast.error("Google Sign-In failed", message);
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: c.bg, paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => void toggleTheme()} style={styles.themeBtn}>
          <Text style={{ color: c.primary, fontWeight: "600" }}>
            {mode === "dark" ? "Light" : "Dark"}
          </Text>
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.brand, { color: c.text }]}>myTask</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]}>Log in to myTask</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          Track work, manage teams, stay in sync.
        </Text>

        {googleEnabled ? (
          <TouchableOpacity
            style={[
              styles.googleButton,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
                opacity: busy ? 0.7 : 1,
              },
            ]}
            onPress={() => void onGoogleSignIn()}
            disabled={busy}
          >
            {googleLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={[styles.googleButtonText, { color: c.text }]}>
                Continue with Google
              </Text>
            )}
          </TouchableOpacity>
        ) : null}

        {googleEnabled ? (
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.muted }]}>
              or continue with email
            </Text>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
          </View>
        ) : null}

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
                  { borderColor: c.border, backgroundColor: c.surface, color: c.text },
                ]}
                value={value}
                onChangeText={onChange}
                placeholderTextColor={c.muted}
                editable={!busy}
              />
              {fieldState.error ? (
                <Text style={[styles.error, { color: c.negative }]}>
                  {fieldState.error.message}
                </Text>
              ) : null}
            </View>
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value }, fieldState }) => (
            <View style={styles.field}>
              <Text style={[styles.label, { color: c.muted }]}>Password</Text>
              <TextInput
                secureTextEntry
                style={[
                  styles.input,
                  { borderColor: c.border, backgroundColor: c.surface, color: c.text },
                ]}
                value={value}
                onChangeText={onChange}
                placeholderTextColor={c.muted}
                editable={!busy}
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
          <Text style={[styles.errorBanner, { color: c.negative }]}>{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: c.primary, opacity: busy ? 0.7 : 1 }]}
          onPress={handleSubmit(onSubmit)}
          disabled={busy}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("ForgotPassword")}
          disabled={busy}
        >
          <Text style={{ color: c.primary, fontWeight: "600" }}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
              marginTop: spacing.md,
              opacity: busy ? 0.7 : 1,
            },
          ]}
          onPress={() => navigation.navigate("Pricing")}
          disabled={busy}
        >
          <Text style={[styles.buttonText, { color: c.text }]}>See Pricing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("Signup")}
          disabled={busy}
        >
          <Text style={{ color: c.muted }}>
            New to myTask?{" "}
            <Text style={{ color: c.primary, fontWeight: "700" }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  themeBtn: { alignSelf: "flex-end", marginBottom: spacing.md },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.sm,
  },
  logo: { width: 44, height: 44, borderRadius: 12 },
  brand: { fontSize: 28, fontWeight: "700" },
  title: { fontSize: 22, fontWeight: "700", marginTop: spacing.sm },
  subtitle: { marginTop: 6, marginBottom: spacing.lg, fontSize: 14 },
  googleButton: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  googleButtonText: { fontWeight: "700", fontSize: 15 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.md,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12 },
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
  linkRow: { marginTop: spacing.md, alignItems: "center" },
});
