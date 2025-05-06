import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Alert, 
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import DataUser from '../../navigation/DataUser';
import Navbar from '../Components/Navbar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import supabase from '../../supabase';

const AccountScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [generalUpdates, setGeneralUpdates] = useState(true);
  const [promotionalOffers, setPromotionalOffers] = useState(false);
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);
  const [showMedicsModal, setShowMedicsModal] = useState(false);
  const [medics, setMedics] = useState([]);

  useEffect(() => {
    const user = DataUser.getUserData();
    
    if (user) {
      setUserData(user);
      setNotificationsEnabled(user.notificationsEnabled || true);
      setMedicationReminders(user.medicationReminders || true);
      setGeneralUpdates(user.generalUpdates || true);
      setPromotionalOffers(user.promotionalOffers || false);
    } else {
      Alert.alert('Error', 'User data not found.');
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
  }, []);

  const handleLogout = () => {
    // Directly navigate to Welcome screen without confirmation
    // The reset action clears the navigation history preventing the user from coming back
    navigation.reset({
      index: 0,
      routes: [{ name: 'Welcome' }],
    });
  };

  const toggleNotifications = () => {
    setNotificationsEnabled(previousState => !previousState);
  };

  const toggleMedicationReminders = () => {
    setMedicationReminders(previousState => !previousState);
  };

  const toggleGeneralUpdates = () => {
    setGeneralUpdates(previousState => !previousState);
  };

  const togglePromotionalOffers = () => {
    setPromotionalOffers(previousState => !previousState);
  };

  const settingsOptions = [
    {
      icon: 'user',
      title: 'Edit Profile',
      onPress: () => {
        setSettingsModalVisible(false);
        navigation.navigate('SettingsScreen');
      }
    },
    {
      icon: 'bell',
      title: 'Notifications',
      onPress: () => {
        setShowNotificationOptions(prev => !prev);
      }
    },
    {
      icon: 'question-circle',
      title: 'Help & Support',
      onPress: () => {
        setSettingsModalVisible(false);
        navigation.navigate('HelpScreen');
      }
    },
    {
      icon: 'shield',
      title: 'Privacy Policy',
      onPress: () => {
        setSettingsModalVisible(false);
        navigation.navigate('PrivacyPolicyScreen');
      }
    },
    {
      icon: 'file-text',
      title: 'Terms of Service',
      onPress: () => {
        setSettingsModalVisible(false);
        navigation.navigate('TermsScreen');
      }
    }
  ];

  // fetch users with role 'medic'
  const fetchMedics = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, fullname, pfpimg')
      .eq('role', 'medic');
    if (error) {
      Alert.alert('Erro', 'Falha ao carregar médicos: ' + error.message);
      return;
    }
    setMedics(data);
    setShowMedicsModal(true);
  };

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  const profileImage = userData.pfpimg
    ? { uri: `data:image/png;base64,${userData.pfpimg}` }
    : { uri: 'https://i.pravatar.cc/150?img=3' };

  const containerStyle = {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: insets.bottom + 70
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#fff"
      />
      
      <View style={styles.container}>
        {/* Header Compacto */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setSettingsModalVisible(true)}
          >
            <FontAwesome name="cog" size={22} color="#3498db" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS === 'ios'}
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                <Image source={profileImage} style={styles.profileImage} />
                <TouchableOpacity style={styles.editImageButton}>
                  <FontAwesome name="camera" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userData.fullname || 'User'}</Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.badge}>
                    <FontAwesome name="star" size={12} color="#FFD700" />
                    <Text style={styles.badgeText}>Premium</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Contact Info Cards */}
            <View style={styles.contactCards}>
              <View style={styles.contactCard}>
                <FontAwesome name="envelope" size={16} color="#3498db" />
                <Text style={styles.contactText}>{userData.email || 'N/A'}</Text>
              </View>
              <View style={styles.contactCard}>
                <FontAwesome name="phone" size={16} color="#3498db" />
                <Text style={styles.contactText}>{userData.phone || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={fetchMedics}
            >
              <View style={styles.actionIcon}>
                <FontAwesome name="user-md" size={20} color="#3498db" />
              </View>
              <Text style={styles.actionText}>Médicos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ComingSoonScreen')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome name="calendar" size={20} color="#3498db" />
              </View>
              <Text style={styles.actionText}>Consultas</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('MedicationTrackingScreen')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome name="medkit" size={20} color="#3498db" />
              </View>
              <Text style={styles.actionText}>Medicamentos</Text>
            </TouchableOpacity>
          </View>

          {/* Account Actions */}
          <View style={styles.accountActions}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => setSettingsModalVisible(true)}
            >
              <FontAwesome name="cog" size={18} color="#fff" />
              <Text style={styles.buttonText}>Configurações</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
            >
              <FontAwesome name="sign-out" size={18} color="#e74c3c" />
              <Text style={[styles.buttonText, styles.logoutText]}>Sair</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={settingsModalVisible}
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setSettingsModalVisible(false)}
                >
                  {Platform.OS === 'ios' ? (
                    <FontAwesome name="chevron-down" size={20} color="#666" />
                  ) : (
                    <FontAwesome name="times" size={24} color="#666" />
                  )}
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Settings</Text>
                <View style={styles.modalHeaderRight} />
              </View>

              <ScrollView style={styles.modalScroll}>
                {/* Settings Options */}
                {settingsOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.settingOption,
                      option.title === 'Notifications' && showNotificationOptions && 
                      styles.activeOption
                    ]}
                    onPress={option.onPress}
                  >
                    <View style={styles.optionIconWrapper}>
                      <FontAwesome name={option.icon} size={18} color="#3498db" />
                    </View>
                    <Text style={styles.optionText}>{option.title}</Text>
                    <FontAwesome 
                      name={option.title === 'Notifications' && showNotificationOptions ? 
                        'chevron-up' : 'chevron-right'} 
                      size={14} 
                      color="#999" 
                    />
                  </TouchableOpacity>
                ))}

                {/* Notification Settings */}
                {showNotificationOptions && (
                  <View style={styles.notificationPanel}>
                    <View style={styles.notificationOption}>
                      <Text style={styles.notificationTitle}>Enable All</Text>
                      <Switch
                        value={notificationsEnabled}
                        onValueChange={toggleNotifications}
                        trackColor={{ false: '#e9ecef', true: '#bde0fe' }}
                        thumbColor={notificationsEnabled ? '#3498db' : '#f4f3f4'}
                        ios_backgroundColor="#e9ecef"
                      />
                    </View>
                    
                    <View style={styles.notificationSubOptions}>
                      <View style={styles.notificationOption}>
                        <Text style={styles.notificationText}>Medication Reminders</Text>
                        <Switch
                          value={medicationReminders}
                          onValueChange={toggleMedicationReminders}
                          trackColor={{ false: '#e9ecef', true: '#bde0fe' }}
                          thumbColor={medicationReminders ? '#3498db' : '#f4f3f4'}
                          ios_backgroundColor="#e9ecef"
                        />
                      </View>
                      
                      <View style={styles.notificationOption}>
                        <Text style={styles.notificationText}>General Updates</Text>
                        <Switch
                          value={generalUpdates}
                          onValueChange={toggleGeneralUpdates}
                          trackColor={{ false: '#e9ecef', true: '#bde0fe' }}
                          thumbColor={generalUpdates ? '#3498db' : '#f4f3f4'}
                          ios_backgroundColor="#e9ecef"
                        />
                      </View>
                      
                      <View style={styles.notificationOption}>
                        <Text style={styles.notificationText}>Promotional Offers</Text>
                        <Switch
                          value={promotionalOffers}
                          onValueChange={togglePromotionalOffers}
                          trackColor={{ false: '#e9ecef', true: '#bde0fe' }}
                          thumbColor={promotionalOffers ? '#3498db' : '#f4f3f4'}
                          ios_backgroundColor="#e9ecef"
                        />
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Medics Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showMedicsModal}
          onRequestClose={() => setShowMedicsModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}> 
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setShowMedicsModal(false)}>
                  {Platform.OS === 'ios' ? (
                    <FontAwesome name="chevron-down" size={20} color="#666" />
                  ) : (
                    <FontAwesome name="times" size={24} color="#666" />
                  )}
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Médicos</Text>
                <View style={styles.modalHeaderRight} />
              </View>
              <ScrollView style={styles.modalScroll}>
                {medics.map((doc) => (
                  <View key={doc.id} style={styles.medicsCard}>
                    <Image
                      source={
                        doc.pfpimg
                          ? doc.pfpimg.includes('http')
                            ? { uri: doc.pfpimg }
                            : { uri: `data:image/png;base64,${doc.pfpimg}` }
                          : { uri: 'https://i.pravatar.cc/100' }
                      }
                      style={styles.medicsAvatar}
                    />
                    <View style={styles.medicsInfo}>
                      <Text style={styles.medicsName}>{doc.fullname || 'Usuário'}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Navbar />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#3498db',
  },
  editImageButton: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: '#3498db',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    marginLeft: 15,
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFB100',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  contactCards: {
    marginTop: 20,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#34495e',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 25,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '500',
  },
  accountActions: {
    padding: 20,
    marginTop: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#3498db',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#fff',
  },
  logoutText: {
    color: '#e74c3c',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  modalHeaderRight: {
    width: 40,
  },
  modalScroll: {
    padding: 20,
  },
  settingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activeOption: {
    backgroundColor: '#f8f9fa',
  },
  optionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  notificationPanel: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginTop: 5,
  },
  notificationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  notificationSubOptions: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  notificationText: {
    fontSize: 15,
    color: '#34495e',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 18, color: '#666' },
  medicsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  medicsAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  medicsInfo: {
    flex: 1,
  },
  medicsName: {
    fontSize: 16,
    color: '#2c3e50',
  },
});

export default AccountScreen;
