/**
 * App.tsx — Componente Raiz da Aplicação Prioritize
 *
 * Configura o React Navigation com o Design System Monocromático de Alto Contraste,
 * aplica StatusBar adaptativa e gerencia a pilha principal (Login → Register → Home)
 * envolvida pelo provedor nativo de compartilhamento (ShareIntentProvider).
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import { useTheme, useIsDark, typography } from './src/theme';
import { ShareIntentProvider } from 'expo-share-intent';

const Stack = createNativeStackNavigator();

export default function App() {
  const theme = useTheme();
  const isDark = useIsDark();

  /* Mapeia os tokens monocromáticos de alto contraste para o React Navigation */
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.foreground,
      border: theme.border,
      notification: theme.primary,
    },
  };

  return (
    <ShareIntentProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: theme.background,
            },
            headerTintColor: theme.foreground,
            headerTitleStyle: {
              color: theme.foreground,
              fontFamily: typography.fonts.sans,
              fontWeight: typography.weights.bold,
              fontSize: typography.sizes.md,
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: theme.background,
            },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Login', headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Criar Conta', headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Prioritize', headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ShareIntentProvider>
  );
}
