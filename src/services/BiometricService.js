import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_USERS_KEY = 'biometric_users';
const LEGACY_BIOMETRIC_KEY = 'biometricUserId';

class BiometricService {
  /**
   * Add a user to the biometric users list
   */
  static async addBiometricUser(userId, userInfo) {
    try {
      const users = await this.getBiometricUsers();
      
      // Check if user already exists
      const existingUserIndex = users.findIndex(user => user.id === userId);
      
      const userEntry = {
        id: userId,
        fullname: userInfo.fullname,
        email: userInfo.email,
        phone: userInfo.phone,
        pfpimg: userInfo.pfpimg,
        addedAt: new Date().toISOString()
      };

      if (existingUserIndex >= 0) {
        // Update existing user
        users[existingUserIndex] = userEntry;
      } else {
        // Add new user
        users.push(userEntry);
      }

      await AsyncStorage.setItem(BIOMETRIC_USERS_KEY, JSON.stringify(users));
      console.log(`✅ Usuário biométrico adicionado: ${userInfo.fullname}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao adicionar usuário biométrico:', error);
      return false;
    }
  }

  /**
   * Get all biometric users
   */
  static async getBiometricUsers() {
    try {
      const usersJson = await AsyncStorage.getItem(BIOMETRIC_USERS_KEY);
      return usersJson ? JSON.parse(usersJson) : [];
    } catch (error) {
      console.error('❌ Erro ao carregar usuários biométricos:', error);
      return [];
    }
  }

  /**
   * Remove a user from biometric users list
   */
  static async removeBiometricUser(userId) {
    try {
      const users = await this.getBiometricUsers();
      const filteredUsers = users.filter(user => user.id !== userId);
      
      await AsyncStorage.setItem(BIOMETRIC_USERS_KEY, JSON.stringify(filteredUsers));
      console.log(`🗑️ Usuário biométrico removido: ${userId}`);
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao remover usuário biométrico:', error);
      return false;
    }
  }

  /**
   * Clear all biometric users
   */
  static async clearBiometricUsers() {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_USERS_KEY);
      console.log('🧹 Lista de usuários biométricos limpa');
      return true;
    } catch (error) {
      console.error('❌ Erro ao limpar usuários biométricos:', error);
      return false;
    }
  }

  /**
   * Check if a user has biometric login enabled
   */
  static async isUserBiometricEnabled(userId) {
    try {
      const users = await this.getBiometricUsers();
      return users.some(user => user.id === userId);
    } catch (error) {
      console.error('❌ Erro ao verificar usuário biométrico:', error);
      return false;
    }
  }

  /**
   * Migrate legacy biometric user (from old single-user storage)
   */
  static async migrateLegacyUser() {
    try {
      const legacyUserId = await AsyncStorage.getItem(LEGACY_BIOMETRIC_KEY);
      
      if (legacyUserId) {
        const users = await this.getBiometricUsers();
        
        // Check if this user is already in the new system
        if (!users.some(user => user.id.toString() === legacyUserId)) {
          console.log('🔄 Migrando usuário biométrico legado...');
          
          // Add to new system with minimal info (will be updated on next login)
          await this.addBiometricUser(parseInt(legacyUserId), {
            fullname: 'Usuário Migrado',
            email: null,
            phone: null,
            pfpimg: null
          });
        }
        
        // Remove legacy storage
        await AsyncStorage.removeItem(LEGACY_BIOMETRIC_KEY);
        console.log('✅ Migração de usuário biométrico concluída');
      }
    } catch (error) {
      console.error('❌ Erro na migração de usuário biométrico:', error);
    }
  }

  /**
   * Get the most recently used biometric user
   */
  static async getLastBiometricUser() {
    try {
      const users = await this.getBiometricUsers();
      if (users.length === 0) return null;
      
      // Sort by addedAt date (most recent first)
      const sortedUsers = users.sort((a, b) => 
        new Date(b.addedAt || 0) - new Date(a.addedAt || 0)
      );
      
      return sortedUsers[0];
    } catch (error) {
      console.error('❌ Erro ao obter último usuário biométrico:', error);
      return null;
    }
  }
}

export default BiometricService; 