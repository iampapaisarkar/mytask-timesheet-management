import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { spacing } from "@mytask/theme";
import { getErrorMessage, getTimezone } from "@mytask/utils";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import { GlobalPhoneInput } from "../components/GlobalPhoneInput";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { signUpWithEmail } from "../services/firebase";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { setPendingOrgInvitationToken } from "../navigation/navigationRef";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation, route }: Props) {
  const invitationToken = route.params?.invitationToken?.trim() || "";
  const setSession = useAuthStore((s) => s.setSession);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      email: "",
      dob: "",
      phone_number: "",
      phone_country_code: null,
      phone_country_iso: null,
      password: "",
      confirm_password: "",
    },
  });
  const phoneCountryCode = watch("phone_country_code");
  const phoneCountryIso = watch("phone_country_iso");

  async function onSubmit(values: SignupFormValues) {
    setError(null);
    setLoading(true);
    try {
      const credential = await signUpWithEmail(values.email, values.password);
      const token = await credential.user.getIdToken();
      useAuthStore.setState({ token });
      const response = await authApi.signup({
        first_name: values.first_name,
        middle_name: values.middle_name,
        last_name: values.last_name,
        email: values.email,
        dob: values.dob,
        phone_number: values.phone_number,
        phone_country_code: values.phone_country_code,
        phone_country_iso: values.phone_country_iso,
        uid: credential.user.uid,
        providerData: credential.user.providerData as unknown as unknown[],
        platform: Platform.OS,
        timezone: getTimezone(),
        ...(invitationToken ? { invitation_token: invitationToken } : {}),
      });
      if (invitationToken) {
        setPendingOrgInvitationToken(invitationToken);
      }
      await setSession(token, response.data.data);
      toast.success("Account created", "Welcome to myTask");
    } catch (err) {
      const message = getErrorMessage(err, "Unable to sign up. Please try again.");
      setError(message);
      toast.error("Signup failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormKeyboardScroll contentContainerStyle={styles.container} bottomOffset={32}>
        <Text style={[styles.title, { color: c.text }]}>Create your account</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {invitationToken
            ? "Create an account to accept your organisation invitation."
            : "Join myTask"}
        </Text>

        {(
          [
            { name: "first_name", label: "First name", autoCapitalize: "words" },
            { name: "last_name", label: "Last name", autoCapitalize: "words" },
            {
              name: "email",
              label: "Email",
              autoCapitalize: "none",
              keyboardType: "email-address",
            },
            { name: "dob", label: "Date of birth (YYYY-MM-DD)", autoCapitalize: "none" },
            { name: "password", label: "Password", secure: true },
            { name: "confirm_password", label: "Confirm password", secure: true },
          ] as const
        ).map((field) => (
          <Controller
            key={field.name}
            control={control}
            name={field.name}
            render={({ field: { onChange, value }, fieldState }) => (
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.muted }]}>{field.label}</Text>
                <TextInput
                  autoCapitalize={"autoCapitalize" in field ? field.autoCapitalize : "none"}
                  keyboardType={
                    "keyboardType" in field ? field.keyboardType : "default"
                  }
                  secureTextEntry={"secure" in field ? field.secure : false}
                  style={[
                    styles.input,
                    {
                      borderColor: c.border,
                      backgroundColor: c.surface,
                      color: c.text,
                    },
                  ]}
                  value={value ?? ""}
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
        ))}

        <Controller
          control={control}
          name="phone_number"
          render={({ field: { value } }) => (
            <View style={styles.field}>
              <GlobalPhoneInput
                label="Phone"
                value={{
                  phone_number: value || null,
                  phone_country_code: phoneCountryCode || null,
                  phone_country_iso: phoneCountryIso || null,
                }}
                onChange={(phone) => {
                  setValue("phone_number", phone.phone_number || "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("phone_country_code", phone.phone_country_code, {
                    shouldDirty: true,
                  });
                  setValue("phone_country_iso", phone.phone_country_iso, {
                    shouldDirty: true,
                  });
                }}
                required
                error={errors.phone_number?.message}
              />
            </View>
          )}
        />

        {error ? (
          <Text style={[styles.errorBanner, { color: c.negative }]}>{error}</Text>
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
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() =>
            navigation.navigate(
              "Login",
              invitationToken ? { invitationToken } : undefined,
            )
          }
          disabled={loading}
        >
          <Text style={{ color: c.muted }}>
            Already have an account?{" "}
            <Text style={{ color: c.primary, fontWeight: "700" }}>Login</Text>
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
});
