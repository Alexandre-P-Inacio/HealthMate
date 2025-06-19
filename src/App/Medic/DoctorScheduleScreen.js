import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DoctorAvailabilityService } from '../../services/DoctorAvailabilityService';
import DataUser from '../../../navigation/DataUser';

const WEEKDAYS = [
  { key: 'monday', label: 'Segunda', idx: 1 },
  { key: 'tuesday', label: 'Terça', idx: 2 },
  { key: 'wednesday', label: 'Quarta', idx: 3 },
  { key: 'thursday', label: 'Quinta', idx: 4 },
  { key: 'friday', label: 'Sexta', idx: 5 },
  { key: 'saturday', label: 'Sábado', idx: 6 },
  { key: 'sunday', label: 'Domingo', idx: 0 },
];

const defaultSchedule = {
  monday: { start: '08:00', end: '18:00' },
  tuesday: { start: '08:00', end: '18:00' },
  wednesday: { start: '08:00', end: '18:00' },
  thursday: { start: '08:00', end: '18:00' },
  friday: { start: '08:00', end: '18:00' },
  saturday: { start: '', end: '' },
  sunday: { start: '', end: '' }
};

const DoctorScheduleScreen = ({ navigation }) => {
  const [weeklySchedule, setWeeklySchedule] = useState(defaultSchedule);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDoctorAvailability();
  }, []);

  const fetchDoctorAvailability = async () => {
    const currentUser = DataUser.getUserData();
    if (!currentUser || !currentUser.id) {
      Alert.alert('Erro', 'Usuário não logado. Por favor, faça login novamente.');
      navigation.goBack();
      return;
    }
    setLoading(true);
    const result = await DoctorAvailabilityService.getAvailabilityByDoctorId(currentUser.id);
    if (result.success) {
      const recurring = result.data.filter(a => a.is_recurring);
      if (!recurring.length) {
        setWeeklySchedule({
          monday: { start: '08:00', end: '18:00' },
          tuesday: { start: '08:00', end: '18:00' },
          wednesday: { start: '08:00', end: '18:00' },
          thursday: { start: '08:00', end: '18:00' },
          friday: { start: '08:00', end: '18:00' },
          saturday: { start: '', end: '' },
          sunday: { start: '', end: '' }
        });
      } else {
        // Monta o objeto { monday: {start, end}, ... }
        const schedule = { ...defaultSchedule };
        recurring.forEach(slot => {
          const dayKey = WEEKDAYS.find(d => d.idx === slot.day_of_week)?.key;
          if (dayKey) {
            schedule[dayKey] = {
              start: slot.start_time ? slot.start_time.substring(0,5) : '',
              end: slot.end_time ? slot.end_time.substring(0,5) : ''
            };
          }
        });
        setWeeklySchedule(schedule);
      }
    } else {
      Alert.alert('Erro', result.error || 'Não foi possível carregar a disponibilidade.');
    }
    setLoading(false);
  };

  const handleSaveSchedule = async () => {
    const currentUser = DataUser.getUserData();
    if (!currentUser || !currentUser.id) {
      Alert.alert('Erro', 'Usuário não logado. Por favor, faça login novamente.');
      return;
    }
    setLoading(true);
    // Buscar slots recorrentes existentes
    const result = await DoctorAvailabilityService.getAvailabilityByDoctorId(currentUser.id);
    if (!result.success) {
      Alert.alert('Erro', result.error || 'Não foi possível salvar.');
      setLoading(false);
      return;
    }
    const existingRecurring = result.data.filter(a => a.is_recurring);
    // Deletar todos os slots recorrentes existentes
    for (const slot of existingRecurring) {
      await DoctorAvailabilityService.deleteAvailability(slot.id);
    }
    // Inserir novos slots conforme weeklySchedule
    for (const { key, idx } of WEEKDAYS) {
      const { start, end } = weeklySchedule[key];
      if (start && end) {
        await DoctorAvailabilityService.addAvailability({
          day_of_week: idx,
          start_time: start + ':00',
          end_time: end + ':00',
          is_recurring: true,
          is_available: true
        });
      }
    }
    setLoading(false);
    Alert.alert('Sucesso', 'Disponibilidade salva com sucesso!');
    fetchDoctorAvailability();
  };

  const renderWeeklySchedule = () => {
    return WEEKDAYS.map(({ key, label }) => (
      <View key={key} style={styles.scheduleItem}>
        <Text style={styles.dayText}>{label}</Text>
        <View style={styles.timeContainer}>
          <TextInput
            style={styles.timeInput}
            placeholder="Início"
            value={weeklySchedule[key].start}
            onChangeText={(text) => setWeeklySchedule(prev => ({ ...prev, [key]: { ...prev[key], start: text } }))}
          />
          <TextInput
            style={styles.timeInput}
            placeholder="Fim"
            value={weeklySchedule[key].end}
            onChangeText={(text) => setWeeklySchedule(prev => ({ ...prev, [key]: { ...prev[key], end: text } }))}
          />
        </View>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disponibilidade Semanal</Text>
      </View>
      <ScrollView style={styles.content}>
        {loading && <ActivityIndicator size="large" color="#3498db" style={{ marginVertical: 20 }} />}
        {renderWeeklySchedule()}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveSchedule} disabled={loading}>
          <Text style={styles.saveButtonText}>Salvar Disponibilidade</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafd',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timeContainer: {
    flexDirection: 'row',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginLeft: 8,
    width: 100,
  },
  saveButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DoctorScheduleScreen; 