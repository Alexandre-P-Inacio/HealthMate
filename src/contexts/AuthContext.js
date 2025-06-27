import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DataUser from '../../navigation/DataUser';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
    
    // Verificar mudanças no DataUser periodicamente para detectar quick logins
    const interval = setInterval(() => {
      const currentUserData = DataUser.getUserData();
      
      // Se há dados no DataUser mas o contexto diz que não está logado
      if (currentUserData && !isLoggedIn) {
        console.log('🔄 Quick login detectado, atualizando estado de autenticação...');
        setIsLoggedIn(true);
        setUser(currentUserData);
        
        // Salvar no AsyncStorage para persistência
        if (currentUserData.id) {
          AsyncStorage.setItem('userToken', currentUserData.id.toString());
          AsyncStorage.setItem('userData', JSON.stringify(currentUserData));
        }
      }
      
      // Se não há dados no DataUser mas o contexto diz que está logado
      if (!currentUserData && isLoggedIn) {
        console.log('🚪 Logout detectado, atualizando estado...');
        setIsLoggedIn(false);
        setUser(null);
      }
    }, 1000); // Verificar a cada segundo
    
    return () => clearInterval(interval);
  }, [isLoggedIn]);

  const checkAuthState = async () => {
    try {
      // Primeiro verificar se há dados na memória (DataUser)
      let savedUser = DataUser.getUserData();
      let userToken = await AsyncStorage.getItem('userToken');
      
      // Se não há dados na memória mas há no AsyncStorage, restaurar
      if (!savedUser && userToken) {
        try {
          const savedUserData = await AsyncStorage.getItem('userData');
          if (savedUserData) {
            savedUser = JSON.parse(savedUserData);
            DataUser.setUserData(savedUser);
          }
        } catch (parseError) {
          console.error('Erro ao restaurar dados do usuário:', parseError);
        }
      }
      
      // Se há dados na memória mas não há token, salvar token
      if (savedUser && !userToken && savedUser.id) {
        await AsyncStorage.setItem('userToken', savedUser.id.toString());
        await AsyncStorage.setItem('userData', JSON.stringify(savedUser));
        userToken = savedUser.id.toString();
      }
      
      // Determinar se está logado
      if (savedUser && (savedUser.id || savedUser.email)) {
        setIsLoggedIn(true);
        setUser(savedUser);
        
        // Garantir que os dados estão salvos no AsyncStorage
        if (!userToken && savedUser.id) {
          await AsyncStorage.setItem('userToken', savedUser.id.toString());
          await AsyncStorage.setItem('userData', JSON.stringify(savedUser));
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Erro ao verificar estado de autenticação:', error);
      setIsLoggedIn(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData) => {
    try {
      // Salvar dados do usuário
      DataUser.setUserData(userData);
      await AsyncStorage.setItem('userToken', userData.id.toString());
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      setIsLoggedIn(true);
      setUser(userData);
      return true;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Limpar dados salvos
      DataUser.clearUserData();
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      setIsLoggedIn(false);
      setUser(null);
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      return false;
    }
  };

  const updateUser = (userData) => {
    DataUser.setUserData(userData);
    setUser(userData);
  };

  // Função para detectar quick logins manualmente
  const syncAuthState = async () => {
    const currentUserData = DataUser.getUserData();
    
    if (currentUserData && (currentUserData.id || currentUserData.email)) {
      console.log('🔄 Sincronizando estado de autenticação - usuário logado detectado');
      setIsLoggedIn(true);
      setUser(currentUserData);
      
      // Garantir persistência no AsyncStorage
      if (currentUserData.id) {
        await AsyncStorage.setItem('userToken', currentUserData.id.toString());
        await AsyncStorage.setItem('userData', JSON.stringify(currentUserData));
      }
    } else if (!currentUserData && isLoggedIn) {
      console.log('🚪 Sincronizando estado de autenticação - logout detectado');
      setIsLoggedIn(false);
      setUser(null);
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    }
  };

  const value = {
    isLoggedIn,
    user,
    isLoading,
    login,
    logout,
    updateUser,
    checkAuthState,
    syncAuthState
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 