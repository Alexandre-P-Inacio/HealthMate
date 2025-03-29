import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const languages = [
  { code: 'en', name: 'English', flag: 'https://flagcdn.com/w160/gb.png' },
  { code: 'pt', name: 'Português', flag: 'https://flagcdn.com/w160/pt.png' },
  // Adicione mais idiomas conforme necessário
];

const LanguageScreen = () => {
  const navigation = useNavigation();
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    checkLanguagePreference();
  }, []);

  const checkLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('userLanguage');
      if (savedLanguage) {
        // Se já existe uma preferência de idioma, vai direto para Welcome
        navigation.replace('Welcome');
      }
    } catch (error) {
      console.error('Error checking language preference:', error);
    }
  };

  const handleLanguageSelect = async (langCode) => {
    try {
      setSelectedLanguage(langCode);
      await AsyncStorage.setItem('userLanguage', langCode);
      navigation.replace('Welcome');
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Your Language</Text>
          <Text style={styles.subtitle}>Selecione seu idioma</Text>
        </View>

        <View style={styles.languagesContainer}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageButton,
                selectedLanguage === lang.code && styles.selectedLanguage
              ]}
              onPress={() => handleLanguageSelect(lang.code)}
            >
              <Image
                source={{ uri: lang.flag }}
                style={styles.flagImage}
              />
              <Text style={[
                styles.languageName,
                selectedLanguage === lang.code && styles.selectedLanguageText
              ]}>
                {lang.name}
              </Text>
              {selectedLanguage === lang.code && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => handleLanguageSelect(selectedLanguage)}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3142',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#9BA3B7',
  },
  languagesContainer: {
    flex: 1,
    marginBottom: 20,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F5F7FF',
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedLanguage: {
    borderColor: '#6A8DFD',
    backgroundColor: '#EAF0FF',
  },
  flagImage: {
    width: 30,
    height: 20,
    marginRight: 15,
    borderRadius: 4,
  },
  languageName: {
    fontSize: 18,
    color: '#2D3142',
    flex: 1,
  },
  selectedLanguageText: {
    color: '#6A8DFD',
    fontWeight: 'bold',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6A8DFD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#6A8DFD',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LanguageScreen; 