import { createClient } from '@simplelocalize/react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Crie sua conta em SimpleLocalize e obtenha o projectToken
const projectToken = 'SUA_CHAVE_DE_PROJETO';

export const simpleLocalizeClient = createClient({
  projectToken, 
  namespace: 'common'
});

// Função para carregar as traduções iniciais
export const initializeLocalization = async () => {
  try {
    // Tentar obter o idioma salvo localmente
    const savedLanguage = await AsyncStorage.getItem('userLanguage');
    const languageToUse = savedLanguage || 'en';
    
    // Carregar as traduções do SimpleLocalize
    await simpleLocalizeClient.setLanguage(languageToUse);
    
    return languageToUse;
  } catch (error) {
    console.error('Error initializing localization:', error);
    return 'en'; // Fallback para inglês
  }
};

// Função para mudar o idioma
export const changeAppLanguage = async (languageCode) => {
  try {
    await AsyncStorage.setItem('userLanguage', languageCode);
    await simpleLocalizeClient.setLanguage(languageCode);
    return true;
  } catch (error) {
    console.error('Error changing language:', error);
    return false;
  }
}; 