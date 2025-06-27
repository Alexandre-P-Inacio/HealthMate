import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const WaterTrackerScreen = ({ navigation }) => {
  const [dailyGoal, setDailyGoal] = useState(2000); // ml
  const [currentIntake, setCurrentIntake] = useState(0);
  const [waterHistory, setWaterHistory] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReduceModal, setShowReduceModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [animatedValue] = useState(new Animated.Value(0));

  const quickAmounts = [250, 500, 750, 1000]; // ml

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(animatedValue, {
      toValue: getProgressPercentage(),
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [currentIntake, dailyGoal]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Load daily goal
      const savedGoal = await AsyncStorage.getItem('water_daily_goal');
      if (savedGoal) {
        setDailyGoal(parseInt(savedGoal));
      }

      // Load today's intake
      const todayIntake = await AsyncStorage.getItem(`water_intake_${today}`);
      if (todayIntake) {
        setCurrentIntake(parseInt(todayIntake));
      }

      // Load history
      const history = await AsyncStorage.getItem('water_history');
      if (history) {
        setWaterHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading water data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addWater = async (amount) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newIntake = currentIntake + amount;
      
      setCurrentIntake(newIntake);
      
      // Save to storage
      await AsyncStorage.setItem(`water_intake_${today}`, newIntake.toString());
      
      // Update history
      const timestamp = new Date().toISOString();
      const newEntry = {
        id: Date.now(),
        amount,
        timestamp,
        date: today,
        type: 'add'
      };
      
      const updatedHistory = [newEntry, ...waterHistory.slice(0, 99)];
      setWaterHistory(updatedHistory);
      await AsyncStorage.setItem('water_history', JSON.stringify(updatedHistory));
      
      // Check if goal reached
      if (newIntake >= dailyGoal && (newIntake - amount) < dailyGoal) {
        Alert.alert('🎉 Goal Achieved!', 'Congratulations! You\'ve reached your daily water goal!');
      }
      
      setShowAddModal(false);
      setCustomAmount('');
    } catch (error) {
      console.error('Error adding water:', error);
      Alert.alert('Error', 'Failed to log water intake');
    }
  };

  const reduceWater = async (amount) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const newIntake = Math.max(0, currentIntake - amount);
      
      setCurrentIntake(newIntake);
      
      // Save to storage
      await AsyncStorage.setItem(`water_intake_${today}`, newIntake.toString());
      
      // Update history
      const timestamp = new Date().toISOString();
      const newEntry = {
        id: Date.now(),
        amount: -amount,
        timestamp,
        date: today,
        type: 'reduce'
      };
      
      const updatedHistory = [newEntry, ...waterHistory.slice(0, 99)];
      setWaterHistory(updatedHistory);
      await AsyncStorage.setItem('water_history', JSON.stringify(updatedHistory));
      
      setShowReduceModal(false);
      setCustomAmount('');
    } catch (error) {
      console.error('Error reducing water:', error);
      Alert.alert('Error', 'Failed to reduce water intake');
    }
  };

  const updateDailyGoal = () => {
    Alert.prompt(
      'Daily Water Goal',
      'Set your daily water goal (ml)',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: async (value) => {
            const goal = parseInt(value);
            if (goal && goal > 0) {
              setDailyGoal(goal);
              await AsyncStorage.setItem('water_daily_goal', goal.toString());
            }
          }
        }
      ],
      'plain-text',
      dailyGoal.toString()
    );
  };

  const getProgressPercentage = () => {
    return Math.min((currentIntake / dailyGoal) * 100, 100);
  };

  const getWaterLevel = () => {
    return Math.min((currentIntake / dailyGoal) * 100, 100);
  };

  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return '#4CAF50';
    if (percentage >= 75) return '#8BC34A';
    if (percentage >= 50) return '#FFC107';
    if (percentage >= 25) return '#FF9800';
    return '#F44336';
  };

  const formatAmount = (amount) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}L`;
    }
    return `${amount}ml`;
  };

  const getTodayHistory = () => {
    const today = new Date().toISOString().split('T')[0];
    return waterHistory.filter(item => item.date === today);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#26C6DA" />
        <Text style={styles.loadingText}>Loading water data...</Text>
      </View>
    );
  }

  const todayHistory = getTodayHistory();
  const progressPercentage = getProgressPercentage();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#26C6DA" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#26C6DA', '#00BCD4']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Water Tracker</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={updateDailyGoal}>
          <Ionicons name="settings" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Water Glass Visualization */}
        <View style={styles.glassSection}>
          <View style={styles.glassContainer}>
            <View style={styles.glass}>
              <Animated.View 
                style={[
                  styles.waterFill,
                  {
                    height: animatedValue.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                    backgroundColor: getProgressColor(),
                  }
                ]}
              />
              <View style={styles.glassOverlay}>
                <Text style={styles.intakeText}>{formatAmount(currentIntake)}</Text>
                <Text style={styles.goalText}>of {formatAmount(dailyGoal)}</Text>
                <Text style={styles.percentageText}>{progressPercentage.toFixed(0)}%</Text>
              </View>
            </View>
          </View>
          
          {/* Progress Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="droplet" size={20} color="#26C6DA" />
              <Text style={styles.statValue}>{formatAmount(dailyGoal - currentIntake)}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.statValue}>{todayHistory.length}</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
              <Text style={styles.statValue}>{progressPercentage >= 100 ? '🏆' : '⏳'}</Text>
              <Text style={styles.statLabel}>Goal</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          {/* Add Water */}
          <View style={styles.actionGroup}>
            <Text style={styles.actionTitle}>Add Water</Text>
            <View style={styles.quickGrid}>
              {quickAmounts.map(amount => (
                <TouchableOpacity
                  key={amount}
                  style={[styles.quickButton, styles.addButton]}
                  onPress={() => addWater(amount)}
                >
                  <Ionicons name="add" size={16} color="#26C6DA" />
                  <Text style={styles.quickText}>{formatAmount(amount)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.customButton} onPress={() => setShowAddModal(true)}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.customText}>Custom Amount</Text>
            </TouchableOpacity>
          </View>

          {/* Reduce Water */}
          <View style={styles.actionGroup}>
            <Text style={styles.actionTitle}>Reduce Water</Text>
            <View style={styles.quickGrid}>
              {quickAmounts.map(amount => (
                <TouchableOpacity
                  key={`reduce-${amount}`}
                  style={[styles.quickButton, styles.reduceButton]}
                  onPress={() => reduceWater(amount)}
                  disabled={currentIntake === 0}
                >
                  <Ionicons name="remove" size={16} color="#FF6B6B" />
                  <Text style={[styles.quickText, { color: '#FF6B6B' }]}>{formatAmount(amount)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={[styles.customButton, styles.reduceCustomButton]} 
              onPress={() => setShowReduceModal(true)}
              disabled={currentIntake === 0}
            >
              <Ionicons name="remove-circle" size={20} color="#fff" />
              <Text style={styles.customText}>Custom Amount</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's History</Text>
          {todayHistory.length > 0 ? (
            todayHistory.slice(0, 8).map(item => (
              <View key={item.id} style={styles.historyItem}>
                <View style={[
                  styles.historyIcon,
                  { backgroundColor: item.type === 'add' ? '#E8F5E8' : '#FFE8E8' }
                ]}>
                  <Ionicons 
                    name={item.type === 'add' ? "add" : "remove"} 
                    size={16} 
                    color={item.type === 'add' ? '#4CAF50' : '#FF6B6B'} 
                  />
                </View>
                <View style={styles.historyContent}>
                  <Text style={[
                    styles.historyAmount,
                    { color: item.type === 'add' ? '#4CAF50' : '#FF6B6B' }
                  ]}>
                    {item.type === 'add' ? '+' : ''}{formatAmount(Math.abs(item.amount))}
                  </Text>
                  <Text style={styles.historyTime}>
                    {new Date(item.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="droplet-outline" size={48} color="#B0BEC5" />
              <Text style={styles.emptyText}>No water logged today</Text>
              <Text style={styles.emptySubtext}>Start tracking your hydration!</Text>
            </View>
          )}
        </View>

        {/* Hydration Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💧 Hydration Tips</Text>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Start your day with a glass of water</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Drink water before, during, and after exercise</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Keep a water bottle with you throughout the day</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Set reminders to drink water regularly</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Water Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Water</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Amount in ml"
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setCustomAmount('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.addModalButton}
                onPress={() => {
                  const amount = parseInt(customAmount);
                  if (amount && amount > 0) {
                    addWater(amount);
                  } else {
                    Alert.alert('Invalid Amount', 'Please enter a valid amount');
                  }
                }}
              >
                <Text style={styles.addText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reduce Water Modal */}
      <Modal visible={showReduceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reduce Water</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Amount in ml"
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowReduceModal(false);
                  setCustomAmount('');
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.reduceModalButton}
                onPress={() => {
                  const amount = parseInt(customAmount);
                  if (amount && amount > 0) {
                    reduceWater(amount);
                  } else {
                    Alert.alert('Invalid Amount', 'Please enter a valid amount');
                  }
                }}
              >
                <Text style={styles.reduceText}>Reduce</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  glassSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginVertical: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  glassContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  glass: {
    width: 120,
    height: 200,
    borderWidth: 3,
    borderColor: '#E0E0E0',
    borderRadius: 15,
    backgroundColor: '#F8F9FA',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  waterFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 12,
  },
  glassOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intakeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  goalText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#26C6DA',
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionGroup: {
    marginBottom: 25,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  quickButton: {
    width: '48%',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#26C6DA',
  },
  reduceButton: {
    backgroundColor: '#FFE8E8',
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  quickText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#26C6DA',
    marginLeft: 8,
  },
  customButton: {
    backgroundColor: '#26C6DA',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  reduceCustomButton: {
    backgroundColor: '#FF6B6B',
  },
  customText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyTime: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  tip: {
    paddingVertical: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: width - 60,
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginRight: 10,
  },
  addModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#26C6DA',
    marginLeft: 10,
  },
  reduceModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    marginLeft: 10,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  addText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  reduceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default WaterTrackerScreen; 