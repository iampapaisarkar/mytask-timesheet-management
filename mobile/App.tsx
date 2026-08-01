import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createApiClient } from '@mytask/api';
import { sharedAuthTokenManager } from '@mytask/auth';
import { createAppQueryClient } from '@mytask/hooks';
import { colors } from '@mytask/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { DeepLinkHandler } from './src/navigation/DeepLinkHandler';
import { navigationLinking } from './src/navigation/linking';
import {
  flushPendingOrgInvitation,
  navigationRef,
} from './src/navigation/navigationRef';
import { RealtimeProvider } from './src/providers/RealtimeProvider';
import { AuthSessionProvider } from './src/providers/AuthSessionProvider';
import { useAuthStore } from './src/store/authStore';
import { useOrganisationStore } from './src/store/organisationStore';
import { useThemeStore } from './src/store/themeStore';
import { ToastViewport } from './src/components/ToastViewport';
import { resetAllStores } from './src/store/resetAllStores';
import { createMobileFirebaseAuthAdapter } from './src/lib/firebaseAuthAdapter';
import { signOutUser } from './src/services/firebase';
import { ENV, isFirebaseConfigured } from './src/config/env';

export const queryClient = createAppQueryClient();

function App() {
  const [ready, setReady] = useState(false);
  const mode = useThemeStore((s) => s.mode);
  const c = useThemeStore((s) => s.colors);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await Promise.all([
        useAuthStore.getState().hydrate(),
        useOrganisationStore.getState().hydrate(),
        useThemeStore.getState().hydrate(),
      ]);

      if (!isFirebaseConfigured()) {
        createApiClient({
          baseURL: ENV.API_BASE_URL,
          getToken: async () => null,
          getOrganisation: () => useOrganisationStore.getState().organisation,
          onUnauthorized: () => {
            void resetAllStores(queryClient);
          },
        });
        if (!cancelled) setReady(true);
        return;
      }

      const adapter = createMobileFirebaseAuthAdapter();
      sharedAuthTokenManager.configure(adapter);
      createApiClient({
        baseURL: ENV.API_BASE_URL,
        getToken: sharedAuthTokenManager.createGetToken(),
        refreshToken: sharedAuthTokenManager.createRefreshToken(),
        getOrganisation: () => useOrganisationStore.getState().organisation,
        onUnauthorized: () => {
          void signOutUser().catch(() => undefined);
          void resetAllStores(queryClient);
        },
      });

      // Firebase RN persistence restores the user before waitUntilReady resolves.
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthSessionProvider>
            <RealtimeProvider>
              <BottomSheetModalProvider>
                <NavigationContainer
                  ref={navigationRef}
                  theme={navTheme}
                  linking={navigationLinking}
                  onReady={() => flushPendingOrgInvitation()}
                >
                  <StatusBar
                    barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
                    backgroundColor={c.bg}
                  />
                  <DeepLinkHandler />
                  <RootNavigator />
                  <ToastViewport />
                </NavigationContainer>
              </BottomSheetModalProvider>
            </RealtimeProvider>
          </AuthSessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
