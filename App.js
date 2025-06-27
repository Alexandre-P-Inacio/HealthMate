import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/contexts/AuthContext';

// Authentication Screens
import SplashScreen from './src/App/General/SplashScreen';
import WelcomeScreen from './src/Autentication/WelcomeScreen';
import LoginScreen from './src/Autentication/LoginScreen';
import RegisterOne from './src/Autentication/RegisterOne';
import RegisterTwo from './src/Autentication/RegisterTwo';
import RegisterThree from './src/Autentication/RegisterThree';
import TableScreen from './src/Autentication/TableScreen';

// Core App Screens
import HomeScreen from './src/App/General/HomeScreen';
import CalendarScreen from './src/App/General/CalendarScreen';
import MedicalDiaryScreen from './src/App/General/MedicalDiaryScreen';
import MedicationTracker from './src/App/General/MedicationTracker';
import MedicationScheduleScreen from './src/App/General/MedicationScheduleScreen';
import EditMedicationScreen from './src/App/General/EditMedicationScreen';
import ConfirmMedicationsScreen from './src/App/General/ConfirmMedicationsScreen';

// Health & Wellness Screens
import VitalSignsScreen from './src/App/Health/VitalSignsScreen';
import SymptomsTrackerScreen from './src/App/Health/SymptomsTrackerScreen';
import MoodTrackerScreen from './src/App/Health/MoodTrackerScreen';
import SleepTrackerScreen from './src/App/Health/SleepTrackerScreen';
import WaterTrackerScreen from './src/App/Health/WaterTrackerScreen';
import WorkoutTrackerScreen from './src/App/Health/WorkoutTrackerScreen';
import DietTrackerScreen from './src/App/Health/DietTrackerScreen';
import WeightTrackerScreen from './src/App/Health/WeightTrackerScreen';
import BloodPressureScreen from './src/App/Health/BloodPressureScreen';
import BloodSugarScreen from './src/App/Health/BloodSugarScreen';
import HeartRateScreen from './src/App/Health/HeartRateScreen';
import VitalsHistoryScreen from './src/App/Health/VitalsHistoryScreen';
import BodyCompositionHistoryScreen from './src/App/Health/BodyCompositionHistoryScreen';

// Medical & Appointments
import DoctorsScreen from './src/App/Medic/DoctorsScreen';
import AppointmentsScreen from './src/App/Medic/AppointmentsScreen';
import DoctorDetailsScreen from './src/App/Medic/DoctorDetailsScreen';
import DoctorDashboardScreen from './src/App/Medic/DoctorDashboardScreen';
import DoctorRegistrationScreen from './src/App/Medic/DoctorRegistrationScreen';
import RequestAppointmentScreen from './src/App/Medic/RequestAppointmentScreen';
import AddCustomAppointmentScreen from './src/App/Medic/AddCustomAppointmentScreen';
import DoctorAvailabilityScreen from './src/App/Medic/DoctorAvailabilityScreen';
import AppointmentHistoryScreen from './src/App/Medic/AppointmentHistoryScreen';
import TelehealthScreen from './src/App/Medic/TelehealthScreen';

// Communication
import ChatListScreen from './src/App/General/ChatListScreen';
import ChatScreen from './src/App/General/ChatScreen';
import ConversationsScreen from './src/App/General/ConversationsScreen';
import EmergencyContactsScreen from './src/App/Emergency/EmergencyContactsScreen';
import EmergencyScreen from './src/App/Emergency/EmergencyScreen';

// Reports & Analytics
import ReportsScreen from './src/App/Reports/ReportsScreen';
import HealthInsightsScreen from './src/App/Reports/HealthInsightsScreen';
import ProgressScreen from './src/App/Reports/ProgressScreen';
import ExportDataScreen from './src/App/Reports/ExportDataScreen';

// Goals & Achievements
import GoalsScreen from './src/App/Goals/GoalsScreen';
import AchievementsScreen from './src/App/Goals/AchievementsScreen';
import ChallengesScreen from './src/App/Goals/ChallengesScreen';

// Reminders & Notifications
import RemindersScreen from './src/App/Reminders/RemindersScreen';
import NotificationSettingsScreen from './src/App/Reminders/NotificationSettingsScreen';
import SmartRemindersScreen from './src/App/Reminders/SmartRemindersScreen';

// Profile & Settings
import AccountScreen from './src/App/Profile/AccountScreen';
import EditProfileScreen from './src/App/Profile/EditProfileScreen';
import InformationScreen from './src/App/Profile/InformationScreen';
import ProfileHealthScreen from './src/App/Profile/ProfileHealthScreen';
import FamilyProfilesScreen from './src/App/Profile/FamilyProfilesScreen';

import SettingsScreen from './src/App/Settings/SettingsScreen';
import SupportScreen from './src/App/Settings/SupportScreen';
import PrivacyPolicyScreen from './src/App/Settings/PrivacyPolicyScreen';
import TermsScreen from './src/App/Settings/TermsScreen';
import HelpScreen from './src/App/Settings/HelpScreen';
import BackupSettingsScreen from './src/App/Settings/BackupSettingsScreen';
import SecuritySettingsScreen from './src/App/Settings/SecuritySettingsScreen';

// Health Records & Documents
import HealthRecordsScreen from './src/App/Records/HealthRecordsScreen';
import MedicalDocumentsScreen from './src/App/Records/MedicalDocumentsScreen';
import LabResultsScreen from './src/App/Records/LabResultsScreen';
import ImmunizationScreen from './src/App/Records/ImmunizationScreen';

// Educational & Resources
import HealthEducationScreen from './src/App/Education/HealthEducationScreen';
import ArticlesScreen from './src/App/Education/ArticlesScreen';
import VideosScreen from './src/App/Education/VideosScreen';
import FAQScreen from './src/App/Education/FAQScreen';

// Data Import/Export
import DeviceIntegrationScreen from './src/App/Integration/DeviceIntegrationScreen';
import HealthConnectScreen from './src/App/Integration/HealthConnectScreen';
import FitnessAppsScreen from './src/App/Integration/FitnessAppsScreen';

const Stack = createStackNavigator();

const App = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="SplashScreen"
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            cardStyleInterpolator: ({ current, next, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateX: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.width, 0],
                      }),
                    },
                  ],
                },
              };
            },
          }}
        >
          {/* Authentication Flow */}
          <Stack.Screen name="SplashScreen" component={SplashScreen} />
          <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="RegisterOne" component={RegisterOne} />
          <Stack.Screen name="RegisterTwo" component={RegisterTwo} />
          <Stack.Screen name="RegisterThree" component={RegisterThree} />
          <Stack.Screen name="TableScreen" component={TableScreen} />

          {/* Core App Screens */}
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
          <Stack.Screen name="MedicalDiaryScreen" component={MedicalDiaryScreen} />
          <Stack.Screen name="MedicationTracker" component={MedicationTracker} />
          <Stack.Screen name="MedicationScheduleScreen" component={MedicationScheduleScreen} />
          <Stack.Screen name="EditMedicationScreen" component={EditMedicationScreen} />
          <Stack.Screen name="ConfirmMedicationsScreen" component={ConfirmMedicationsScreen} />

          {/* Health & Wellness */}
          <Stack.Screen name="VitalSigns" component={VitalSignsScreen} />
          <Stack.Screen name="SymptomsTracker" component={SymptomsTrackerScreen} />
          <Stack.Screen name="MoodTracker" component={MoodTrackerScreen} />
          <Stack.Screen name="SleepTracker" component={SleepTrackerScreen} />
          <Stack.Screen name="WaterTracker" component={WaterTrackerScreen} />
          <Stack.Screen name="WorkoutTracker" component={WorkoutTrackerScreen} />
          <Stack.Screen name="DietTracker" component={DietTrackerScreen} />
          <Stack.Screen name="WeightTracker" component={WeightTrackerScreen} />
          <Stack.Screen name="BloodPressure" component={BloodPressureScreen} />
          <Stack.Screen name="BloodSugar" component={BloodSugarScreen} />
          <Stack.Screen name="HeartRate" component={HeartRateScreen} />
          <Stack.Screen name="VitalsHistoryScreen" component={VitalsHistoryScreen} />
          <Stack.Screen name="BodyCompositionHistoryScreen" component={BodyCompositionHistoryScreen} />

          {/* Medical & Appointments */}
          <Stack.Screen name="DoctorsScreen" component={DoctorsScreen} />
          <Stack.Screen name="AppointmentsScreen" component={AppointmentsScreen} />
          <Stack.Screen name="DoctorDetailsScreen" component={DoctorDetailsScreen} />
          <Stack.Screen name="DoctorDashboard" component={DoctorDashboardScreen} />
          <Stack.Screen name="DoctorRegistration" component={DoctorRegistrationScreen} />
          <Stack.Screen name="RequestAppointmentScreen" component={RequestAppointmentScreen} />
          <Stack.Screen name="AddCustomAppointment" component={AddCustomAppointmentScreen} />
          <Stack.Screen name="Appointments" component={RequestAppointmentScreen} />
          <Stack.Screen name="DoctorAvailability" component={DoctorAvailabilityScreen} />
          <Stack.Screen name="AppointmentHistory" component={AppointmentHistoryScreen} />
          <Stack.Screen name="Telehealth" component={TelehealthScreen} />

          {/* Communication */}
          <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
          <Stack.Screen name="ChatScreen" component={ChatScreen} />
          <Stack.Screen name="ConversationsScreen" component={ConversationsScreen} />
          <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
          <Stack.Screen name="Emergency" component={EmergencyScreen} />

          {/* Reports & Analytics */}
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="HealthInsights" component={HealthInsightsScreen} />
          <Stack.Screen name="Progress" component={ProgressScreen} />
          <Stack.Screen name="ExportData" component={ExportDataScreen} />

          {/* Goals & Achievements */}
          <Stack.Screen name="Goals" component={GoalsScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="Challenges" component={ChallengesScreen} />

          {/* Reminders & Notifications */}
          <Stack.Screen name="Reminders" component={RemindersScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="SmartReminders" component={SmartRemindersScreen} />

          {/* Profile & Settings */}
          <Stack.Screen name="AccountScreen" component={AccountScreen} />
          <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
          <Stack.Screen name="InformationScreen" component={InformationScreen} />
          <Stack.Screen name="ProfileHealth" component={ProfileHealthScreen} />
          <Stack.Screen name="FamilyProfiles" component={FamilyProfilesScreen} />

          <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
          <Stack.Screen name="SupportScreen" component={SupportScreen} />
          <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
          <Stack.Screen name="TermsScreen" component={TermsScreen} />
          <Stack.Screen name="HelpScreen" component={HelpScreen} />
          <Stack.Screen name="BackupSettings" component={BackupSettingsScreen} />
          <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />

          {/* Health Records & Documents */}
          <Stack.Screen name="HealthRecords" component={HealthRecordsScreen} />
          <Stack.Screen name="MedicalDocuments" component={MedicalDocumentsScreen} />
          <Stack.Screen name="LabResults" component={LabResultsScreen} />
          <Stack.Screen name="Immunization" component={ImmunizationScreen} />

          {/* Educational & Resources */}
          <Stack.Screen name="HealthEducation" component={HealthEducationScreen} />
          <Stack.Screen name="Articles" component={ArticlesScreen} />
          <Stack.Screen name="Videos" component={VideosScreen} />
          <Stack.Screen name="FAQ" component={FAQScreen} />

          {/* Data Integration */}
          <Stack.Screen name="DeviceIntegration" component={DeviceIntegrationScreen} />
          <Stack.Screen name="HealthConnect" component={HealthConnectScreen} />
          <Stack.Screen name="FitnessApps" component={FitnessAppsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;
