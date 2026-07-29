import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../store/authStore";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { OrgHomeScreen } from "../screens/OrgHomeScreen";
import { TimesheetListScreen } from "../screens/TimesheetListScreen";

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  OrgHome: { orgCode: string };
  Timesheets: { orgCode: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const token = useAuthStore((s) => s.token);

  return (
    <Stack.Navigator>
      {!token ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "Organisations" }}
          />
          <Stack.Screen
            name="OrgHome"
            component={OrgHomeScreen}
            options={{ title: "Organisation" }}
          />
          <Stack.Screen
            name="Timesheets"
            component={TimesheetListScreen}
            options={{ title: "My Timesheets" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
