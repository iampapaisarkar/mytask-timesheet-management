import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { radii, spacing, typography } from "@mytask/theme";
import { getErrorMessage, getTimezone } from "@mytask/utils";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import { GoogleGlyph } from "../components/GoogleGlyph";
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
import { setPendingOrgInvitationToken } from "../navigation/navigationRef";
import { Button, IconButton, MoonIcon, SunIcon, TextField } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation, route }: Props) {
  const invitationToken = route.params?.invitationToken?.trim() || "";
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
      ...(invitationToken ? { invitation_token: invitationToken } : {}),
    });
    if (invitationToken) {
      setPendingOrgInvitationToken(invitationToken);
    }
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
    <FormKeyboardScroll
      style={{ paddingTop: insets.top }}
      contentContainerStyle={styles.container}
      bottomOffset={32}
    >
      <View style={styles.themeBtn}>
        <IconButton
          soft
          accessibilityLabel={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          icon={
            mode === "dark" ? (
              <SunIcon color={c.primary} size={18} />
            ) : (
              <MoonIcon color={c.primary} size={18} />
            )
          }
          onPress={() => void toggleTheme()}
        />
      </View>

      <View style={styles.hero}>
        <View style={[styles.logoWrap, { backgroundColor: c.primarySoft }]}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brand, { color: c.text }]}>myTask</Text>
        <Text style={[styles.title, { color: c.text }]}>Log in to your account</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {invitationToken
            ? "Sign in to accept your organisation invitation."
            : "Track work, manage teams, stay in sync."}
        </Text>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.border },
        ]}
      >
        {googleEnabled ? (
          <>
            <Button
              title="Continue with Google"
              variant="outline"
              onPress={() => void onGoogleSignIn()}
              disabled={busy}
              loading={googleLoading}
              leftIcon={googleLoading ? undefined : <GoogleGlyph size={18} />}
            />
            <View style={styles.dividerRow}>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <Text style={[styles.dividerText, { color: c.muted }]}>
                or continue with email
              </Text>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
            </View>
          </>
        ) : null}

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value }, fieldState }) => (
            <TextField
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={value}
              onChangeText={onChange}
              editable={!busy}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value }, fieldState }) => (
            <TextField
              label="Password"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              editable={!busy}
              error={fieldState.error?.message}
            />
          )}
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
          title="Login"
          onPress={handleSubmit(onSubmit)}
          disabled={busy}
          loading={loading}
          style={styles.submitBtn}
        />

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate("ForgotPassword")}
          disabled={busy}
        >
          <Text style={{ color: c.primary, fontWeight: "700", fontSize: 13 }}>
            Forgot password?
          </Text>
        </TouchableOpacity>
      </View>

      <Button
        title="See pricing"
        variant="soft"
        onPress={() => navigation.navigate("Pricing")}
        disabled={busy}
        style={styles.pricingBtn}
      />

      <TouchableOpacity
        style={styles.signupRow}
        onPress={() =>
          navigation.navigate(
            "Signup",
            invitationToken ? { invitationToken } : undefined,
          )
        }
        disabled={busy}
      >
        <Text style={{ color: c.muted, fontSize: 13 }}>
          New to myTask?{" "}
          <Text style={{ color: c.primary, fontWeight: "700" }}>Sign up</Text>
        </Text>
      </TouchableOpacity>

      <View style={styles.legalRow}>
        {(
          [
            { label: "Help", kind: "help" as const },
            { label: "Terms", kind: "terms" as const },
            { label: "Privacy", kind: "privacy" as const },
          ] as const
        ).map((item, index) => (
          <View key={item.kind} style={styles.legalItem}>
            {index > 0 ? (
              <Text style={{ color: c.subtle }}> · </Text>
            ) : null}
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("Legal", { kind: item.kind })
              }
              disabled={busy}
            >
              <Text style={{ color: c.primary, fontWeight: "600", fontSize: 12 }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
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
  themeBtn: { alignSelf: "flex-end", marginBottom: spacing.sm },
  hero: { alignItems: "center", marginBottom: spacing.lg },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logo: { width: 40, height: 40, borderRadius: 10 },
  brand: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: "700",
    marginTop: spacing.md,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 6,
    fontSize: typography.sizes.sm,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  card: {
    borderRadius: radii.xxl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: spacing.md,
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: typography.sizes.xs, fontWeight: "500" },
  errorBanner: {
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorBannerText: { fontSize: typography.sizes.sm, fontWeight: "500" },
  submitBtn: { marginTop: spacing.xs },
  linkRow: { marginTop: spacing.md, alignItems: "center" },
  pricingBtn: { marginTop: spacing.lg },
  signupRow: { marginTop: spacing.lg, alignItems: "center" },
  legalRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  legalItem: { flexDirection: "row", alignItems: "center" },
});
