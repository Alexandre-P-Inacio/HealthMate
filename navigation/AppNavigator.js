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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator; 