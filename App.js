import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SplashScreen from './src/App/General/SplashScreen';
import WelcomeScreen from './src/Autentication/WelcomeScreen';
import LoginScreen from './src/Autentication/LoginScreen';
import RegisterOne from './src/Autentication/RegisterOne';
import RegisterTwo from './src/Autentication/RegisterTwo';
import RegisterThree from './src/Autentication/RegisterThree';
import TableScreen from './src/Autentication/TableScreen';
import HomeScreen from './src/App/General/HomeScreen';
import CalendarScreen from './src/App/General/CalendarScreen';
import AccountScreen from './src/App/Profile/AccountScreen';
import SettingsScreen from './src/App/Settings/SettingsScreen';
import MedicalDiaryScreen from './src/App/General/MedicalDiaryScreen';
import MedicationTracker from './src/App/General/MedicationTracker';
import SupportScreen from './src/App/Settings/SupportScreen';
import PrivacyPolicyScreen from './src/App/Settings/PrivacyPolicyScreen';
import TermsScreen from './src/App/Settings/TermsScreen';
import HelpScreen from './src/App/Settings/HelpScreen';
import EditProfileScreen from './src/App/Profile/EditProfileScreen';
import DoctorsScreen from './src/App/Medic/DoctorsScreen';
import AppointmentsScreen from './src/App/Medic/AppointmentsScreen';
import DoctorDetailsScreen from './src/App/Medic/DoctorDetailsScreen';
import DoctorDashboardScreen from './src/App/Medic/DoctorDashboardScreen';
import DoctorRegistrationScreen from './src/App/Medic/DoctorRegistrationScreen';
import InformationScreen from './src/App/Profile/InformationScreen';
import RequestAppointmentScreen from './src/App/Medic/RequestAppointmentScreen';
import DoctorAvailabilityScreen from './src/App/Medic/DoctorAvailabilityScreen';
import ChatListScreen from './src/App/General/ChatListScreen';
import UnifiedChatScreen from './src/App/General/ChatScreen';


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
        <Stack.Screen name="InformationScreen" component={InformationScreen} />
        <Stack.Screen name="Appointments" component={RequestAppointmentScreen} />
        <Stack.Screen name="RequestAppointmentScreen" component={RequestAppointmentScreen} />
        <Stack.Screen name="DoctorAvailability" component={DoctorAvailabilityScreen} />
        
        {/* Chat Screens */}
        <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
        <Stack.Screen name="ChatScreen" component={UnifiedChatScreen} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
