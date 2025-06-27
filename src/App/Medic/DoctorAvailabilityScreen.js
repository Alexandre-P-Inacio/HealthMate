import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator, ToastAndroid, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DoctorAvailabilityService } from '../../services/DoctorAvailabilityService';
import DataUser from '../../../navigation/DataUser';

const HOURS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', 
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'
];

const WEEKDAYS = [
  { key: 'monday', label: 'Monday', idx: 1 },
  { key: 'tuesday', label: 'Tuesday', idx: 2 },
  { key: 'wednesday', label: 'Wednesday', idx: 3 },
  { key: 'thursday', label: 'Thursday', idx: 4 },
  { key: 'friday', label: 'Friday', idx: 5 },
  { key: 'saturday', label: 'Saturday', idx: 6 },
  { key: 'sunday', label: 'Sunday', idx: 0 },
];

const defaultSchedule = {
  monday: { start: '', end: '', enabled: false },
  tuesday: { start: '', end: '', enabled: false },
  wednesday: { start: '', end: '', enabled: false },
  thursday: { start: '', end: '', enabled: false },
  friday: { start: '', end: '', enabled: false },
  saturday: { start: '', end: '', enabled: false },
  sunday: { start: '', end: '', enabled: false }
};

function showToast(msg) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert(msg);
}

const useDoctorAvailability = (navigation) => {
  const [weeklySchedule, setWeeklySchedule] = useState(defaultSchedule);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, day: null, type: null });
  const [customTime, setCustomTime] = useState('');
  const fetchedOnce = useRef(false);

  useEffect(() => {
    const loadAvailability = async () => {
    if (!fetchedOnce.current) {
        console.log('🚀 Initializing Doctor Availability screen...');
        await fetchAvailability();
      fetchedOnce.current = true;
    }
    };
    
    loadAvailability();
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching doctor availability from database...');
      const result = await DoctorAvailabilityService.getMyAvailability();
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('✅ Found existing availability data:', result.data);
        
        // Start with all days disabled
        const schedule = { ...defaultSchedule };
        
        // Filter for recurring availability slots that have valid times
        const recurringSlots = result.data.filter(slot => 
          slot.is_recurring && 
          slot.start_time && 
          slot.end_time &&
          slot.is_available
        );
        
        console.log('📅 Processing recurring slots:', recurringSlots);
        
        // Process each recurring slot
        recurringSlots.forEach(slot => {
          const dayKey = WEEKDAYS.find(d => d.idx === slot.day_of_week)?.key;
          if (dayKey) {
            const startTime = slot.start_time.substring(0, 5); // Extract HH:MM
            const endTime = slot.end_time.substring(0, 5);     // Extract HH:MM
            
            schedule[dayKey] = {
              start: startTime,
              end: endTime,
              enabled: true
            };
            
            console.log(`✅ Set ${dayKey}: ${startTime} - ${endTime}`);
          }
        });
        
        // Log final schedule state
        const enabledDays = Object.keys(schedule).filter(day => schedule[day].enabled);
        const disabledDays = Object.keys(schedule).filter(day => !schedule[day].enabled);
        
        console.log('📊 Final schedule summary:');
        console.log('  - Enabled days:', enabledDays);
        console.log('  - Disabled days:', disabledDays);
        
        setWeeklySchedule(schedule);
      } else {
        console.log('📭 No existing availability found, using default empty schedule');
        setWeeklySchedule(defaultSchedule);
      }
    } catch (err) {
      console.error('❌ Error fetching availability:', err);
      setWeeklySchedule(defaultSchedule);
      Alert.alert('Error', 'Failed to load your availability. Please try again.');
    }
    setLoading(false);
  };

  const saveAvailability = async () => {
    setLoading(true);
    try {
      const currentUser = DataUser.getUserData();
      if (!currentUser || !currentUser.id) {
        setLoading(false);
        Alert.alert('Error', 'User not logged in. Please log in again.');
        return;
      }

      console.log('💾 Starting to save availability...');
      console.log('Current schedule:', weeklySchedule);

      // Get current availability from database
      const result = await DoctorAvailabilityService.getAvailabilityByDoctorId(currentUser.id);
      
      if (result.success) {
        // Delete all existing recurring slots
        const existing = result.data.filter(a => a.is_recurring);
        console.log(`🗑️ Deleting ${existing.length} existing recurring slots...`);
        
        for (const slot of existing) {
          const del = await DoctorAvailabilityService.deleteAvailability(slot.id);
          if (!del.success) {
            console.error('Failed to delete slot:', slot.id, del.error);
            throw new Error(del.error || 'Error deleting existing availability.');
          }
        }
        console.log('✅ Successfully deleted all existing slots');
      }

      // Count enabled days and prepare to save
      const enabledDays = Object.keys(weeklySchedule).filter(key => weeklySchedule[key].enabled);
      console.log(`💾 Saving ${enabledDays.length} enabled days:`, enabledDays);

      // Insert new slots for enabled days only
      let savedCount = 0;
      for (const { key, idx } of WEEKDAYS) {
        const daySchedule = weeklySchedule[key];
        
        if (daySchedule.enabled && daySchedule.start && daySchedule.end) {
          const availabilityData = {
            day_of_week: idx,
            start_time: daySchedule.start + ':00',
            end_time: daySchedule.end + ':00',
            is_recurring: true,
            is_available: true
          };
          
          console.log(`💾 Saving ${key}:`, availabilityData);
          
          const add = await DoctorAvailabilityService.addAvailability(availabilityData);
          if (!add.success) {
            console.error(`Failed to save ${key}:`, add.error);
            throw new Error(add.error || `Error adding availability for ${key}.`);
          }
          savedCount++;
          console.log(`✅ Successfully saved ${key}`);
        } else {
          console.log(`⏭️ Skipping ${key} (disabled or incomplete)`);
        }
      }

      console.log(`🎉 Successfully saved ${savedCount} days of availability`);
      setLoading(false);
      showToast(`Availability saved! ${savedCount} days configured.`);
      
      // Refresh data from database to ensure UI is in sync
      await fetchAvailability();
      
      // Navigate back to doctor dashboard after successful save
      setTimeout(() => {
        navigation.goBack();
      }, 1500); // Give user time to see the success message
      
    } catch (err) {
      console.error('❌ Error saving availability:', err);
      setLoading(false);
      Alert.alert('Error', err.message || 'Unexpected error saving availability.');
    }
  };

  const toggleDay = (day) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: { 
        ...prev[day], 
        enabled: !prev[day].enabled,
        start: prev[day].enabled ? '' : '09:00',
        end: prev[day].enabled ? '' : '17:00'
      }
    }));
  };

  const handleSelectHour = (day, type, hour) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [type]: hour }
    }));
  };

  const openCustomModal = (day, type) => {
    setModal({ visible: true, day, type });
    setCustomTime(weeklySchedule[day][type] || '');
  };

  const saveCustomHour = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(customTime)) {
      showToast('Invalid format. Use HH:MM, e.g.: 08:30');
      return;
    }
    setWeeklySchedule(prev => ({
      ...prev,
      [modal.day]: { ...prev[modal.day], [modal.type]: customTime }
    }));
    setModal({ visible: false, day: null, type: null });
  };

  const copyToAllDays = (sourceDay) => {
    const sourceSchedule = weeklySchedule[sourceDay];
    if (!sourceSchedule.enabled) return;

    Alert.alert(
      'Copy Schedule',
      `Copy ${sourceDay}'s schedule (${sourceSchedule.start} - ${sourceSchedule.end}) to all other days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => {
            setWeeklySchedule(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(day => {
                if (day !== sourceDay) {
                  updated[day] = {
                    start: sourceSchedule.start,
                    end: sourceSchedule.end,
                    enabled: true
                  };
                }
              });
              return updated;
            });
          }
        }
      ]
    );
  };

  return {
    weeklySchedule, loading, modal, customTime,
    saveAvailability, handleSelectHour, openCustomModal, setCustomTime, setModal, 
    saveCustomHour, toggleDay, copyToAllDays
  };
};

const TimeSelector = ({ label, value, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.timeSelector, disabled && styles.timeSelectorDisabled]} 
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={[styles.timeSelectorLabel, disabled && styles.timeSelectorLabelDisabled]}>
      {label}
    </Text>
    <View style={styles.timeSelectorValue}>
      <Text style={[styles.timeSelectorText, disabled && styles.timeSelectorTextDisabled]}>
        {value || 'Select'}
      </Text>
      <Ionicons 
        name="chevron-down" 
        size={20} 
        color={disabled ? '#ccc' : '#3498db'} 
      />
    </View>
  </TouchableOpacity>
);

const DayCard = ({ dayKey, label, schedule, onToggle, onSelectHour, onOpenCustom, onCopyToAll }) => {
  const [showTimeModal, setShowTimeModal] = useState({ visible: false, type: null });

  const selectTime = (type) => {
    setShowTimeModal({ visible: true, type });
  };

  const TimePickerModal = () => (
    <Modal
      visible={showTimeModal.visible}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTimeModal({ visible: false, type: null })}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.timeModalContent}>
          <View style={styles.timeModalHeader}>
            <Text style={styles.timeModalTitle}>
              Select {showTimeModal.type === 'start' ? 'Start' : 'End'} Time
            </Text>
            <TouchableOpacity onPress={() => setShowTimeModal({ visible: false, type: null })}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.timeOptionsContainer} showsVerticalScrollIndicator={false}>
            {HOURS.map(hour => (
              <TouchableOpacity
                key={hour}
                style={[
                  styles.timeOption,
                  schedule[showTimeModal.type] === hour && styles.timeOptionSelected
                ]}
                onPress={() => {
                  onSelectHour(dayKey, showTimeModal.type, hour);
                  setShowTimeModal({ visible: false, type: null });
                }}
              >
                <Text style={[
                  styles.timeOptionText,
                  schedule[showTimeModal.type] === hour && styles.timeOptionTextSelected
                ]}>
                  {hour}
                </Text>
                {schedule[showTimeModal.type] === hour && (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity 
            style={styles.customTimeButton}
            onPress={() => {
              setShowTimeModal({ visible: false, type: null });
              onOpenCustom(dayKey, showTimeModal.type);
            }}
          >
            <Ionicons name="create-outline" size={20} color="#6c47ff" />
            <Text style={styles.customTimeButtonText}>Enter Custom Time</Text>
      </TouchableOpacity>
    </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <View style={styles.dayTitleContainer}>
          <TouchableOpacity
            style={[styles.dayToggle, schedule.enabled && styles.dayToggleActive]}
            onPress={() => onToggle(dayKey)}
          >
            <Ionicons 
              name={schedule.enabled ? "checkmark" : "add"} 
              size={20} 
              color={schedule.enabled ? "#fff" : "#3498db"} 
            />
          </TouchableOpacity>
          <Text style={[styles.dayTitle, !schedule.enabled && styles.dayTitleDisabled]}>
            {label}
          </Text>
        </View>
        {schedule.enabled && (
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => onCopyToAll(dayKey)}
          >
            <Ionicons name="copy-outline" size={18} color="#6c47ff" />
          </TouchableOpacity>
        )}
      </View>

      {schedule.enabled && (
        <View style={styles.timeContainer}>
          <TimeSelector
            label="Start Time"
            value={schedule.start}
            onPress={() => selectTime('start')}
            disabled={!schedule.enabled}
          />
          <View style={styles.timeSeparator}>
            <Text style={styles.timeSeparatorText}>to</Text>
    </View>
          <TimeSelector
            label="End Time"
            value={schedule.end}
            onPress={() => selectTime('end')}
            disabled={!schedule.enabled}
          />
        </View>
      )}

      <TimePickerModal />
  </View>
);
};

const DoctorAvailabilityScreen = ({ navigation }) => {
  const {
    weeklySchedule, loading, modal, customTime,
    saveAvailability, handleSelectHour, openCustomModal, setCustomTime, setModal, 
    saveCustomHour, toggleDay, copyToAllDays
  } = useDoctorAvailability(navigation);

  const enabledDaysCount = Object.values(weeklySchedule).filter(day => day.enabled).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#3498db" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Weekly Availability</Text>
          <Text style={styles.headerSubtitle}>
            {enabledDaysCount} day{enabledDaysCount !== 1 ? 's' : ''} configured
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {WEEKDAYS.map(({ key, label }) => (
          <DayCard
            key={key}
            dayKey={key}
            label={label}
            schedule={weeklySchedule[key]}
            onToggle={toggleDay}
            onSelectHour={handleSelectHour}
            onOpenCustom={openCustomModal}
            onCopyToAll={copyToAllDays}
          />
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]} 
          onPress={saveAvailability} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>Save Availability</Text>
            </>
          )}
      </TouchableOpacity>
      </View>

      {/* Custom Time Modal */}
      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setModal({ visible: false, day: null, type: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Time</Text>
            <Text style={styles.modalLabel}>
              {modal.type === 'start' ? 'Start' : 'End'} Time (HH:MM)
            </Text>
            <TextInput
              style={styles.modalInput}
              value={customTime}
              onChangeText={setCustomTime}
              placeholder="08:30"
              keyboardType="numeric"
              maxLength={5}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalBtnCancel} 
                onPress={() => setModal({ visible: false, day: null, type: null })}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={saveCustomHour}>
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3498db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayToggleActive: {
    backgroundColor: '#3498db',
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  dayTitleDisabled: {
    color: '#94a3b8',
  },
  copyButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSelector: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timeSelectorDisabled: {
    opacity: 0.5,
  },
  timeSelectorLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  timeSelectorLabelDisabled: {
    color: '#cbd5e1',
  },
  timeSelectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeSelectorText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  timeSelectorTextDisabled: {
    color: '#cbd5e1',
  },
  timeSeparator: {
    marginHorizontal: 12,
    alignItems: 'center',
  },
  timeSeparatorText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  saveButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '85%',
    maxHeight: '70%',
    elevation: 5,
  },
  timeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  timeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  timeOptionsContainer: {
    maxHeight: 300,
  },
  timeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timeOptionSelected: {
    backgroundColor: '#3498db',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
  },
  timeOptionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  customTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  customTimeButtonText: {
    fontSize: 16,
    color: '#6c47ff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#f8fafc',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  modalBtnCancelText: {
    color: '#64748b',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnSave: {
    flex: 1,
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalBtnSaveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DoctorAvailabilityScreen; 