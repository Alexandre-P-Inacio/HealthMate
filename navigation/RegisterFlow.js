import React, { createContext, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import StepOne from '../screens/StepOne';
import StepTwo from '../screens/StepTwo';
import StepThree from '../screens/StepThree';

const Stack = createStackNavigator();

// Contexto para compartilhar dados entre as telas
export const RegistrationContext = createContext();

const RegisterFlow = () => {

  return (
    <RegistrationContext.Provider value={{ formData, setFormData }}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="StepOne">
          <Stack.Screen name="StepOne" component={StepOne} />
          <Stack.Screen name="StepTwo" component={StepTwo} />
          <Stack.Screen name="StepThree" component={StepThree} />
        </Stack.Navigator>
      </NavigationContainer>
    </RegistrationContext.Provider>
  );
};

export default RegisterFlow;
