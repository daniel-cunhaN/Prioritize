import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import { useTheme, useIsDark, typography } from './src/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  const theme = useTheme();
  const isDark = useIsDark();

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
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <StatusBar style={isDark ? 'light' : 'dark'} />

        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.primary,
            headerTitleStyle: {
              color: theme.foreground,
              fontFamily: typography.fonts.sans,
              fontWeight: typography.weights.semibold,
              fontSize: typography.sizes.md,
            },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: theme.background },
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
            options={{ title: 'Menu Principal', headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
