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

const { width } = Dimensions.get('window');

const WorkoutTrackerScreen = ({ navigation }) => {
  const [workouts, setWorkouts] = useState([]);
  const [todayWorkouts, setTodayWorkouts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [animatedValue] = useState(new Animated.Value(0));
  const [newWorkout, setNewWorkout] = useState({
    type: '',
    duration: '',
    calories: '',
    notes: '',
    intensity: 'moderate'
  });

  const workoutTypes = [
    { id: 'running', name: 'Running', icon: 'walk', color: '#FF6B6B', emoji: '🏃‍♂️' },
    { id: 'cycling', name: 'Cycling', icon: 'bicycle', color: '#4ECDC4', emoji: '🚴‍♂️' },
    { id: 'swimming', name: 'Swimming', icon: 'water', color: '#45B7D1', emoji: '🏊‍♂️' },
    { id: 'strength', name: 'Strength', icon: 'fitness', color: '#96CEB4', emoji: '💪' },
    { id: 'yoga', name: 'Yoga', icon: 'body', color: '#FFEAA7', emoji: '🧘‍♀️' },
    { id: 'cardio', name: 'Cardio', icon: 'heart', color: '#FD79A8', emoji: '❤️' },
    { id: 'boxing', name: 'Boxing', icon: 'hand-left', color: '#A29BFE', emoji: '🥊' },
    { id: 'dancing', name: 'Dancing', icon: 'musical-notes', color: '#FDCB6E', emoji: '💃' }
  ];

  const intensityLevels = [
    { id: 'light', name: 'Light', color: '#4CAF50' },
    { id: 'moderate', name: 'Moderate', color: '#FF9800' },
    { id: 'intense', name: 'Intense', color: '#F44336' }
  ];

  useEffect(() => {
    loadWorkouts();
  }, []);

  useEffect(() => {
    // Animate stats on load
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [todayWorkouts]);

  const loadWorkouts = async () => {
    try {
      setIsLoading(true);
      const savedWorkouts = await AsyncStorage.getItem('workout_history');
      if (savedWorkouts) {
        const workoutHistory = JSON.parse(savedWorkouts);
        setWorkouts(workoutHistory);
        
        // Filter today's workouts
        const today = new Date().toISOString().split('T')[0];
        const todayData = workoutHistory.filter(workout => workout.date === today);
        setTodayWorkouts(todayData);
      }
    } catch (error) {
      console.error('Error loading workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addWorkout = async () => {
    try {
      if (!newWorkout.type || !newWorkout.duration) {
        Alert.alert('Missing Information', 'Please select workout type and duration');
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();
      
      const workout = {
        id: Date.now(),
        type: newWorkout.type,
        duration: parseInt(newWorkout.duration),
        calories: newWorkout.calories ? parseInt(newWorkout.calories) : estimateCalories(newWorkout.type, parseInt(newWorkout.duration)),
        notes: newWorkout.notes,
        intensity: newWorkout.intensity,
        date: today,
        timestamp
      };

      const updatedWorkouts = [workout, ...workouts];
      setWorkouts(updatedWorkouts);
      
      // Update today's workouts
      const todayData = updatedWorkouts.filter(w => w.date === today);
      setTodayWorkouts(todayData);
      
      // Save to storage
      await AsyncStorage.setItem('workout_history', JSON.stringify(updatedWorkouts));
      
      // Reset form
      setNewWorkout({ type: '', duration: '', calories: '', notes: '', intensity: 'moderate' });
      setShowAddModal(false);
      
      Alert.alert('🎉 Great Job!', 'Workout logged successfully! Keep up the good work!');
    } catch (error) {
      console.error('Error adding workout:', error);
      Alert.alert('Error', 'Failed to log workout');
    }
  };

  const estimateCalories = (workoutType, duration) => {
    const caloriesPerMinute = {
      running: 12,
      cycling: 8,
      swimming: 11,
      strength: 6,
      yoga: 3,
      cardio: 10,
      boxing: 13,
      dancing: 7
    };
    return Math.round((caloriesPerMinute[workoutType] || 8) * duration);
  };

  const deleteWorkout = async (workoutId) => {
    try {
      const updatedWorkouts = workouts.filter(w => w.id !== workoutId);
      setWorkouts(updatedWorkouts);
      
      const today = new Date().toISOString().split('T')[0];
      const todayData = updatedWorkouts.filter(w => w.date === today);
      setTodayWorkouts(todayData);
      
      await AsyncStorage.setItem('workout_history', JSON.stringify(updatedWorkouts));
    } catch (error) {
      console.error('Error deleting workout:', error);
    }
  };

  const getWorkoutTypeInfo = (typeId) => {
    return workoutTypes.find(type => type.id === typeId) || workoutTypes[0];
  };

  const getIntensityInfo = (intensityId) => {
    return intensityLevels.find(level => level.id === intensityId) || intensityLevels[1];
  };

  const getTodayStats = () => {
    const totalDuration = todayWorkouts.reduce((sum, w) => sum + w.duration, 0);
    const totalCalories = todayWorkouts.reduce((sum, w) => sum + (w.calories || 0), 0);
    const avgIntensity = todayWorkouts.length > 0 ? 
      todayWorkouts.filter(w => w.intensity === 'intense').length > todayWorkouts.length / 2 ? 'High' :
      todayWorkouts.filter(w => w.intensity === 'light').length > todayWorkouts.length / 2 ? 'Low' : 'Moderate'
      : 'None';
    
    return { 
      totalDuration, 
      totalCalories, 
      workoutCount: todayWorkouts.length,
      avgIntensity
    };
  };

  const formatDuration = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

  const getMotivationalMessage = () => {
    const stats = getTodayStats();
    if (stats.workoutCount === 0) return "Ready to start your fitness journey? 💪";
    if (stats.workoutCount === 1) return "Great start! Keep the momentum going! 🔥";
    if (stats.workoutCount >= 2) return "You're on fire today! Amazing dedication! 🏆";
    return "Every step counts! You've got this! ⭐";
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#66BB6A" />
        <Text style={styles.loadingText}>Loading workout data...</Text>
      </View>
    );
  }

  const todayStats = getTodayStats();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#66BB6A" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient colors={['#66BB6A', '#4CAF50']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Tracker</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Motivational Banner */}
        <View style={styles.motivationBanner}>
          <Text style={styles.motivationText}>{getMotivationalMessage()}</Text>
        </View>

        {/* Today's Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          <View style={styles.statsGrid}>
            <Animated.View style={[
              styles.statCard,
              {
                transform: [{
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                }]
              }
            ]}>
              <LinearGradient colors={['#FF6B6B', '#FF8E8E']} style={styles.statGradient}>
                <Ionicons name="time" size={24} color="#fff" />
                <Text style={styles.statValue}>{formatDuration(todayStats.totalDuration)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </LinearGradient>
            </Animated.View>
            
            <Animated.View style={[
              styles.statCard,
              {
                transform: [{
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                }]
              }
            ]}>
              <LinearGradient colors={['#FF9800', '#FFB74D']} style={styles.statGradient}>
                <Ionicons name="flame" size={24} color="#fff" />
                <Text style={styles.statValue}>{todayStats.totalCalories}</Text>
                <Text style={styles.statLabel}>Calories</Text>
              </LinearGradient>
            </Animated.View>
            
            <Animated.View style={[
              styles.statCard,
              {
                transform: [{
                  scale: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                }]
              }
            ]}>
              <LinearGradient colors={['#2196F3', '#64B5F6']} style={styles.statGradient}>
                <Ionicons name="fitness" size={24} color="#fff" />
                <Text style={styles.statValue}>{todayStats.workoutCount}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </LinearGradient>
            </Animated.View>
          </View>
          
          <View style={styles.intensityIndicator}>
            <Text style={styles.intensityLabel}>Today's Intensity: </Text>
            <Text style={[
              styles.intensityValue,
              { color: todayStats.avgIntensity === 'High' ? '#F44336' : 
                       todayStats.avgIntensity === 'Low' ? '#4CAF50' : '#FF9800' }
            ]}>
              {todayStats.avgIntensity}
            </Text>
          </View>
        </View>

        {/* Today's Workouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Workouts</Text>
          {todayWorkouts.length > 0 ? (
            todayWorkouts.map((item, index) => {
              const typeInfo = getWorkoutTypeInfo(item.type);
              const intensityInfo = getIntensityInfo(item.intensity);
              return (
                <View key={item.id} style={styles.workoutItem}>
                  <View style={[styles.workoutIcon, { backgroundColor: typeInfo.color }]}>
                    <Text style={styles.workoutEmoji}>{typeInfo.emoji}</Text>
                  </View>
                  <View style={styles.workoutContent}>
                    <View style={styles.workoutHeader}>
                      <Text style={styles.workoutName}>{typeInfo.name}</Text>
                      <View style={[styles.intensityBadge, { backgroundColor: intensityInfo.color }]}>
                        <Text style={styles.intensityBadgeText}>{intensityInfo.name}</Text>
                      </View>
                    </View>
                    <Text style={styles.workoutDetails}>
                      {formatDuration(item.duration)} • {item.calories} cal
                    </Text>
                    {item.notes && <Text style={styles.workoutNotes}>"{item.notes}"</Text>}
                    <Text style={styles.workoutTime}>
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      Alert.alert(
                        'Delete Workout',
                        'Are you sure you want to delete this workout?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout(item.id) }
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyWorkouts}>
              <Text style={styles.emptyEmoji}>🏃‍♂️</Text>
              <Text style={styles.emptyText}>No workouts logged today</Text>
              <Text style={styles.emptySubtext}>Start your fitness journey!</Text>
              <TouchableOpacity style={styles.startButton} onPress={() => setShowAddModal(true)}>
                <LinearGradient colors={['#66BB6A', '#4CAF50']} style={styles.startGradient}>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.startText}>Log Workout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Fitness Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 Fitness Tips</Text>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Aim for at least 150 minutes of moderate exercise per week</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Include both cardio and strength training in your routine</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Stay hydrated before, during, and after workouts</Text>
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipText}>• Allow rest days for proper muscle recovery</Text>
          </View>
        </View>
      </ScrollView>

      {/* Add Workout Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log New Workout</Text>
            
            {/* Workout Type Selection */}
            <Text style={styles.fieldLabel}>Workout Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesContainer}>
              {workoutTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeButton,
                    { backgroundColor: type.color },
                    newWorkout.type === type.id && styles.selectedType
                  ]}
                  onPress={() => setNewWorkout({ ...newWorkout, type: type.id })}
                >
                  <Text style={styles.typeEmoji}>{type.emoji}</Text>
                  <Text style={styles.typeText}>{type.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Duration Input */}
            <Text style={styles.fieldLabel}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 30"
              value={newWorkout.duration}
              onChangeText={(text) => setNewWorkout({ ...newWorkout, duration: text })}
              keyboardType="numeric"
            />
            
            {/* Intensity Selection */}
            <Text style={styles.fieldLabel}>Intensity Level</Text>
            <View style={styles.intensityContainer}>
              {intensityLevels.map(level => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.intensityButton,
                    { borderColor: level.color },
                    newWorkout.intensity === level.id && { backgroundColor: level.color }
                  ]}
                  onPress={() => setNewWorkout({ ...newWorkout, intensity: level.id })}
                >
                  <Text style={[
                    styles.intensityButtonText,
                    newWorkout.intensity === level.id && { color: '#fff' }
                  ]}>
                    {level.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Calories Input */}
            <Text style={styles.fieldLabel}>Calories (optional - auto-estimated if empty)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 200"
              value={newWorkout.calories}
              onChangeText={(text) => setNewWorkout({ ...newWorkout, calories: text })}
              keyboardType="numeric"
            />
            
            {/* Notes Input */}
            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="How did it feel? Any achievements?"
              value={newWorkout.notes}
              onChangeText={(text) => setNewWorkout({ ...newWorkout, notes: text })}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setNewWorkout({ type: '', duration: '', calories: '', notes: '', intensity: 'moderate' });
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={addWorkout}>
                <LinearGradient colors={['#66BB6A', '#4CAF50']} style={styles.saveGradient}>
                  <Text style={styles.saveText}>Save Workout</Text>
                </LinearGradient>
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
  addButton: {
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
  motivationBanner: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginVertical: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
  },
  statGradient: {
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  intensityIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  intensityLabel: {
    fontSize: 14,
    color: '#666',
  },
  intensityValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  workoutItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  workoutIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  workoutEmoji: {
    fontSize: 24,
  },
  workoutContent: {
    flex: 1,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  intensityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  intensityBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  workoutDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  workoutNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  workoutTime: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
    marginTop: 5,
  },
  emptyWorkouts: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  startButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  startGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  startText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
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
    width: width - 40,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  typesContainer: {
    marginBottom: 10,
  },
  typeButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginRight: 10,
    minWidth: 80,
  },
  selectedType: {
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ scale: 1.05 }],
  },
  typeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  intensityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  intensityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginRight: 10,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 10,
  },
  saveGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default WorkoutTrackerScreen; 