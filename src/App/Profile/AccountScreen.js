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
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Charts temporarily replaced with text summaries for better compatibility
import supabase from '../../../supabase';
import { useFocusEffect } from '@react-navigation/native';
import UnifiedChatService from '../../services/UnifiedChatService';
import { useAuth } from '../../contexts/AuthContext';

const AccountScreen = ({ navigation }) => {
  const { isLoggedIn, user, logout: authLogout } = useAuth();
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [statsView, setStatsView] = useState('weekly'); // 'weekly' or 'monthly'
  const [isMedic, setIsMedic] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [medicationStats, setMedicationStats] = useState({
    totalScheduled: 0,
    taken: 0,
    missed: 0,
    pending: 0,
    adherenceRate: 0,
    mostMissedDay: null,
    mostMissedCount: 0,
    mostCommonHour: null,
    mostCommonHourCount: 0,
    weeklyData: [],
    monthlyData: [],
    statusDistribution: []
  });
  
  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [generalUpdates, setGeneralUpdates] = useState(true);
  const [promotionalOffers, setPromotionalOffers] = useState(false);
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);

  const loadUserData = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) {
        Alert.alert('Error', 'User data not found.');
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setUserData(data);
        DataUser.setUserData(data);
        // Check if user is a medic
        setIsMedic(data.role === 'medic');
        // Load unread messages count
        fetchUnreadMessagesCount();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  const fetchUnreadMessagesCount = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;

      const result = await UnifiedChatService.getUnreadMessagesCount(userId);
      if (result.success) {
        setUnreadMessagesCount(result.data);
      }
    } catch (error) {
      console.error('Error fetching unread messages count:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      fetchUnreadMessagesCount();
    }, [])
  );

  useEffect(() => {
    const user = DataUser.getUserData();
    if (user) {
      setUserData(user);
    } else {
      Alert.alert('Error', 'User data not found.');
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await authLogout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'HomeScreen' }],
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
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

  const fetchMedicationStats = async () => {
    try {
      const userId = DataUser.getUserData()?.id;
      if (!userId) return;

      // Get last 7 days of data
      const today = new Date();
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);

      const { data: weeklyData, error: weeklyError } = await supabase
        .from('medication_schedule_times')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', lastWeek.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });

      if (weeklyError) throw weeklyError;

      // Get last 30 days of data for monthly stats
      const lastMonth = new Date(today);
      lastMonth.setDate(today.getDate() - 30);
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('medication_schedule_times')
        .select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', lastMonth.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });
      if (monthlyError) throw monthlyError;

      // Calculate adherence rate
      const totalTaken = monthlyData.filter(m => m.status === 'taken').length;
      const totalScheduled = monthlyData.length;
      const adherenceRate = totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : 0;

      // Find the day with the most missed medications
      const missedByDay = {};
      monthlyData.forEach(med => {
        if (med.status === 'missed') {
          missedByDay[med.scheduled_date] = (missedByDay[med.scheduled_date] || 0) + 1;
        }
      });
      let mostMissedDay = null;
      let mostMissedCount = 0;
      Object.entries(missedByDay).forEach(([date, count]) => {
        if (count > mostMissedCount) {
          mostMissedDay = date;
          mostMissedCount = count;
        }
      });

      // Find the most common medication time (hour)
      const timeCount = {};
      monthlyData.forEach(med => {
        const hour = med.scheduled_time ? med.scheduled_time.split(':')[0] : null;
        if (hour) timeCount[hour] = (timeCount[hour] || 0) + 1;
      });
      let mostCommonHour = null;
      let mostCommonHourCount = 0;
      Object.entries(timeCount).forEach(([hour, count]) => {
        if (count > mostCommonHourCount) {
          mostCommonHour = hour;
          mostCommonHourCount = count;
        }
      });

      // Calculate weekly stats (already present)
      const stats = {
        totalScheduled: weeklyData.length,
        taken: weeklyData.filter(m => m.status === 'taken').length,
        missed: weeklyData.filter(m => m.status === 'missed').length,
        pending: weeklyData.filter(m => m.status === 'pending').length,
        adherenceRate,
        mostMissedDay,
        mostMissedCount,
        mostCommonHour,
        mostCommonHourCount,
        weeklyData: [],
        monthlyData: [],
        statusDistribution: [
          {
            name: 'Taken',
            count: weeklyData.filter(m => m.status === 'taken').length,
            color: '#2ecc71',
            legendFontColor: '#7F7F7F',
            legendFontSize: 12
          },
          {
            name: 'Missed',
            count: weeklyData.filter(m => m.status === 'missed').length,
            color: '#e74c3c',
            legendFontColor: '#7F7F7F',
            legendFontSize: 12
          },
          {
            name: 'Pending',
            count: weeklyData.filter(m => m.status === 'pending').length,
            color: '#f1c40f',
            legendFontColor: '#7F7F7F',
            legendFontSize: 12
          }
        ]
      };

      // Process weekly data
      const dailyStats = {};
      weeklyData.forEach(med => {
        const date = med.scheduled_date;
        if (!dailyStats[date]) {
          dailyStats[date] = { taken: 0, missed: 0, pending: 0 };
        }
        dailyStats[date][med.status]++;
      });
      stats.weeklyData = Object.entries(dailyStats).map(([date, counts]) => ({
        date,
        taken: counts.taken,
        missed: counts.missed,
        pending: counts.pending
      }));

      // Process monthly data for bar chart
      const monthlyStats = {};
      monthlyData.forEach(med => {
        const date = med.scheduled_date;
        if (!monthlyStats[date]) {
          monthlyStats[date] = { taken: 0, missed: 0, pending: 0 };
        }
        monthlyStats[date][med.status]++;
      });
      stats.monthlyData = Object.entries(monthlyStats).map(([date, counts]) => ({
        date,
        taken: counts.taken,
        missed: counts.missed,
        pending: counts.pending
      }));

      setMedicationStats(stats);
    } catch (error) {
      console.error('Error fetching medication stats:', error);
      Alert.alert('Error', 'Failed to load medication statistics');
    }
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS === 'ios'}
        >
          {/* Profile Section */}
          <View style={styles.profileSection}>
            {isLoggedIn ? (
              <>
                <View style={styles.profileHeader}>
                  <View style={styles.profileImageContainer}>
                    <Image source={profileImage} style={styles.profileImage} />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{userData?.fullname || user?.fullname || 'User'}</Text>
                    <View style={styles.badgeContainer}>
                      <View style={styles.badge}>
                        <FontAwesome name="star" size={12} color="#FFD700" />
                        <Text style={styles.badgeText}>Premium Plus</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Contact Info Cards */}
                <View style={styles.contactCards}>
                  <View style={styles.contactCard}>
                    <FontAwesome name="envelope" size={16} color="#3498db" />
                    <Text style={styles.contactText}>{userData?.email || user?.email || 'N/A'}</Text>
                  </View>
                  <View style={styles.contactCard}>
                    <FontAwesome name="phone" size={16} color="#3498db" />
                    <Text style={styles.contactText}>{userData?.phone || user?.phone || 'N/A'}</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.loginPromptSection}>
                <View style={styles.loginIconContainer}>
                  <Ionicons name="person-circle-outline" size={80} color="#6A8DFD" />
                </View>
                <Text style={styles.loginPromptTitle}>Bem-vindo ao HealthMate!</Text>
                <Text style={styles.loginPromptSubtitle}>
                  Para acessar sua conta e recursos personalizados
                </Text>
                <TouchableOpacity 
                  style={styles.loginPromptButton}
                  onPress={() => navigation.navigate('WelcomeScreen')}
                >
                  <Text style={styles.loginPromptButtonText}>Login ou Registre-se</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsGrid}>
            {isLoggedIn && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  if ((userData && userData.role === 'medic') || isMedic) {
                    navigation.navigate('DoctorDashboard');
                  } else {
                    navigation.navigate('DoctorsScreen');
                  }
                }}
              >
                <FontAwesome name="user-md" size={30} color="#6A8DFD" />
                <Text style={styles.actionButtonText}>{(userData && userData.role === 'medic') || isMedic ? 'Doctor' : 'Doctors'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.actionButton, styles.chatActionButton]}
              onPress={() => {
                if (isLoggedIn) {
                  navigation.navigate('ChatListScreen');
                } else {
                  Alert.alert('Login Necessário', 'Faça login para acessar as conversas', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Fazer Login', onPress: () => navigation.navigate('WelcomeScreen') }
                  ]);
                }
              }}
            >
              <View style={styles.chatButtonContainer}>
                <FontAwesome name="comments" size={30} color="#28a745" />
                {isLoggedIn && unreadMessagesCount > 0 && (
                  <View style={styles.chatBadge}>
                    <Text style={styles.chatBadgeText}>
                      {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.actionButtonText}>Conversas</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('InformationScreen')}
            >
              <FontAwesome name="info-circle" size={30} color="#6A8DFD" />
              <Text style={styles.actionButtonText}>Information</Text>
            </TouchableOpacity>
            {isLoggedIn && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation.navigate('AppointmentsScreen')}
              >
                <FontAwesome name="calendar" size={30} color="#6A8DFD" />
                <Text style={styles.actionButtonText}>Consultas</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Account Actions */}
          <View style={styles.accountActions}>
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={() => setSettingsModalVisible(true)}
            >
              <FontAwesome name="cog" size={18} color="#fff" />
              <Text style={styles.buttonText}>Settings</Text>
            </TouchableOpacity>

            {isLoggedIn && (
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
              >
                <FontAwesome name="sign-out" size={18} color="#e74c3c" />
                <Text style={[styles.buttonText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Stats Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={statsModalVisible}
          onRequestClose={() => setStatsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}> 
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Medication Statistics</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setStatsModalVisible(false)}
                >
                  <FontAwesome name="times" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Toggle Buttons */}
              <View style={styles.statsToggleRow}>
                <TouchableOpacity
                  style={[styles.statsToggleButton, statsView === 'weekly' && styles.statsToggleButtonActive]}
                  onPress={() => setStatsView('weekly')}
                >
                  <Text style={[styles.statsToggleText, statsView === 'weekly' && styles.statsToggleTextActive]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statsToggleButton, statsView === 'monthly' && styles.statsToggleButtonActive]}
                  onPress={() => setStatsView('monthly')}
                >
                  <Text style={[styles.statsToggleText, statsView === 'monthly' && styles.statsToggleTextActive]}>Monthly</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.statsScrollView}>
                {/* WEEKLY VIEW */}
                {statsView === 'weekly' && (
                  <>
                    <View style={styles.statsSummary}>
                      <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{medicationStats.totalScheduled}</Text>
                        <Text style={styles.statLabel}>Total Scheduled (7d)</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{medicationStats.taken}</Text>
                        <Text style={styles.statLabel}>Taken (7d)</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{medicationStats.missed}</Text>
                        <Text style={styles.statLabel}>Missed (7d)</Text>
                      </View>
                    </View>
                    {/* Status Distribution Chart */}
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>Status Distribution</Text>
                      <View style={{ padding: 20, backgroundColor: '#f8f9fa', borderRadius: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
                          Status Summary
                        </Text>
                        {medicationStats.statusDistribution.map((item, index) => (
                          <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <View style={{ width: 12, height: 12, backgroundColor: item.color, borderRadius: 6, marginRight: 8 }} />
                            <Text style={{ fontSize: 14, color: '#666' }}>{item.name}: {item.count}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {/* Weekly Trend Chart */}
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>Weekly Trend</Text>
                      <View style={{ padding: 20, backgroundColor: '#f8f9fa', borderRadius: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' }}>
                          Weekly Summary
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>
                          📊 Taken: {medicationStats.taken} medications
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>
                          ❌ Missed: {medicationStats.missed} medications
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666' }}>
                          ⏳ Pending: {medicationStats.pending} medications
                        </Text>
                      </View>
                    </View>
                  </>
                )}
                {/* MONTHLY VIEW */}
                {statsView === 'monthly' && (
                  <>
                    <View style={styles.statsSummary}>
                      <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{medicationStats.adherenceRate}%</Text>
                        <Text style={styles.statLabel}>Adherence (30d)</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{medicationStats.mostMissedDay ? medicationStats.mostMissedDay : '-'}</Text>
                        <Text style={styles.statLabel}>Most Missed Day</Text>
                      </View>
                      <View style={styles.statCard}>
                        <Text style={styles.statNumber}>{medicationStats.mostCommonHour ? medicationStats.mostCommonHour + ':00' : '-'}</Text>
                        <Text style={styles.statLabel}>Most Common Hour</Text>
                      </View>
                    </View>
                    {/* Monthly Status Distribution Pie Chart */}
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>Status Distribution (30d)</Text>
                      <View style={{ padding: 20, backgroundColor: '#f8f9fa', borderRadius: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
                          Monthly Distribution
                        </Text>
                        {(() => {
                          if (Array.isArray(medicationStats.monthlyData) && medicationStats.monthlyData.length > 0) {
                            const taken = medicationStats.monthlyData.reduce((acc, d) => acc + (Number.isFinite(d.taken) ? d.taken : 0), 0);
                            const missed = medicationStats.monthlyData.reduce((acc, d) => acc + (Number.isFinite(d.missed) ? d.missed : 0), 0);
                            const pending = medicationStats.monthlyData.reduce((acc, d) => acc + (Number.isFinite(d.pending) ? d.pending : 0), 0);
                            const total = taken + missed + pending;
                            return (
                              <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                  <View style={{ width: 12, height: 12, backgroundColor: '#2ecc71', borderRadius: 6, marginRight: 8 }} />
                                  <Text style={{ fontSize: 14, color: '#666' }}>Taken: {taken} ({total > 0 ? Math.round((taken/total)*100) : 0}%)</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                  <View style={{ width: 12, height: 12, backgroundColor: '#e74c3c', borderRadius: 6, marginRight: 8 }} />
                                  <Text style={{ fontSize: 14, color: '#666' }}>Missed: {missed} ({total > 0 ? Math.round((missed/total)*100) : 0}%)</Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={{ width: 12, height: 12, backgroundColor: '#f1c40f', borderRadius: 6, marginRight: 8 }} />
                                  <Text style={{ fontSize: 14, color: '#666' }}>Pending: {pending} ({total > 0 ? Math.round((pending/total)*100) : 0}%)</Text>
                                </View>
                              </View>
                            );
                          } else {
                            return <Text style={{ fontSize: 14, color: '#666' }}>No data available</Text>;
                          }
                        })()}
                      </View>
                    </View>
                    {/* Monthly Trend Chart */}
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>Monthly Trend (Taken/Missed)</Text>
                      <View style={{ padding: 20, backgroundColor: '#f8f9fa', borderRadius: 12 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
                          Monthly Trend Summary
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                          📈 Total Days Tracked: {medicationStats.monthlyData ? medicationStats.monthlyData.length : 0}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                          ✅ Best Day: {medicationStats.monthlyData && medicationStats.monthlyData.length > 0 
                            ? medicationStats.monthlyData.reduce((best, current) => 
                                current.taken > best.taken ? current : best, medicationStats.monthlyData[0]).date
                            : 'N/A'}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666' }}>
                          📊 Average Daily Adherence: {medicationStats.adherenceRate}%
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={settingsModalVisible}
          onRequestClose={() => setSettingsModalVisible(false)}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 32, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#e0e0e0', marginBottom: 18 }} />
              <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#222' }}>Settings</Text>
              {settingsOptions.map((option, idx) => (
                <TouchableOpacity
                  key={option.title}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 18, width: '100%', borderRadius: 12, marginBottom: 6, backgroundColor: '#f7fafd' }}
                  onPress={option.onPress}
                  activeOpacity={0.85}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#eaf3ff', justifyContent: 'center', alignItems: 'center', marginRight: 18 }}>
                    <FontAwesome name={option.icon} size={24} color="#3498db" />
                  </View>
                  <Text style={{ fontSize: 17, color: '#222', fontWeight: '500' }}>{option.title}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={{ marginTop: 18, backgroundColor: '#3498db', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40, width: '100%' }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17, textAlign: 'center' }}>Fechar</Text>
              </TouchableOpacity>
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
    justifyContent: 'center',
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
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
    gap: 16,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '47%',
    marginBottom: 16,
    paddingVertical: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3498db',
    textAlign: 'center',
  },
  chatActionButton: {
    position: 'relative',
  },
  chatButtonContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 0,
    flex: 1,
    width: '100%',
    maxWidth: 600,
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
  statsScrollView: {
    flex: 1,
    padding: 20,
  },
  statsToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  statsToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 8,
  },
  statsToggleButtonActive: {
    backgroundColor: '#3498db',
  },
  statsToggleText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: 'bold',
  },
  statsToggleTextActive: {
    color: '#fff',
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  loginPromptSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  loginIconContainer: {
    marginBottom: 20,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  loginPromptSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  loginPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A8DFD',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#6A8DFD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginPromptButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 10,
  },
});

export default AccountScreen;
