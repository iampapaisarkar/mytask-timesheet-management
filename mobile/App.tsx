import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createApiClient } from '@mysheet/api';
import { colors } from '@mysheet/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { useOrganisationStore } from './src/store/organisationStore';
import { ENV } from './src/config/env';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function App() {
  const [ready, setReady] = useState(false);

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
    ]).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" />
          <RootNavigator />
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
