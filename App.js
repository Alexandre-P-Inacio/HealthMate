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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
