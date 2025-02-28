import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';
import Navbar from '../Components/Navbar';

const CalendarScreen = ({ navigation }) => {
  const userId = DataUser.getUserData()?.id;
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedScheduleType, setSelectedScheduleType] = useState('interval'); // 'interval', 'fixed', 'period'

  const [newMedication, setNewMedication] = useState({
    titulo: '',
    quantidade_comprimidos: '',
    quantidade_comprimidos_por_vez: '',
    data_inicio: '',
    hora_inicio: '',
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
      const { data, error } = await supabase
        .from('lembretes_medicamento')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching medications:', error);
      } else {
        setMedications(data);
      }

      setLoading(false);
    };

    fetchMedications();
  }, [userId]);

  const handleAddMedication = async () => {
    if (!newMedication.titulo || !newMedication.quantidade_comprimidos || !newMedication.quantidade_comprimidos_por_vez) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    let scheduleData = {};
    if (selectedScheduleType === 'interval') {
      if (!newMedication.data_inicio || !newMedication.hora_inicio || !newMedication.intervalo_horas) {
        Alert.alert('Error', 'Please provide start date, time, and interval.');
        return;
      }
      scheduleData = {
        data_inicio: newMedication.data_inicio,
        horario_inicial: newMedication.hora_inicio,
        intervalo_horas: parseInt(newMedication.intervalo_horas),
      };
    } else if (selectedScheduleType === 'fixed') {
      if (!newMedication.horario_fixo) {
        Alert.alert('Error', 'Please provide a fixed time.');
        return;
      }
      scheduleData = {
        horario_fixo: newMedication.horario_fixo,
      };
    } else if (selectedScheduleType === 'period') {
      if (!newMedication.data_inicio || !newMedication.data_fim || !newMedication.hora_inicio || !newMedication.intervalo_horas) {
        Alert.alert('Error', 'Please provide start date, end date, time, and interval.');
        return;
      }
      scheduleData = {
        data_inicio: newMedication.data_inicio,
        data_fim: newMedication.data_fim,
        horario_inicial: newMedication.hora_inicio,
        intervalo_horas: parseInt(newMedication.intervalo_horas),
      };
    }

    const { error } = await supabase
      .from('lembretes_medicamento')
      .insert([{ 
        user_id: userId,
        titulo: newMedication.titulo,
        quantidade_comprimidos: parseInt(newMedication.quantidade_comprimidos),
        quantidade_comprimidos_por_vez: parseInt(newMedication.quantidade_comprimidos_por_vez),
        ...scheduleData,
      }]);

    if (error) {
      Alert.alert('Error', 'Could not add medication.');
      console.error(error);
    } else {
      setModalVisible(false);
      setNewMedication({
        titulo: '',
        quantidade_comprimidos: '',
        quantidade_comprimidos_por_vez: '',
        data_inicio: '',
        hora_inicio: '',
        intervalo_horas: '',
        horario_fixo: '',
        data_fim: '',
      });
      Alert.alert('Success', 'Medication added successfully!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Medication Schedule</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#3498db" />
      ) : medications.length === 0 ? (
        <Text style={styles.noDataText}>No scheduled medications.</Text>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.medicationCard}>
              <Text style={styles.medicationTitle}>{item.titulo}</Text>
              <Text style={styles.medicationInfo}>Dose: {item.quantidade_comprimidos_por_vez} tablets</Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Ionicons name="add-circle-outline" size={28} color="#fff" />
        <Text style={styles.addButtonText}>Add Medication</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Medication</Text>

            <TextInput style={styles.input} placeholder="Medication Name" value={newMedication.titulo} onChangeText={(text) => setNewMedication({ ...newMedication, titulo: text })} />
            <TextInput style={styles.input} placeholder="Total Tablets" keyboardType="numeric" value={newMedication.quantidade_comprimidos} onChangeText={(text) => setNewMedication({ ...newMedication, quantidade_comprimidos: text })} />
            <TextInput style={styles.input} placeholder="Tablets per Dose" keyboardType="numeric" value={newMedication.quantidade_comprimidos_por_vez} onChangeText={(text) => setNewMedication({ ...newMedication, quantidade_comprimidos_por_vez: text })} />

            <Picker selectedValue={selectedScheduleType} style={styles.picker} onValueChange={(itemValue) => setSelectedScheduleType(itemValue)}>
              <Picker.Item label="Interval" value="interval" />
              <Picker.Item label="Fixed Time" value="fixed" />
              <Picker.Item label="Period" value="period" />
            </Picker>

            {selectedScheduleType === 'interval' && (
              <>
                <TextInput style={styles.input} placeholder="Start Date (YYYY-MM-DD)" value={newMedication.data_inicio} onChangeText={(text) => setNewMedication({ ...newMedication, data_inicio: text })} />
                <TextInput style={styles.input} placeholder="Start Time (HH:MM)" value={newMedication.hora_inicio} onChangeText={(text) => setNewMedication({ ...newMedication, hora_inicio: text })} />
                <TextInput style={styles.input} placeholder="Interval in Hours" keyboardType="numeric" value={newMedication.intervalo_horas} onChangeText={(text) => setNewMedication({ ...newMedication, intervalo_horas: text })} />
              </>
            )}

            {selectedScheduleType === 'fixed' && (
              <TextInput style={styles.input} placeholder="Fixed Time (HH:MM)" value={newMedication.horario_fixo} onChangeText={(text) => setNewMedication({ ...newMedication, horario_fixo: text })} />
            )}

            {selectedScheduleType === 'period' && (
              <>
                <TextInput style={styles.input} placeholder="Start Date (YYYY-MM-DD)" value={newMedication.data_inicio} onChangeText={(text) => setNewMedication({ ...newMedication, data_inicio: text })} />
                <TextInput style={styles.input} placeholder="End Date (YYYY-MM-DD)" value={newMedication.data_fim} onChangeText={(text) => setNewMedication({ ...newMedication, data_fim: text })} />
                <TextInput style={styles.input} placeholder="Start Time (HH:MM)" value={newMedication.hora_inicio} onChangeText={(text) => setNewMedication({ ...newMedication, hora_inicio: text })} />
                <TextInput style={styles.input} placeholder="Interval in Hours" keyboardType="numeric" value={newMedication.intervalo_horas} onChangeText={(text) => setNewMedication({ ...newMedication, intervalo_horas: text })} />
              </>
            )}

            <TouchableOpacity style={styles.saveButton} onPress={handleAddMedication}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
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
    padding: 20 
  },

  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#2c3e50', 
    textAlign: 'center', 
    marginBottom: 20 
  },

  noDataText: { 
    fontSize: 18, 
    color: '#7f8c8d', 
    textAlign: 'center', 
    marginTop: 20 
  },

  medicationCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    marginBottom: 10, 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowOffset: { width: 0, height: 2 } 
  },

  medicationTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#3498db' 
  },

  medicationInfo: { 
    fontSize: 14, 
    color: '#34495e', 
    marginTop: 4 
  },

  addButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#3498db', 
    padding: 15, 
    borderRadius: 12, 
    marginTop: 20, 
    elevation: 5 
  },

  addButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginLeft: 5 
  },

  /* MODAL */
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },

  modalContent: { 
    backgroundColor: '#fff', 
    padding: 25, 
    borderRadius: 12, 
    width: '85%', 
    elevation: 5, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowOffset: { width: 0, height: 2 } 
  },

  closeButton: { 
    position: 'absolute', 
    top: 10, 
    right: 10 
  },

  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    textAlign: 'center' 
  },

  input: { 
    backgroundColor: '#ecf0f1', 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 10, 
    fontSize: 16 
  },

  picker: { 
    height: 50, 
    width: '100%', 
    backgroundColor: '#ecf0f1', 
    borderRadius: 8, 
    marginBottom: 10 
  },

  saveButton: { 
    backgroundColor: '#27ae60', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginTop: 10 
  },

  saveButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },

  /* ESTILO PARA INTERVALO/PERÍODO */
  datePickerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },

  datePickerText: { 
    fontSize: 16, 
    color: '#3498db', 
    textDecorationLine: 'underline' 
  },

  timeContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },

  addTimeButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 10 
  },

  addTimeText: { 
    color: '#3498db', 
    fontSize: 16, 
    marginLeft: 5 
  },
});

export default CalendarScreen;
