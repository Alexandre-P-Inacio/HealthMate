import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  NativeModules 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WelcomeScreen = () => {
  const { language, changeLanguage } = useLanguage();

  useEffect(() => {
    detectDeviceLanguage();
  }, []);

  const detectDeviceLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('userLanguage');
      if (!savedLanguage) {
        // Detecta o idioma do dispositivo
        const deviceLanguage = 
          Platform.OS === 'ios'
            ? NativeModules.SettingsManager.settings.AppleLocale ||
              NativeModules.SettingsManager.settings.AppleLanguages[0]
            : NativeModules.I18nManager.localeIdentifier;

        // Converte o código do idioma para nosso formato
        const languageCode = deviceLanguage.substring(0, 2).toLowerCase();
        
        // Verifica se o idioma é suportado
        if (['en', 'pt'].includes(languageCode)) {
          await changeLanguage(languageCode);
        } else {
          await changeLanguage('en'); // Idioma padrão
        }
      }
    } catch (error) {
      console.error('Error detecting device language:', error);
    }
  };

  const toggleLanguage = async () => {
    const newLanguage = language === 'en' ? 'pt' : 'en';
    await changeLanguage(newLanguage);
  };

  return (
    <View style={styles.container}>
      {/* Botão de idioma */}
      <TouchableOpacity 
        style={styles.languageButton}
        onPress={toggleLanguage}
      >
        <View style={styles.languageButtonContent}>
          <Ionicons name="language" size={24} color="#6A8DFD" />
          <Text style={styles.languageCode}>{language.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>

      {/* Resto do conteúdo da Welcome Screen */}
      <Text style={styles.title}>
        {language === 'en' ? 'Welcome' : 'Bem-vindo'}
      </Text>
      
      {/* ... resto do seu código ... */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  languageButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    zIndex: 1,
  },
  languageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FF',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  languageCode: {
    marginLeft: 5,
    color: '#6A8DFD',
    fontWeight: 'bold',
    fontSize: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3142',
    textAlign: 'center',
    marginTop: 100,
  },
  // ... seus outros estilos ...
});

export default WelcomeScreen; 