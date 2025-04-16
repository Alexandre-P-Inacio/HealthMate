import { LanguageProvider } from '../contexts/LanguageContext';
import LanguageScreen from '../App/LanguageScreen';

// No seu NavigationContainer
export default function AppNavigator() {
  return (
    <LanguageProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Language">
          <Stack.Screen 
            name="Language" 
            component={LanguageScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          {/* ... outras telas ... */}
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
} 