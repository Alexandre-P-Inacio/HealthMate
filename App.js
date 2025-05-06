import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from './src/Autentication/WelcomeScreen';
import LoginScreen from './src/Autentication/LoginScreen';
import RegisterOne from './src/Autentication/RegisterOne';
import RegisterTwo from './src/Autentication/RegisterTwo';
import RegisterThree from './src/Autentication/RegisterThree';
import TableScreen from './src/Autentication/TableScreen';
import HomeScreen from './src/App/HomeScreen';
import CalendarScreen from './src/App/CalendarScreen';
import AccountScreen from './src/App/AccountScreen';
import SettingsScreen from './src/App/SettingsScreen';
import MedicalDiaryScreen from './src/App/MedicalDiaryScreen';
import MedicationTracker from './src/App/MedicationTracker';
import SupportScreen from './src/App/SupportScreen';
import PrivacyPolicyScreen from './src/App/PrivacyPolicyScreen';
import TermsScreen from './src/App/TermsScreen';
import HelpScreen from './src/App/HelpScreen';
import EditProfileScreen from './src/App/EditProfileScreen';
import MedicationHistoryScreen from './src/App/MedicationHistoryScreen';
import MedicationTrackingScreen from './src/App/MedicationTrackingScreen';
import ComingSoonScreen from './src/App/ComingSoonScreen';
import WaterTrackerScreen from './src/App/WaterTrackerScreen';
import BMICalculatorScreen from './src/App/BMICalculatorScreen';
import HealthTipsScreen from './src/App/HealthTipsScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerShown: false, // Esconde o cabeçalho em todas as telas
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        
        {/* Fluxo de Registro em Etapas */}
        <Stack.Screen name="RegisterOne" component={RegisterOne} />
        <Stack.Screen name="RegisterTwo" component={RegisterTwo} />
        <Stack.Screen name="RegisterThree" component={RegisterThree} />

        <Stack.Screen name="TableScreen" component={TableScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
        <Stack.Screen name="AccountScreen" component={AccountScreen} />
        <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
        <Stack.Screen name="MedicalDiary" component={MedicalDiaryScreen} />
        <Stack.Screen name="MedicationTracker" component={MedicationTracker} />
        <Stack.Screen name="SupportScreen" component={SupportScreen} />
        <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsScreen" component={TermsScreen} />
        <Stack.Screen name="HelpScreen" component={HelpScreen} />
        <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
        <Stack.Screen name="MedicationHistoryScreen" component={MedicationHistoryScreen} />
        <Stack.Screen name="ComingSoonScreen" component={ComingSoonScreen} />
        <Stack.Screen name="MedicationTrackingScreen" component={MedicationTrackingScreen} />
        <Stack.Screen name="WaterTrackerScreen" component={WaterTrackerScreen} />
        <Stack.Screen name="BMICalculatorScreen" component={BMICalculatorScreen} />
        <Stack.Screen name="HealthTipsScreen" component={HealthTipsScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
