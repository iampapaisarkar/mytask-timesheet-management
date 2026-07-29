import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createApiClient } from '@mytask/api';
import { createAppQueryClient } from '@mytask/hooks';
import { colors } from '@mytask/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useOrganisationStore } from './src/store/organisationStore';
import { useThemeStore } from './src/store/themeStore';
import { ToastViewport } from './src/components/ToastViewport';
import { ENV } from './src/config/env';

const queryClient = createAppQueryClient();

function App() {
  const [ready, setReady] = useState(false);
  const mode = useThemeStore((s) => s.mode);
  const c = useThemeStore((s) => s.colors);

  useEffect(() => {
    createApiClient({
      baseURL: ENV.API_BASE_URL,
      getToken: () => useAuthStore.getState().token,
      getOrganisation: () => useOrganisationStore.getState().organisation,
      onUnauthorized: () => {
        void useAuthStore.getState().clearSession();
        void useOrganisationStore.getState().clear();
      },
    });
    Promise.all([
      useAuthStore.getState().hydrate(),
      useOrganisationStore.getState().hydrate(),
      useThemeStore.getState().hydrate(),
    ]).finally(() => setReady(true));
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
        <NavigationContainer theme={navTheme}>
          <StatusBar
            barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
          />
          <RootNavigator />
          <ToastViewport />
        </NavigationContainer>
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
