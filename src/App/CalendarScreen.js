import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';
import Navbar from '../Components/Navbar';

const CalendarScreen = ({ navigation }) => {
  const userId = DataUser .getUserData()?.id;
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [selectedScheduleType, setSelectedScheduleType] = useState('interval');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateType, setDateType] = useState(null);

  const [newMedication, setNewMedication] = useState({
    titulo: '',
    quantidade_comprimidos: '',
    quantidade_comprimidos_por_vez: '',
    data_inicio: '',
    intervalo_horas: '',
    horario_fixo: '',
    data_fim: '',
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchMedications = async () => {
      try {
        const { data, error } = await supabase
          .from('pills_warning')
          .select('*')
          .eq('user_id', userId);

        if (error) throw error;
        setMedications(data || []);
      } catch (error) {
        Alert.alert('Error', 'Failed to fetch medications');
        console.error('Error fetching medications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMedications();
  }, [userId]);

  const handleInfoPress = (medication) => {
    setSelectedMedication(medication);
    setInfoModalVisible(true);
  };

  const handleDeleteMedication = async (medicationId) => {
    try {
      const { error } = await supabase
        .from('pills_warning')
        .delete()
        .eq('id', medicationId);

      if (error) throw error;

      setMedications(medications.filter((med) => med.id !== medicationId));
      setInfoModalVisible(false);
      Alert.alert('Success', 'Medication deleted successfully!');
    } catch (error) {
      Alert.alert('Error', 'Could not delete medication');
      console.error('Delete error:', error);
    }
  };

  const validateMedicationInput = () => {
    if (!newMedication.titulo.trim()) {
      Alert.alert('Error', 'Please enter medication name');
      return false;
    }
    if (!newMedication.quantidade_comprimidos || isNaN(newMedication.quantidade_comprimidos)) {
      Alert.alert('Error', 'Please enter a valid number of tablets');
      return false;
    }
    if (!newMedication.quantidade_comprimidos_por_vez || isNaN(newMedication.quantidade_comprimidos_por_vez)) {
      Alert.alert('Error', 'Please enter a valid dose amount');
      return false;
    }
    if (!newMedication.data_inicio) {
      Alert.alert('Error', 'Please select a start date');
      return false;
    }
    return true;
  };

  const handleAddMedication = async () => {
    if (!validateMedicationInput()) return;

    try {
      const medicationData = {
        user_id: userId,
        ...newMedication,
        data_inicio: newMedication.data_inicio, // A data e hora já foram concatenadas
        quantidade_comprimidos: parseInt(newMedication.quantidade_comprimidos),
        quantidade_comprimidos_por_vez: parseInt(newMedication.quantidade_comprimidos_por_vez),
        intervalo_horas: newMedication.intervalo_horas ? parseInt(newMedication.intervalo_horas) : null
      };

      const { data, error } = await supabase
        .from('pills_warning')
        .insert([medicationData])
        .select();

      if (error) throw error;

      setMedications([...medications, data[0]]);
      setModalVisible(false);
      setNewMedication({
        titulo: '',
        quantidade_comprimidos: '',
        quantidade_comprimidos_por_vez: '',
        data_inicio: '',
        intervalo_horas: '',
        horario_fixo: '',
        data_fim: '',
      });
      Alert.alert('Success', 'Medication added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Could not add medication');
      console.error('Add error:', error);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      const updatedMedication = { ...newMedication };
      
      switch (dateType) {
        case 'start':
          updatedMedication.data_inicio = selectedDate.toISOString().split('T')[0]; // Armazena apenas a data
          break;
        case 'time':
          const timeString = selectedDate.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          });
          updatedMedication.data_inicio = `${updatedMedication.data_inicio} ; ${timeString}`; // Concatena a hora com a data
          break;
        case 'end':
          updatedMedication.data_fim = selectedDate.toISOString().split('T')[0];
          break;
        case 'fixed':
          updatedMedication.horario_fixo = selectedDate.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
          });
          break;
      }
      
      setNewMedication(updatedMedication);
    }
    setShowDatePicker(false);
  };

  const renderMedicationCard = ({ item }) => (
    <View style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <Text style={styles.medicationTitle}>{item.titulo}</Text>
        <TouchableOpacity 
          onPress={() => handleInfoPress(item)}
          style={styles.infoButton}
        >
          <Ionicons name="information-circle-outline" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>
      <View style={styles.medicationDetails}>
        <Text style={styles.medicationInfo}>
          <Ionicons name="calendar" size={16} color="#3498db" /> Start: {item.data_inicio}
        </Text>
        {item.data_fim && (
          <Text style={styles.medicationInfo}>
            <Ionicons name="calendar" size={16} color="#e74c3c" /> End: {item.data_fim}
          </Text>
        )}
        <Text style={styles.medicationInfo}>
          <Ionicons name="alarm" size={16} color="#f1c40f" /> 
          {item.intervalo_horas ? `Interval: ${item.intervalo_horas} hours` : 
           item.horario_fixo ? `Fixed time: ${item.horario_fixo}` : 'No schedule set'}
        </Text>
        <Text style={styles.medicationInfo}>
          <Ionicons name="medkit" size={16} color="#e67e22" /> 
          Dose: {item.quantidade_comprimidos_por_vez} of {item.quantidade_comprimidos} tablets
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medication Schedule</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medical" size={64} color="#bdc3c7" />
          <Text style={styles.noDataText}>No scheduled medications</Text>
          <Text style={styles.noDataSubtext}>Add your first medication below</Text>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMedicationCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity 
        style={styles.addButton} 
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
        <Text style={styles.addButtonText}>Add Medication</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Add New Medication</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Medication Name"
                value={newMedication.titulo}
                onChangeText={(text) => setNewMedication({ ...newMedication, titulo: text })}
                placeholderTextColor="#95a5a6"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Total Tablets"
                keyboardType="numeric"
                value={newMedication.quantidade_comprimidos}
                onChangeText={(text) => setNewMedication({ ...newMedication, quantidade_comprimidos: text })}
                placeholderTextColor="#95a5a6"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Tablets per Dose"
                keyboardType="numeric"
                value={newMedication.quantidade_comprimidos_por_vez}
                onChangeText={(text) => setNewMedication({ ...newMedication, quantidade_comprimidos_por_vez: text })}
                placeholderTextColor="#95a5a6"
              />

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedScheduleType}
                  style={styles.picker}
                  onValueChange={(itemValue) => setSelectedScheduleType(itemValue)}
                >
                  <Picker.Item label="Interval Schedule" value="interval" />
                  <Picker.Item label="Fixed Time Schedule" value="fixed" />
                  <Picker.Item label="Period Schedule" value="period" />
                </Picker>
              </View>

              {selectedScheduleType === 'interval' && (
                <>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => { setShowDatePicker(true); setDateType('start'); }}
                  >
                    <Ionicons name="calendar" size={20} color="#3498db" />
                    <Text style={styles.datePickerText}>
                      {newMedication.data_inicio || 'Select Start Date'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => { setShowDatePicker(true); setDateType('time'); }}
                  >
                    <Ionicons name="time" size={20} color="#3498db" />
                    <Text style={styles.datePickerText}>
                      {newMedication.hora_inicio || 'Select Start Time'}
                    </Text>
                  </TouchableOpacity>

                  <TextInput
                    style={styles.input}
                    placeholder="Interval in Hours"
                    keyboardType="numeric"
                    value={newMedication.intervalo_horas}
                    onChangeText={(text) => setNewMedication({ ...newMedication, intervalo_horas: text })}
                    placeholderTextColor="#95a5a6"
                  />
                </>
              )}

              {selectedScheduleType === 'fixed' && (
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => { setShowDatePicker(true); setDateType('fixed'); }}
                >
                  <Ionicons name="time" size={20} color="#3498db" />
                  <Text style={styles.datePickerText}>
                    {newMedication.horario_fixo || 'Select Fixed Time'}
                  </Text>
                </TouchableOpacity>
              )}

              {selectedScheduleType === 'period' && (
                <View style={styles.datePickerRow}>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => { setShowDatePicker(true); setDateType('start'); }}
                  >
                    <Ionicons name="calendar" size={20} color="#3498db" />
                    <Text style={styles.datePickerText}>
                      {newMedication.data_inicio || 'Select Start Date'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => { setShowDatePicker(true); setDateType('end'); }}
                  >
                    <Ionicons name="calendar" size={20} color="#3498db" />
                    <Text style={styles.datePickerText}>
                      {newMedication.data_fim || 'Select End Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode={dateType === 'start' || dateType === 'end' ? 'date' : 'time'}
                  is24Hour={true}
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleAddMedication}
                activeOpacity={0.8}
              >
                <Text style={styles.saveButtonText}>Save Medication</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={infoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setInfoModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Medication Details</Text>

            {selectedMedication && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Medication Name</Text>
                  <Text style={styles.infoValue}>{selectedMedication.titulo}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Total Tablets</Text>
                  <Text style={styles.infoValue}>{selectedMedication.quantidade_comprimidos}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Tablets per Dose</Text>
                  <Text style={styles.infoValue}>{selectedMedication.quantidade_comprimidos_por_vez}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>Start Date</Text>
                  <Text style={styles.infoValue}>{selectedMedication.data_inicio}</Text>
                </View>

                {selectedMedication.data_fim && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>End Date</Text>
                    <Text style={styles.infoValue}>{selectedMedication.data_fim}</Text>
                  </View>
                )}

                {selectedMedication.intervalo_horas && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Interval</Text>
                    <Text style={styles.infoValue}>{selectedMedication.intervalo_horas} hours</Text>
                  </View>
                )}

                {selectedMedication.horario_fixo && (
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Fixed Time</Text>
                    <Text style={styles.infoValue}>{selectedMedication.horario_fixo}</Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => handleDeleteMedication(selectedMedication.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete Medication</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Navbar navigation={navigation} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginVertical: 20,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 20,
    color: '#7f8c8d',
    marginTop: 20,
    fontWeight: '600',
  },
  noDataSubtext: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicationCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#3498db',
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  medicationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  infoButton: {
    padding: 5,
  },
  medicationDetails: {
    gap: 8,
  },
  medicationInfo: {
    fontSize: 16,
    color: '#34495e',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
  },
  picker: {
    height: 50,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 15,
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#3498db',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoSection: {
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CalendarScreen;