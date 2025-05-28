import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './src/App/SplashScreen';
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
import DoctorsScreen from './src/App/Medic/DoctorsScreen';
import AppointmentsScreen from './src/App/Medic/AppointmentsScreen';
import DoctorDetailsScreen from './src/App/Medic/DoctorDetailsScreen';
import DoctorDashboardScreen from './src/App/Medic/DoctorDashboardScreen';
import DoctorRegistrationScreen from './src/App/Medic/DoctorRegistrationScreen';


const Stack = createStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false, // Esconde o cabeçalho em todas as telas
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
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
        <Stack.Screen name="DoctorsScreen" component={DoctorsScreen} />
        <Stack.Screen name="AppointmentsScreen" component={AppointmentsScreen} />
        <Stack.Screen name="DoctorDetailsScreen" component={DoctorDetailsScreen} />
        <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
        <Stack.Screen name="DoctorRegistration" component={DoctorRegistrationScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
