import { Platform, Pressable, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/authStore";
import { useThemeStore } from "../store/themeStore";
import { ProfileIcon } from "../ui";
import { HeaderIconButton } from "../components/HeaderIconButton";
import { LoginScreen } from "../features/auth";
import { SignupScreen } from "../screens/SignupScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { AuthActionsScreen } from "../screens/AuthActionsScreen";
import { HomeScreen } from "../features/home";
import { ProfileScreen } from "../features/settings";
import { NotificationsListScreen } from "../features/notifications";
import { CreateOrganisationScreen } from "../screens/CreateOrganisationScreen";
import { LegalScreen } from "../screens/LegalScreen";
import { HowItWorksScreen } from "../screens/HowItWorksScreen";
import { OrgInvitationScreen } from "../screens/OrgInvitationScreen";
import {
  PricingScreen,
  SubscriptionScreen,
  BillingHistoryScreen,
  BillingInvoiceScreen,
  BillingSuccessScreen,
} from "../features/billing";
import { OrgNavigator } from "./OrgNavigator";
import { nativeBackScreenOptions } from "./standaloneOptions";
import type { RootStackParamList } from "./types";

export type { RootStackParamList } from "./types";
export type {
  OrgTabParamList,
  OrgStackParamList,
  SheetsStackParamList,
  ManageStackParamList,
  MoreStackParamList,
  DashboardStackParamList,
} from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const stackAnimation = Platform.select<"default" | "fade_from_bottom" | "slide_from_right">({
  ios: "default",
  android: "slide_from_right",
  default: "default",
});

export function RootNavigator() {
  const token = useAuthStore((s) => s.token);
  const c = useThemeStore((s) => s.colors);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: "700", fontSize: 17 },
        headerShadowVisible: false,
        ...nativeBackScreenOptions,
        contentStyle: { backgroundColor: c.bg },
        animation: stackAnimation,
        animationDuration: Platform.OS === "ios" ? undefined : 260,
      }}
    >
      {!token ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: "Create account" }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: "Reset password" }}
          />
          <Stack.Screen
            name="AuthActions"
            component={AuthActionsScreen}
            options={{ title: "Account" }}
          />
          <Stack.Screen
            name="OrgInvitation"
            component={OrgInvitationScreen}
            options={{ title: "Organisation invitation" }}
          />
          <Stack.Screen
            name="Pricing"
            component={PricingScreen}
            options={{ title: "Pricing" }}
          />
          <Stack.Screen
            name="HowItWorks"
            component={HowItWorksScreen}
            options={{ title: "How it works" }}
          />
          <Stack.Screen
            name="Legal"
            component={LegalScreen}
            options={({ route }) => ({
              title:
                route.params.kind === "help"
                  ? "Help & FAQ"
                  : route.params.kind === "terms"
                    ? "Terms & Conditions"
                    : "Privacy Policy",
            })}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={({ navigation }) => ({
              title: "myTask",
              headerTitleStyle: {
                fontWeight: "800",
                fontSize: 18,
                color: c.text,
              },
              headerRight: () => (
                <Pressable style={styles.headerRight}>
                  <HeaderIconButton
                    accessibilityLabel="Profile and settings"
                    onPress={() => navigation.navigate("Profile")}
                  >
                    <ProfileIcon color={c.text} size={20} />
                  </HeaderIconButton>
                </Pressable>
              ),
            })}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: "Profile" }}
          />
          <Stack.Screen
            name="Organisation"
            component={OrgNavigator}
            options={{
              headerShown: false,
              gestureEnabled: false,
              fullScreenGestureEnabled: false,
              animation: "default",
            }}
          />
          <Stack.Screen
            name="OrgInvitation"
            component={OrgInvitationScreen}
            options={{ title: "Organisation invitation" }}
          />
          <Stack.Screen
            name="NotificationsList"
            component={NotificationsListScreen}
            options={{
              title: "Notifications",
              animation: "slide_from_right",
              gestureEnabled: true,
            }}
          />
          <Stack.Screen
            name="CreateOrganisation"
            component={CreateOrganisationScreen}
            options={{ title: "Create organisation" }}
          />
          <Stack.Screen
            name="Legal"
            component={LegalScreen}
            options={({ route }) => ({
              title:
                route.params.kind === "help"
                  ? "Help & FAQ"
                  : route.params.kind === "terms"
                    ? "Terms & Conditions"
                    : "Privacy Policy",
            })}
          />
          <Stack.Screen
            name="HowItWorks"
            component={HowItWorksScreen}
            options={{ title: "How it works" }}
          />
          <Stack.Screen
            name="Pricing"
            component={PricingScreen}
            options={{ title: "Pricing" }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{ title: "Subscription" }}
          />
          <Stack.Screen
            name="BillingHistory"
            component={BillingHistoryScreen}
            options={{ title: "Billing history" }}
          />
          <Stack.Screen
            name="BillingSuccess"
            component={BillingSuccessScreen}
            options={{ title: "Subscription activated" }}
          />
          <Stack.Screen
            name="BillingInvoice"
            component={BillingInvoiceScreen}
            options={{ title: "Invoice" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    marginRight: 4,
  },
});
