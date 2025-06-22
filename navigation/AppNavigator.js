import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';

import LoginScreen from '../src/App/LoginScreen';
import RegisterScreen from '../src/App/RegisterScreen';
import HomeScreen from '../src/App/HomeScreen';
import CalendarScreen from '../src/App/CalendarScreen';
import ProfileScreen from '../src/App/ProfileScreen';
import HelpSupportScreen from '../src/App/HelpSupportScreen';
import PrivacyPolicyScreen from '../src/App/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../src/App/TermsOfServiceScreen';
import DoctorDetailsScreen from '../src/App/Medic/DoctorDetailsScreen';
import DoctorAvailableTimesScreen from '../src/App/Medic/DoctorAvailableTimesScreen';
import AppointmentsScreen from '../src/App/Medic/AppointmentsScreen';
import DoctorSelectTimeScreen from '../src/App/Medic/DoctorSelectTimeScreen';
import ChatListScreen from '../src/App/General/ChatListScreen';
import ChatScreen from '../src/App/General/ChatScreen';
import DoctorChatListScreen from '../src/App/Medic/DoctorChatListScreen';
import DoctorChatScreen from '../src/App/Medic/DoctorChatScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Calendar" component={CalendarScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
        <Stack.Screen name="DoctorDetailsScreen" component={DoctorDetailsScreen} />
        <Stack.Screen name="DoctorAvailableTimesScreen" component={DoctorAvailableTimesScreen} />
        <Stack.Screen name="AppointmentsScreen" component={AppointmentsScreen} />
        <Stack.Screen name="DoctorSelectTimeScreen" component={DoctorSelectTimeScreen} />
        <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="DoctorChatListScreen" component={DoctorChatListScreen} />
        <Stack.Screen name="DoctorChatScreen" component={DoctorChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 