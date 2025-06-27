import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import DataUser from '../../navigation/DataUser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import BiometricService from '../services/BiometricService';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricUsers, setBiometricUsers] = useState([]);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    initializeBiometricData();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Remove auto-prompt - will only show when biometric button is clicked

  const initializeBiometricData = async () => {
    await checkBiometricAvailability();
    await loadBiometricUsers();
    await BiometricService.migrateLegacyUser();
  };



  const promptBiometricForLinking = async () => {
    try {
      setLoading(true);

      // First, authenticate with biometrics
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to Link Account',
        fallbackLabel: 'Cancel',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });

      if (biometricAuth.success) {
        setLoading(false);
        
        // Show alert to enter credentials
        Alert.alert(
          'Link Your Account',
          'Biometric authentication successful! Now enter your email/phone and password to link this account to biometric login.',
          [
            { text: 'OK' }
          ]
        );
        
        // Focus on the identifier input to help user enter credentials
        // The normal login flow will handle linking the account when they login successfully
      } else {
        Alert.alert('Error', 'Biometric authentication was cancelled or failed.');
      }
    } catch (error) {
      console.error('❌ Erro no linking biométrico:', error);
      Alert.alert('Error', 'Failed to authenticate with biometrics');
    } finally {
      setLoading(false);
    }
  };

  const enableBiometricForUser = async (userData) => {
    try {
      // First, authenticate with biometrics
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable Biometric Login',
        fallbackLabel: 'Cancel',
        disableDeviceFallback: true,
        cancelLabel: 'Cancel'
      });

      if (biometricAuth.success) {
        // Update user's biometric_enabled status in database
        const { error: updateError } = await supabase
          .from('users')
          .update({ biometric_enabled: true })
          .eq('id', userData.id);

        if (updateError) {
          console.error('❌ Error updating biometric status:', updateError);
          Alert.alert('Error', 'Failed to enable biometric authentication.');
          return;
        }

        // Add user to biometric users list
        const success = await BiometricService.addBiometricUser(userData.id, {
          fullname: userData.fullname,
          email: userData.email,
          phone: userData.phone,
          pfpimg: userData.pfpimg
        });

        if (success) {
          await loadBiometricUsers(); // Reload the list
          Alert.alert(
            'Biometric Login Enabled!',
            'You can now use fingerprint/face ID to login quickly on this device.',
            [{ text: 'Great!' }]
          );
          console.log(`✅ Biometric authentication enabled for ${userData.fullname}`);
        } else {
          Alert.alert('Error', 'Failed to register for biometric authentication.');
        }
      }
    } catch (error) {
      console.error('❌ Error enabling biometric authentication:', error);
      Alert.alert('Error', 'Failed to enable biometric authentication.');
    }
  };

  const loadBiometricUsers = async () => {
    try {
      const users = await BiometricService.getBiometricUsers();
      setBiometricUsers(users);
      console.log(`📱 ${users.length} usuários biométricos carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar usuários biométricos:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hasHardware && isEnrolled);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      if (!identifier.trim() || !password.trim()) {
        Alert.alert('Error', 'Please fill in all fields.');
        return;
      }

      const hashedPassword = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .or(`email.eq.${identifier},phone.eq.${identifier}`)
        .eq('password', hashedPassword)
        .single();

      if (error || !user) {
        Alert.alert('Error', 'Invalid credentials. Please try again.');
        return;
      }

      // Ensure user.id is an integer or null before setting it globally
      const userIdToSet = !isNaN(parseInt(user.id)) ? parseInt(user.id) : null;
      const userData = { ...user, id: userIdToSet };
      
      // Use auth context to login
      const loginSuccess = await login(userData);
      
      if (!loginSuccess) {
        Alert.alert('Error', 'Failed to save login session.');
        return;
      }

      // Add user to biometric list if biometric authentication is enabled
      if (user.biometric_enabled) {
        console.log(`🔒 Adding user ${user.fullname} to biometric users list`);
        const success = await BiometricService.addBiometricUser(userIdToSet, {
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          pfpimg: user.pfpimg
        });
        
        if (success) {
          console.log(`✅ User successfully added to biometric authentication`);
          await loadBiometricUsers(); // Reload biometric users list
        } else {
          console.error(`❌ Failed to add user to biometric authentication`);
        }
      } else {
        console.log(`ℹ️ User ${user.fullname} does not have biometric authentication enabled`);
        
        // Offer to enable biometric authentication if hardware is available
        if (biometricAvailable) {
          setTimeout(() => {
            Alert.alert(
              'Enable Biometric Login?',
              'Your device supports biometric authentication. Would you like to enable fingerprint/face ID login for faster access?',
              [
                { text: 'Not Now', style: 'cancel' },
                { 
                  text: 'Enable', 
                  onPress: () => enableBiometricForUser(userData)
                }
              ]
            );
          }, 1000); // Show after a short delay
        }
      }

      // Navigate to HomeScreen regardless of role
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeScreen' }],
      });
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'An error occurred while logging in.');
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintLogin = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Error', 'Biometric authentication is not available on this device.');
        return;
      }

      const currentBiometricUsers = await BiometricService.getBiometricUsers();

      if (currentBiometricUsers.length === 0) {
        // No stored biometric users - prompt to link account
        Alert.alert(
          'Link Account to Biometrics',
          'No biometric accounts found. Would you like to authenticate with biometrics and then enter your credentials to link your account?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue', 
              onPress: () => promptBiometricForLinking() 
            }
          ]
        );
        return;
      }

      // If there's only one user, show prompt to login or manage accounts
      if (currentBiometricUsers.length === 1) {
        Alert.alert(
          'Biometric Login',
          `Login as ${currentBiometricUsers[0].fullname} or manage biometric accounts?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Manage Accounts', 
              onPress: () => setShowUserSelection(true),
              style: 'default'
            },
            { 
              text: 'Login', 
              onPress: () => performBiometricLogin(currentBiometricUsers[0].id)
            }
          ]
        );
      } else {
        // Multiple users - show selection modal
        setShowUserSelection(true);
      }
    } catch (error) {
      console.error('❌ Erro na autenticação biométrica:', error);
      Alert.alert('Error', 'Failed to authenticate with biometrics');
    }
  };

  const performBiometricLogin = async (userId) => {
    try {
      setLoading(true);

      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login com Biometria',
        fallbackLabel: 'Cancelar',
        disableDeviceFallback: true,
        cancelLabel: 'Cancelar'
      });

      if (biometricAuth.success) {
        // Buscar dados do usuário
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (error || !user) {
          Alert.alert('Erro', 'Não foi possível recuperar informações do usuário.');
          await BiometricService.removeBiometricUser(userId);
          await loadBiometricUsers();
          return;
        }

        if (!user.biometric_enabled) {
          Alert.alert('Erro', 'Login biométrico não está habilitado para esta conta.');
          await BiometricService.removeBiometricUser(userId);
          await loadBiometricUsers();
          return;
        }

        // Fazer login
        const userIdToSet = !isNaN(parseInt(user.id)) ? parseInt(user.id) : null;
        const userData = { ...user, id: userIdToSet };
        
        const loginSuccess = await login(userData);
        
        if (!loginSuccess) {
          Alert.alert('Erro', 'Falha ao salvar sessão de login.');
          return;
        }

        console.log(`✅ Login biométrico realizado: ${user.fullname}`);

        // Navegar para HomeScreen
        navigation.reset({
          index: 0,
          routes: [{ name: 'HomeScreen' }],
        });
      }
    } catch (error) {
      console.error('❌ Erro no login biométrico:', error);
      Alert.alert('Erro', 'Falha na autenticação biométrica');
    } finally {
      setLoading(false);
      setShowUserSelection(false);
    }
  };

  const removeBiometricUser = async (userId, userName) => {
    Alert.alert(
      'Remove Biometric Account',
      `Are you sure you want to remove "${userName}" from biometric login? You'll need to set it up again to use biometric login for this account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            const success = await BiometricService.removeBiometricUser(userId);
            if (success) {
              await loadBiometricUsers();
              Alert.alert('Success', 'Account removed from biometric login.');
              
              // Close modal if no more users
              const remainingUsers = await BiometricService.getBiometricUsers();
              if (remainingUsers.length === 0) {
                setShowUserSelection(false);
              }
            } else {
              Alert.alert('Error', 'Failed to remove account from biometric login.');
            }
          }
        }
      ]
    );
  };

  const renderUserSelectionItem = ({ item }) => (
    <View style={styles.userSelectionItem}>
      <TouchableOpacity
        style={styles.userItemMain}
        onPress={() => performBiometricLogin(item.id)}
        disabled={loading}
      >
        <View style={styles.userItemContainer}>
          <View style={styles.userAvatar}>
            {item.pfpimg ? (
              <Image
                source={{ uri: `data:image/png;base64,${item.pfpimg}` }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {item.fullname ? item.fullname.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.fullname || 'User'}</Text>
            <Text style={styles.userContact}>
              {item.email || item.phone || 'No contact info'}
            </Text>
          </View>
          
          <Ionicons name="finger-print" size={24} color="#1a237e" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeBiometricUser(item.id, item.fullname)}
        disabled={loading}
      >
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('WelcomeScreen')}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email or Phone"
              placeholderTextColor="#999"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('RegisterOne')}
            disabled={loading}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>Don't have an account? </Text>
            <Text style={styles.registerTextBold}>Sign Up</Text>
          </TouchableOpacity>

          {biometricAvailable && (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              
              <TouchableOpacity 
                style={[styles.fingerprintButton, loading && styles.buttonDisabled]} 
                onPress={handleFingerprintLogin}
                disabled={loading}
              >
                <Ionicons name="finger-print" size={32} color="#fff" />
                <View style={styles.fingerprintTextContainer}>
                  <Text style={styles.fingerprintText}>Login with Biometrics</Text>
                  <Text style={styles.fingerprintSubtext}>
                    {biometricUsers.length > 0 
                      ? `${biometricUsers.length} account${biometricUsers.length > 1 ? 's' : ''} available`
                      : 'Use your fingerprint or face ID'
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Animated.View>

      {/* Modal de Seleção de Usuário Biométrico */}
      <Modal
        visible={showUserSelection}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Biometric Accounts</Text>
                <TouchableOpacity
                  onPress={() => setShowUserSelection(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Tap an account to login with biometrics, or tap the trash icon to remove an account from biometric login:
              </Text>

              <FlatList
                data={biometricUsers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderUserSelectionItem}
                showsVerticalScrollIndicator={false}
                style={styles.usersList}
              />

              {loading && (
                <View style={styles.modalLoadingOverlay}>
                  <ActivityIndicator size="large" color="#1a237e" />
                  <Text style={styles.modalLoadingText}>Authenticating...</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#1a237e',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#1a237e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 16,
  },
  registerTextBold: {
    color: '#1a237e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  fingerprintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a237e',
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    shadowColor: '#1a237e',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fingerprintTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  fingerprintText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fingerprintSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 0.7,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  usersList: {
    flex: 1,
  },
  userSelectionItem: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
  },
  userItemMain: {
    flex: 1,
  },
  userItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  removeButton: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    borderLeftWidth: 1,
    borderLeftColor: '#fee2e2',
  },
  userAvatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a237e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userContact: {
    fontSize: 14,
    color: '#666',
  },
  modalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default LoginScreen;