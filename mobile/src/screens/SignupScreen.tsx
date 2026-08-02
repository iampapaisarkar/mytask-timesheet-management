import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { signupSchema, type SignupFormValues } from "@mytask/validation";
import { authApi } from "@mytask/api";
import { radii, spacing, typography } from "@mytask/theme";
import { getErrorMessage, getTimezone } from "@mytask/utils";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FormDateField } from "../components/FormDateField";
import { FormTextField } from "../components/FormTextField";
import { FormKeyboardScroll } from "../components/FormKeyboardScroll";
import { GlobalPhoneInput } from "../components/GlobalPhoneInput";
import {
  fieldChainProps,
  useAppForm,
  useFormFieldChain,
  useValidatedSubmit,
} from "../hooks/useAppForm";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { useToastStore } from "../store/toastStore";
import { signUpWithEmail } from "../services/firebase";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { setPendingOrgInvitationToken } from "../navigation/navigationRef";
import { persistTrackingTokenFromAuthResponse } from "../services/trackingAuthToken";
import { Button } from "../ui";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation, route }: Props) {
  const invitationToken = route.params?.invitationToken?.trim() || "";
  const setSession = useAuthStore((s) => s.setSession);
  const c = useThemeStore((s) => s.colors);
  const toast = useToastStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm<SignupFormValues>({
    schema: signupSchema,
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
  const chain = useFormFieldChain(form, [
    "first_name",
    "last_name",
    "email",
    "password",
    "confirm_password",
  ]);
  const { setValue, watch } = form;
  const phoneCountryCode = watch("phone_country_code");
  const phoneCountryIso = watch("phone_country_iso");

  const onSubmit = useValidatedSubmit(form, async (values) => {
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
      await persistTrackingTokenFromAuthResponse(
        response.data as {
          tracking_token?: string;
          tracking_token_expires_at?: string;
        },
      );
      await setSession(token, response.data.data);
      toast.success("Account created", "Welcome to myTask");
    } catch (err) {
      const message = getErrorMessage(err, "Unable to sign up. Please try again.");
      setError(message);
      toast.error("Signup failed", message);
    } finally {
      setLoading(false);
    }
  });

  return (
    <FormKeyboardScroll contentContainerStyle={styles.container} bottomOffset={32}>
      <View style={styles.hero}>
        <Text style={[styles.title, { color: c.text }]}>Create your account</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          {invitationToken
            ? "Create an account to accept your organisation invitation."
            : "Join myTask and start tracking work in minutes."}
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
          name="first_name"
          label="First name"
          autoCapitalize="words"
          editable={!loading}
          {...fieldChainProps(chain, "first_name")}
        />
        <FormTextField
          control={form.control}
          name="last_name"
          label="Last name"
          autoCapitalize="words"
          editable={!loading}
          {...fieldChainProps(chain, "last_name")}
        />
        <FormTextField
          control={form.control}
          name="email"
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          {...fieldChainProps(chain, "email")}
        />
        <FormDateField
          control={form.control}
          name="dob"
          label="Date of birth"
          placeholder="Select date of birth"
          adultDob
          disabled={loading}
        />
        <Controller
          control={form.control}
          name="phone_number"
          render={({ field: { onChange }, fieldState }) => (
            <View style={styles.phoneField}>
              <GlobalPhoneInput
                label="Phone"
                value={{
                  phone_number: watch("phone_number") || null,
                  phone_country_code: phoneCountryCode || null,
                  phone_country_iso: phoneCountryIso || null,
                }}
                onChange={(phone) => {
                  onChange(phone.phone_number || "");
                  setValue("phone_country_code", phone.phone_country_code, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("phone_country_iso", phone.phone_country_iso, {
                    shouldDirty: true,
                  });
                }}
                required
                error={fieldState.error?.message}
                disabled={loading}
              />
            </View>
          )}
        />
        <FormTextField
          control={form.control}
          name="password"
          label="Password"
          secureTextEntry
          editable={!loading}
          {...fieldChainProps(chain, "password")}
        />
        <FormTextField
          control={form.control}
          name="confirm_password"
          label="Confirm password"
          secureTextEntry
          editable={!loading}
          {...fieldChainProps(chain, "confirm_password")}
        />

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: c.negativeSoft }]}>
            <Text style={[styles.errorBannerText, { color: c.negativeText }]}>
              {error}
            </Text>
          </View>
        ) : null}

        <Button
          title="Create account"
          onPress={onSubmit}
          disabled={loading}
          loading={loading}
          style={styles.submitBtn}
        />
      </View>

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
        <Text style={{ color: c.muted, fontSize: 13 }}>
          Already have an account?{" "}
          <Text style={{ color: c.primary, fontWeight: "700" }}>Login</Text>
        </Text>
      </TouchableOpacity>
    </FormKeyboardScroll>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
  phoneField: { marginBottom: spacing.md },
  errorBanner: {
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorBannerText: { fontSize: typography.sizes.sm, fontWeight: "500" },
  submitBtn: { marginTop: spacing.xs },
  linkRow: { marginTop: spacing.lg, alignItems: "center" },
});
