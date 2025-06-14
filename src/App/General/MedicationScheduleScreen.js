import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import MedicationService from '../../services/MedicationService';

const MedicationScheduleScreen = ({ navigation }) => {
  const [medications, setMedications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentScheduleId, setCurrentScheduleId] = useState(null);
  
  const [medicationData, setMedicationData] = useState({
    name: '',
    dosage: '',
    date: new Date(),
    time: new Date(),
    frequency: 'once'
  });
  
  useEffect(() => {
    loadMedications();
  }, []);
  
  const loadMedications = async () => {
    try {
      setIsLoading(true);
      const data = await MedicationService.getUserMedicationSchedules();
      setMedications(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load medications');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAddMedication = async () => {
    if (!medicationData.name) {
      Alert.alert('Error', 'Please enter a medication name');
      return;
    }
    
    try {
      setIsLoading(true);
      
      if (isEditing && currentScheduleId) {
        await MedicationService.updateMedicationSchedule(currentScheduleId, {
          name: medicationData.name,
          dosage: medicationData.dosage,
          date: medicationData.date.toISOString().split('T')[0],
          time: medicationData.time.toLocaleTimeString('en-US', { hour12: false }),
          frequency: medicationData.frequency
        });
        
        Alert.alert('Success', 'Medication updated successfully');
      } else {
        await MedicationService.addMedicationSchedule({
          name: medicationData.name,
          dosage: medicationData.dosage,
          date: medicationData.date.toISOString().split('T')[0],
          time: medicationData.time.toLocaleTimeString('en-US', { hour12: false }),
          frequency: medicationData.frequency
        });
        
        Alert.alert('Success', 'Medication added successfully');
      }
      
      // Resetar os campos e fechar o modal
      resetForm();
      setShowModal(false);
      
      // Recarregar a lista
      loadMedications();
    } catch (error) {
      Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} medication`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEdit = (medication) => {
    setIsEditing(true);
    setCurrentScheduleId(medication.id);
    
    // Converter string de data e hora para objetos Date
    const scheduledDate = new Date(medication.scheduled_date);
    const timeArray = medication.scheduled_time.split(':');
    const scheduledTime = new Date();
    scheduledTime.setHours(parseInt(timeArray[0], 10));
    scheduledTime.setMinutes(parseInt(timeArray[1], 10));
    
    setMedicationData({
      name: medication.medication_name,
      dosage: medication.dosage || '',
      date: scheduledDate,
      time: scheduledTime,
      frequency: medication.frequency || 'once'
    });
    
    setShowModal(true);
  };
  
  const handleDelete = async (scheduleId) => {
    try {
      setIsLoading(true);
      await MedicationService.deleteMedicationSchedule(scheduleId);
      Alert.alert('Success', 'Medication removed successfully');
      loadMedications();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete medication');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const confirmDelete = (scheduleId) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this medication schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(scheduleId) }
      ]
    );
  };
  
  const resetForm = () => {
    setMedicationData({
      name: '',
      dosage: '',
      date: new Date(),
      time: new Date(),
      frequency: 'once'
    });
    setIsEditing(false);
    setCurrentScheduleId(null);
  };
  
  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setMedicationData({...medicationData, date: selectedDate});
    }
  };
  
  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (event?.type === 'dismissed') {
      return;
    }
    if (selectedTime) {
      setMedicationData({...medicationData, time: selectedTime});
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medication Schedule</Text>
        <View style={{width: 40}} />
      </View>
      
      <ScrollView contentContainerStyle={styles.medicationList}>
        {medications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={70} color="#6A8DFD" />
            <Text style={styles.emptyText}>No medications scheduled</Text>
            <Text style={styles.emptySubText}>Add your first medication schedule</Text>
          </View>
        ) : (
          medications.map(med => (
            <View key={med.id} style={styles.medicationItem}>
              <View style={styles.medicationInfo}>
                <Text style={styles.medicationName}>{med.medication_name}</Text>
                {med.dosage && (
                  <Text style={styles.medicationDosage}>{med.dosage}</Text>
                )}
                <Text style={styles.medicationSchedule}>
                  {new Date(med.scheduled_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })} at {med.scheduled_time.substring(0, 5)}
                </Text>
                {med.frequency !== 'once' && (
                  <Text style={styles.medicationFrequency}>
                    Repeat: {med.frequency}
                  </Text>
                )}
              </View>
              <View style={styles.medicationActions}>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEdit(med)}
                >
                  <Ionicons name="create-outline" size={22} color="#6A8DFD" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(med.id)}
                >
                  <Ionicons name="trash-outline" size={22} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => {
          resetForm();
          setShowModal(true);
        }}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
      
      {/* Modal para adicionar/editar medicamento */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'Edit Medication' : 'Add Medication'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Medication Name</Text>
              <TextInput 
                style={styles.input}
                value={medicationData.name}
                onChangeText={(text) => setMedicationData({...medicationData, name: text})}
                placeholder="Enter medication name"
              />
              
              <Text style={styles.inputLabel}>Dosage (Optional)</Text>
              <TextInput 
                style={styles.input}
                value={medicationData.dosage}
                onChangeText={(text) => setMedicationData({...medicationData, dosage: text})}
                placeholder="E.g., 1 pill, 5ml, etc."
              />
              
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeText}>
                  {medicationData.date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
                <Ionicons name="calendar" size={22} color="#6A8DFD" />
              </TouchableOpacity>
              
              <Text style={styles.inputLabel}>Time</Text>
              <TouchableOpacity 
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeText}>
                  {medicationData.time.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
                <Ionicons name="time" size={22} color="#6A8DFD" />
              </TouchableOpacity>
              
              <Text style={styles.inputLabel}>Frequency</Text>
              <View style={styles.frequencyOptions}>
                {['once', 'daily', 'weekly'].map((freq) => (
                  <TouchableOpacity 
                    key={freq}
                    style={[
                      styles.frequencyOption,
                      medicationData.frequency === freq && styles.selectedFrequency
                    ]}
                    onPress={() => setMedicationData({...medicationData, frequency: freq})}
                  >
                    <Text style={[
                      styles.frequencyText,
                      medicationData.frequency === freq && styles.selectedFrequencyText
                    ]}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <TouchableOpacity 
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleAddMedication}
              disabled={isLoading}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {showDatePicker && (
        <DateTimePicker
          value={medicationData.date}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={medicationData.time}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6A8DFD',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  medicationList: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  medicationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  medicationDosage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  medicationSchedule: {
    fontSize: 14,
    color: '#6A8DFD',
    marginBottom: 5,
  },
  medicationFrequency: {
    fontSize: 14,
    color: '#888',
  },
  medicationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6A8DFD',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  modalScroll: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#f5f6fa',
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateTimeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f6fa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  frequencyOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  frequencyOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f5f6fa',
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedFrequency: {
    backgroundColor: '#6A8DFD',
    borderColor: '#6A8DFD',
  },
  frequencyText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFrequencyText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#6A8DFD',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MedicationScheduleScreen; 