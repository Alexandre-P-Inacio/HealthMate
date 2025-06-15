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
  SafeAreaView,
  Dimensions
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import DataUser from '../../../navigation/DataUser';
import Navbar from '../../Components/Navbar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import supabase from '../../../supabase';
import { useFocusEffect } from '@react-navigation/native';

const AccountScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [statsView, setStatsView] = useState('weekly'); // 'weekly' or 'monthly'
  const [isPremiumPlus, setIsPremiumPlus] = useState(false);
  const [isMedic, setIsMedic] = useState(false);
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
        // Check if user is premium plus (ID 16)
        setIsPremiumPlus(data.id === 16);
        // Check if user is a medic
        setIsMedic(data.role === 'medic');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
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
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                <Image source={profileImage} style={styles.profileImage} />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userData.fullname || 'User'}</Text>
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
                <Text style={styles.contactText}>{userData.email || 'N/A'}</Text>
              </View>
              <View style={styles.contactCard}>
                <FontAwesome name="phone" size={16} color="#3498db" />
                <Text style={styles.contactText}>{userData.phone || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.gridActionsContainer}>
            {isMedic ? (
              <>
                <TouchableOpacity 
                  style={[styles.gridActionButton, styles.gridDashboard]}
                  onPress={() => navigation.navigate('DoctorDashboard')}
                >
                  <FontAwesome name="stethoscope" size={36} color="#fff" style={styles.gridActionIcon} />
                  <Text style={styles.gridActionText}>Dashboard</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.gridActionButton}
                  onPress={() => navigation.navigate('AppointmentsScreen')}
                >
                  <FontAwesome name="calendar" size={30} color="#3498db" style={styles.gridActionIcon} />
                  <Text style={styles.gridActionText}>Appointments</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.gridActionButton}
                  onPress={() => navigation.navigate('DoctorDetailsScreen')}
                >
                  <FontAwesome name="user-md" size={30} color="#3498db" style={styles.gridActionIcon} />
                  <Text style={styles.gridActionText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.gridActionButton}
                  onPress={() => {
                    fetchMedicationStats();
                    setStatsModalVisible(true);
                  }}
                >
                  <FontAwesome name="bar-chart" size={30} color="#3498db" style={styles.gridActionIcon} />
                  <Text style={styles.gridActionText}>Statistics</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.gridActionButton} onPress={() => navigation.navigate('DoctorsScreen')}>
                  <FontAwesome name="user-md" size={30} color="#3498db" style={styles.gridActionIcon} />
                  <Text style={styles.gridActionText}>Doctors</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.gridActionButton} onPress={() => navigation.navigate('InformationScreen')}>
                  <FontAwesome name="info-circle" size={30} color="#3498db" style={styles.gridActionIcon} />
                  <Text style={styles.gridActionText}>Information</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity 
              style={styles.gridActionButton}
              onPress={() => setPremiumModalVisible(true)}
            >
              <FontAwesome name="star" size={30} color={isPremiumPlus ? "#FFD700" : "#3498db"} style={styles.gridActionIcon} />
              <Text style={styles.gridActionText}>{isPremiumPlus ? "Premium Plus" : "Premium"}</Text>
            </TouchableOpacity>
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

            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
            >
              <FontAwesome name="sign-out" size={18} color="#e74c3c" />
              <Text style={[styles.buttonText, styles.logoutText]}>Logout</Text>
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
                      <PieChart
                        data={
                          Array.isArray(medicationStats.statusDistribution) && medicationStats.statusDistribution.length > 0
                            ? medicationStats.statusDistribution.map(s => ({
                                ...s,
                                count: Number.isFinite(s.count) ? s.count : 0
                              }))
                            : [
                                { name: 'Taken', count: 0, color: '#2ecc71', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                                { name: 'Missed', count: 0, color: '#e74c3c', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                                { name: 'Pending', count: 0, color: '#f1c40f', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                              ]
                        }
                        width={Dimensions.get('window').width - 40}
                        height={220}
                        chartConfig={{
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor="count"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                      />
                    </View>
                    {/* Weekly Trend Chart */}
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>Weekly Trend</Text>
                      <LineChart
                        data={{
                          labels:
                            Array.isArray(medicationStats.weeklyData) && medicationStats.weeklyData.length > 0
                              ? medicationStats.weeklyData.map(d => d.date.split('-')[2])
                              : ['1', '2', '3', '4', '5', '6', '7'],
                          datasets: [
                            {
                              data:
                                Array.isArray(medicationStats.weeklyData) && medicationStats.weeklyData.length > 0
                                  ? medicationStats.weeklyData.map(d => Number.isFinite(d.taken) ? d.taken : 0)
                                  : [0, 0, 0, 0, 0, 0, 0],
                              color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                              strokeWidth: 2
                            },
                            {
                              data:
                                Array.isArray(medicationStats.weeklyData) && medicationStats.weeklyData.length > 0
                                  ? medicationStats.weeklyData.map(d => Number.isFinite(d.missed) ? d.missed : 0)
                                  : [0, 0, 0, 0, 0, 0, 0],
                              color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                              strokeWidth: 2
                            }
                          ]
                        }}
                        width={Dimensions.get('window').width - 40}
                        height={220}
                        chartConfig={{
                          backgroundColor: '#ffffff',
                          backgroundGradientFrom: '#ffffff',
                          backgroundGradientTo: '#ffffff',
                          decimalPlaces: 0,
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          style: {
                            borderRadius: 16
                          }
                        }}
                        bezier
                        style={{
                          marginVertical: 8,
                          borderRadius: 16
                        }}
                      />
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
                      <PieChart
                        data={(() => {
                          if (Array.isArray(medicationStats.monthlyData) && medicationStats.monthlyData.length > 0) {
                            const taken = medicationStats.monthlyData.reduce((acc, d) => acc + (Number.isFinite(d.taken) ? d.taken : 0), 0);
                            const missed = medicationStats.monthlyData.reduce((acc, d) => acc + (Number.isFinite(d.missed) ? d.missed : 0), 0);
                            const pending = medicationStats.monthlyData.reduce((acc, d) => acc + (Number.isFinite(d.pending) ? d.pending : 0), 0);
                            return [
                              { name: 'Taken', count: taken, color: '#2ecc71', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                              { name: 'Missed', count: missed, color: '#e74c3c', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                              { name: 'Pending', count: pending, color: '#f1c40f', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                            ];
                          } else {
                            return [
                              { name: 'Taken', count: 0, color: '#2ecc71', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                              { name: 'Missed', count: 0, color: '#e74c3c', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                              { name: 'Pending', count: 0, color: '#f1c40f', legendFontColor: '#7F7F7F', legendFontSize: 12 },
                            ];
                          }
                        })()}
                        width={Dimensions.get('window').width - 40}
                        height={220}
                        chartConfig={{
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                        }}
                        accessor="count"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                      />
                    </View>
                    {/* Monthly Trend Chart */}
                    <View style={styles.chartContainer}>
                      <Text style={styles.chartTitle}>Monthly Trend (Taken/Missed)</Text>
                      <BarChart
                        data={{
                          labels:
                            Array.isArray(medicationStats.monthlyData) && medicationStats.monthlyData.length > 0
                              ? medicationStats.monthlyData.map(d => d.date.split('-')[2])
                              : ['1', '2', '3', '4', '5', '6', '7'],
                          datasets: [
                            {
                              data:
                                Array.isArray(medicationStats.monthlyData) && medicationStats.monthlyData.length > 0
                                  ? medicationStats.monthlyData.map(d => Number.isFinite(d.taken) ? d.taken : 0)
                                  : [0, 0, 0, 0, 0, 0, 0],
                              color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
                            },
                            {
                              data:
                                Array.isArray(medicationStats.monthlyData) && medicationStats.monthlyData.length > 0
                                  ? medicationStats.monthlyData.map(d => Number.isFinite(d.missed) ? d.missed : 0)
                                  : [0, 0, 0, 0, 0, 0, 0],
                              color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
                            }
                          ]
                        }}
                        width={Dimensions.get('window').width - 40}
                        height={220}
                        yAxisLabel=""
                        chartConfig={{
                          backgroundColor: '#fff',
                          backgroundGradientFrom: '#fff',
                          backgroundGradientTo: '#fff',
                          decimalPlaces: 0,
                          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                          style: {
                            borderRadius: 16
                          }
                        }}
                        style={{
                          marginVertical: 8,
                          borderRadius: 16
                        }}
                      />
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Premium Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={premiumModalVisible}
          onRequestClose={() => setPremiumModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
              <View style={styles.modalHeader}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setPremiumModalVisible(false)}
                >
                  <FontAwesome name="times" size={24} color="#666" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Upgrade to Premium</Text>
                <View style={styles.modalHeaderRight} />
              </View>

              <ScrollView style={styles.premiumScroll}>
                {/* Premium Plan */}
                <View style={styles.premiumCard}>
                  <View style={styles.premiumHeader}>
                    <FontAwesome name="star" size={24} color="#FFD700" />
                    <Text style={styles.premiumTitle}>Premium</Text>
                    <Text style={styles.premiumPrice}>$9.99/month</Text>
                  </View>
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>Unlimited medication tracking</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>Advanced statistics and insights</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>Priority support</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>Ad-free experience</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.subscribeButton, isPremiumPlus && styles.disabledButton]}
                    disabled={isPremiumPlus}
                  >
                    <Text style={styles.subscribeButtonText}>
                      {isPremiumPlus ? "Current Plan" : "Subscribe Now"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Premium Plus Plan */}
                <View style={[styles.premiumCard, styles.premiumPlusCard]}>
                  <View style={styles.premiumHeader}>
                    <FontAwesome name="star" size={24} color="#FFD700" />
                    <Text style={styles.premiumTitle}>Premium Plus</Text>
                    <Text style={styles.premiumPrice}>$19.99/month</Text>
                  </View>
                  <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>All Premium features</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>Personal health coach</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>Custom medication reports</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>Family account sharing</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <FontAwesome name="check-circle" size={16} color="#2ecc71" />
                      <Text style={styles.featureText}>24/7 emergency support</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.subscribeButton, styles.premiumPlusButton, isPremiumPlus && styles.disabledButton]}
                    disabled={isPremiumPlus}
                  >
                    <Text style={styles.subscribeButtonText}>
                      {isPremiumPlus ? "Current Plan" : "Subscribe Now"}
                    </Text>
                  </TouchableOpacity>
                </View>
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
  gridActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
    marginHorizontal: 20,
    gap: 16,
  },
  gridActionButton: {
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
  gridDashboard: {
    backgroundColor: '#3498db',
  },
  gridActionIcon: {
    marginBottom: 8,
  },
  gridActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3498db',
    textAlign: 'center',
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
  premiumScroll: {
    padding: 20,
  },
  premiumCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumPlusCard: {
    backgroundColor: '#F8F9FF',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  premiumHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
    marginBottom: 5,
  },
  premiumPrice: {
    fontSize: 20,
    color: '#3498db',
    fontWeight: '600',
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 10,
  },
  subscribeButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  premiumPlusButton: {
    backgroundColor: '#2c3e50',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.8,
  },
});

export default AccountScreen;
