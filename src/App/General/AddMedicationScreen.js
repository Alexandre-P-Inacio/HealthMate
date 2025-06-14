import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  Switch,
  Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import MedicationService from '../../services/MedicationService';

const AddMedicationScreen = ({ navigation, route }) => {
  const editingMedication = route.params?.medication;
  
  const [medication, setMedication] = useState({
    medication_name: '',
    dosage: '',
    schedule_time: new Date(),
    schedule_date: new Date(),
    recurrence: 'once', // 'once', 'daily', 'weekly'
    days_of_week: []
  });
  
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const daysOfWeek = [
    { key: 'monday', label: 'Mon' },
    { key: 'tuesday', label: 'Tue' },
    { key: 'wednesday', label: 'Wed' },
    { key: 'thursday', label: 'Thu' },
    { key: 'friday', label: 'Fri' },
    { key: 'saturday', label: 'Sat' },
    { key: 'sunday', label: 'Sun' }
  ];

  useEffect(() => {
    if (editingMedication) {
      // Converter dados do formato de armazenamento para o formato de edição
      const scheduleTime = new Date();
      const [hours, minutes] = editingMedication.schedule_time.split(':');
      scheduleTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      setMedication({
        medication_name: editingMedication.medication_name,
        dosage: editingMedication.dosage || '',
        schedule_time: scheduleTime,
        schedule_date: new Date(editingMedication.schedule_date),
        recurrence: editingMedication.recurrence || 'once',
        days_of_week: editingMedication.days_of_week || []
      });
    }
  }, [editingMedication]);

  const handleSave = async () => {
    if (!medication.medication_name) {
      Alert.alert('Error', 'Please enter a medication name');
      return;
    }

    try {
      setIsLoading(true);

      // Formatar dados para salvar
      const formattedData = {
        ...medication,
        schedule_time: medication.schedule_time.toTimeString().split(' ')[0].substring(0, 5), // HH:MM format
        schedule_date: medication.schedule_date.toISOString().split('T')[0], // YYYY-MM-DD format
      };

      if (editingMedication) {
        // Atualizar medicamento existente (isso vai desativar o antigo e criar um novo)
        await MedicationService.updateMedication(editingMedication.id, formattedData);
        Alert.alert('Success', 'Medication updated successfully');
      } else {
        // Adicionar novo medicamento
        await MedicationService.addMedication(formattedData);
        Alert.alert('Success', 'Medication added successfully');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving medication:', error);
      Alert.alert('Error', 'Failed to save medication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (event?.type === 'dismissed') {
      return;
    }
    if (selectedTime) {
      setMedication({
        ...medication,
        schedule_time: selectedTime
      });
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === 'dismissed') {
      return;
    }
    if (selectedDate) {
      setMedication({
        ...medication,
        schedule_date: selectedDate
      });
    }
  };

  const toggleDayOfWeek = (day) => {
    const days = [...medication.days_of_week];
    if (days.includes(day)) {
      const index = days.indexOf(day);
      days.splice(index, 1);
    } else {
      days.push(day);
    }
    setMedication({
      ...medication,
      days_of_week: days
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {editingMedication ? 'Edit Medication' : 'Add Medication'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.form}>
        <Text style={styles.label}>Medication Name</Text>
        <TextInput
          style={styles.input}
          value={medication.medication_name}
          onChangeText={(text) => setMedication({...medication, medication_name: text})}
          placeholder="Enter medication name"
        />

        <Text style={styles.label}>Dosage</Text>
        <TextInput
          style={styles.input}
          value={medication.dosage}
          onChangeText={(text) => setMedication({...medication, dosage: text})}
          placeholder="e.g. 10mg, 1 pill"
        />

        <Text style={styles.label}>Time</Text>
        <TouchableOpacity
          style={styles.dateTimeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time-outline" size={22} color="#6A8DFD" />
          <Text style={styles.dateTimeText}>
            {medication.schedule_time.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={medication.schedule_time}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        )}

        <Text style={styles.label}>Recurrence</Text>
        <View style={styles.recurrenceOptions}>
          <TouchableOpacity
            style={[
              styles.recurrenceOption,
              medication.recurrence === 'once' && styles.selectedOption
            ]}
            onPress={() => setMedication({...medication, recurrence: 'once'})}
          >
            <Text style={[
              styles.recurrenceText,
              medication.recurrence === 'once' && styles.selectedOptionText
            ]}>Once</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.recurrenceOption,
              medication.recurrence === 'daily' && styles.selectedOption
            ]}
            onPress={() => setMedication({...medication, recurrence: 'daily'})}
          >
            <Text style={[
              styles.recurrenceText,
              medication.recurrence === 'daily' && styles.selectedOptionText
            ]}>Daily</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.recurrenceOption,
              medication.recurrence === 'weekly' && styles.selectedOption
            ]}
            onPress={() => setMedication({...medication, recurrence: 'weekly'})}
          >
            <Text style={[
              styles.recurrenceText,
              medication.recurrence === 'weekly' && styles.selectedOptionText
            ]}>Weekly</Text>
          </TouchableOpacity>
        </View>

        {medication.recurrence === 'once' && (
          <>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={22} color="#6A8DFD" />
              <Text style={styles.dateTimeText}>
                {medication.schedule_date.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={medication.schedule_date}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </>
        )}

        {medication.recurrence === 'weekly' && (
          <>
            <Text style={styles.label}>Days of Week</Text>
            <View style={styles.daysContainer}>
              {daysOfWeek.map((day) => (
                <TouchableOpacity
                  key={day.key}
                  style={[
                    styles.dayButton,
                    medication.days_of_week.includes(day.key) && styles.selectedDayButton
                  ]}
                  onPress={() => toggleDayOfWeek(day.key)}
                >
                  <Text style={[
                    styles.dayText,
                    medication.days_of_week.includes(day.key) && styles.selectedDayText
                  ]}>{day.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.disabledButton]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Saving...' : 'Save Medication'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  header: {
    backgroundColor: '#6A8DFD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 5,
  },
  placeholder: {
    width: 24,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  dateTimeText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  recurrenceOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  recurrenceOption: {
    flex: 1,
    padding:
    12,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  selectedOption: {
    backgroundColor: '#6A8DFD',
    borderColor: '#6A8DFD',
  },
  recurrenceText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  dayButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8ECF4',
  },
  selectedDayButton: {
    backgroundColor: '#6A8DFD',
    borderColor: '#6A8DFD',
  },
  dayText: {
    fontSize: 14,
    color: '#333',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#6A8DFD',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginVertical: 30,
  },
  disabledButton: {
    backgroundColor: '#A0AEC0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddMedicationScreen; 