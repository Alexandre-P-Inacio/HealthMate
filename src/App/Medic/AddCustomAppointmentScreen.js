import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AppointmentService } from '../../services/AppointmentService';
import DataUser from '../../../navigation/DataUser';

const AddCustomAppointmentScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Form fields
  const [doctorName, setDoctorName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [specialty, setSpecialty] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    const currentUser = DataUser.getUserData();
    if (currentUser && currentUser.id) {
      setUserId(currentUser.id);
    } else {
      Alert.alert('Error', 'User not logged in. Please login again.');
      navigation.goBack();
    }
  }, []);

  const onChangeDate = (event, selected) => {
    const currentDate = selected || selectedDate;
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
  };

  const onChangeTime = (event, selected) => {
    const currentTime = selected || selectedTime;
    setShowTimePicker(Platform.OS === 'ios');
    setSelectedTime(currentTime);
  };

  const getCombinedDateTime = () => {
    const combined = new Date(selectedDate);
    combined.setHours(selectedTime.getHours());
    combined.setMinutes(selectedTime.getMinutes());
    combined.setSeconds(0);
    combined.setMilliseconds(0);
    return combined;
  };

  const validateForm = () => {
    if (!doctorName.trim()) {
      Alert.alert('Validation Error', 'Doctor name is required.');
      return false;
    }
    if (!location.trim()) {
      Alert.alert('Validation Error', 'Location is required.');
      return false;
    }
    
    const appointmentDateTime = getCombinedDateTime();
    const now = new Date();
    
    if (appointmentDateTime <= now) {
      Alert.alert('Validation Error', 'Please select a future date and time.');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const appointmentDateTime = getCombinedDateTime();
      
      const customAppointmentData = {
        userId: userId,
        doctorId: null, // No doctor ID for custom appointments
        appointmentDateTime: appointmentDateTime.toISOString(),
        location: location.trim(),
        notes: notes.trim(),
        description: description.trim(),
        status: 'confirmed', // Custom appointments are automatically confirmed
        requestedBy: userId,
        // Custom appointment specific fields
        customDoctorName: doctorName.trim(),
        customDoctorSpecialty: specialty.trim() || null,
        customDoctorPhone: phoneNumber.trim() || null,
        isCustomAppointment: true
      };

      const result = await AppointmentService.createCustomAppointment(customAppointmentData);
      
      if (result.success) {
        Alert.alert(
          'Success', 
          'Custom appointment created successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Error', result.errors?.general || result.error || 'Failed to create appointment.');
      }
    } catch (error) {
      console.error('Error creating custom appointment:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A67E3" />
        <Text style={styles.loadingText}>Creating appointment...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Custom Appointment</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Doctor Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor Information</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Doctor Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter doctor's name"
              value={doctorName}
              onChangeText={setDoctorName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Specialty</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Cardiology, Dermatology"
              value={specialty}
              onChangeText={setSpecialty}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Doctor's phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Appointment Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="Hospital, clinic, or address"
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Purpose of visit (e.g., regular checkup)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes or reminders"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Date and Time Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          
          <View style={styles.dateTimeRow}>
            <View style={styles.dateTimeItem}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#4A67E3" />
                <Text style={styles.dateTimeButtonText}>
                  {selectedDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateTimeItem}>
              <Text style={styles.label}>Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color="#4A67E3" />
                <Text style={styles.dateTimeButtonText}>
                  {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onChangeDate}
              minimumDate={new Date()}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={onChangeTime}
            />
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>Create Appointment</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A67E3',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E8F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E8F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dateTimeButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#4A67E3',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4A67E3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddCustomAppointmentScreen; 