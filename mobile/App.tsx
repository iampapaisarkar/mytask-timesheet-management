import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createApiClient } from '@mytask/api';
import { sharedAuthTokenManager } from '@mytask/auth';
import { createAppQueryClient } from '@mytask/hooks';
import { colors } from '@mytask/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { RealtimeProvider } from './src/providers/RealtimeProvider';
import { AuthSessionProvider } from './src/providers/AuthSessionProvider';
import { useAuthStore } from './src/store/authStore';
import { useOrganisationStore } from './src/store/organisationStore';
import { useThemeStore } from './src/store/themeStore';
import { ToastViewport } from './src/components/ToastViewport';
import { resetAllStores } from './src/store/resetAllStores';
import { createMobileFirebaseAuthAdapter, getFirebaseAuth } from './src/lib/firebaseAuthAdapter';
import { ENV } from './src/config/env';
import { signOut } from 'firebase/auth';

export const queryClient = createAppQueryClient();

function App() {
  const [ready, setReady] = useState(false);
  const mode = useThemeStore((s) => s.mode);
  const c = useThemeStore((s) => s.colors);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const adapter = createMobileFirebaseAuthAdapter();
      sharedAuthTokenManager.configure(adapter);
      createApiClient({
        baseURL: ENV.API_BASE_URL,
        getToken: sharedAuthTokenManager.createGetToken(),
        refreshToken: sharedAuthTokenManager.createRefreshToken(),
        getOrganisation: () => useOrganisationStore.getState().organisation,
        onUnauthorized: () => {
          void signOut(getFirebaseAuth()).catch(() => undefined);
          void resetAllStores(queryClient);
        },
      });

      await Promise.all([
        useAuthStore.getState().hydrate(),
        useOrganisationStore.getState().hydrate(),
        useThemeStore.getState().hydrate(),
      ]);

      await sharedAuthTokenManager.waitUntilReady();
      if (cancelled) return;

      const fbUser = adapter.getCurrentUser();
      if (!fbUser) {
        if (useAuthStore.getState().user || useAuthStore.getState().token) {
          await useAuthStore.getState().clearSession();
        }
      } else {
        const token = await sharedAuthTokenManager.getValidIdToken();
        if (token) await useAuthStore.getState().setTokenMirror(token);
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: c.primary,
      background: c.bg,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.primary,
    },
  };

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <RealtimeProvider>
            <NavigationContainer theme={navTheme}>
              <StatusBar
                barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
              />
              <RootNavigator />
              <ToastViewport />
            </NavigationContainer>
          </RealtimeProvider>
        </AuthSessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
