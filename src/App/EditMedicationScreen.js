import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

const EditMedicationScreen = ({ navigation, route }) => {
  const { medicationId } = route.params;
  
  const [medication, setMedication] = useState({
    name: '',
    dosage: '',
    schedule_date: new Date(),
    recurrence: 'daily',
    days_of_week: [],
    times: ['08:00'],
    active: true,
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const daysOfWeek = [
    { key: 'mon', label: 'M' },
    { key: 'tue', label: 'T' },
    { key: 'wed', label: 'W' },
    { key: 'thu', label: 'T' },
    { key: 'fri', label: 'F' },
    { key: 'sat', label: 'S' },
    { key: 'sun', label: 'S' },
  ];
  
  useEffect(() => {
    const initialize = async () => {
      try {
        // Obter ID do usuário
        const userData = DataUser.getUserData();
        if (userData && userData.id) {
          setUserId(userData.id);
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            setUserId(user.id);
          }
        }
        
        // Carregar dados do medicamento
        await fetchMedicationData();
      } catch (error) {
        console.error('Error initializing:', error);
        Alert.alert('Error', 'Failed to load medication data');
      } finally {
        setIsLoading(false);
      }
    };
    
    initialize();
  }, []);
  
  const fetchMedicationData = async () => {
    try {
      // Obter o medicamento principal
      const { data: medData, error: medError } = await supabase
        .from('medications')
        .select('*')
        .eq('id', medicationId)
        .single();
      
      if (medError) throw medError;
      if (!medData) throw new Error('Medication not found');
      
      // Obter os horários agendados
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('medication_schedule')
        .select('*')
        .eq('medication_id', medicationId)
        .eq('active', true);
      
      if (scheduleError) throw scheduleError;
      
      // Extrair os horários únicos
      const uniqueTimes = new Set();
      scheduleData.forEach(schedule => {
        uniqueTimes.add(schedule.scheduled_time);
      });
      
      // Determinar os dias da semana (para medicamentos semanais)
      const daysOfWeek = [];
      if (medData.recurrence === 'weekly') {
        const uniqueDays = new Set();
        scheduleData.forEach(schedule => {
          const date = new Date(schedule.scheduled_date);
          const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
          uniqueDays.add(dayKey);
        });
        daysOfWeek.push(...uniqueDays);
      }
      
      // Determinar a data de início (para medicamentos de dose única)
      let startDate = new Date();
      if (medData.recurrence === 'once' && scheduleData.length > 0) {
        startDate = new Date(scheduleData[0].scheduled_date);
      }
      
      // Atualizar o estado
      setMedication({
        name: medData.name,
        dosage: medData.dosage,
        schedule_date: startDate,
        recurrence: medData.recurrence,
        days_of_week: daysOfWeek,
        times: Array.from(uniqueTimes),
        active: medData.active,
      });
      
    } catch (error) {
      console.error('Error fetching medication data:', error);
      Alert.alert('Error', 'Failed to load medication data');
    }
  };
  
  // Outras funções auxiliares (addTime, removeTime, etc.) permanecem as mesmas

  const saveMedication = async () => {
    try {
      if (!medication.name.trim()) {
        Alert.alert('Error', 'Please enter a medication name');
        return;
      }
      
      if (medication.times.length === 0) {
        Alert.alert('Error', 'Please add at least one time');
        return;
      }
      
      if (medication.recurrence === 'weekly' && medication.days_of_week.length === 0) {
        Alert.alert('Error', 'Please select at least one day of the week');
        return;
      }
      
      if (!userId) {
        Alert.alert('Error', 'User information not available');
        return;
      }
      
      setIsSaving(true);
      
      // 1. Atualizar o medicamento principal
      const { error: updateError } = await supabase
        .from('medications')
        .update({
          name: medication.name,
          dosage: medication.dosage,
          recurrence: medication.recurrence,
          active: medication.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', medicationId);
      
      if (updateError) throw updateError;
      
      // 2. Desativar todos os agendamentos existentes
      const { error: deactivateError } = await supabase
        .from('medication_schedule')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('medication_id', medicationId);
      
      if (deactivateError) throw deactivateError;
      
      // 3. Criar novos agendamentos
      const scheduleEntries = [];
      
      // Determine quais datas precisamos gerar baseado na recorrência
      const dates = [];
      const now = new Date();
      const currentDate = new Date(medication.schedule_date);
      
      if (medication.recurrence === 'once') {
        // Para uma única ocorrência, use apenas a data selecionada
        dates.push(new Date(currentDate));
      } else if (medication.recurrence === 'daily') {
        // Para recorrência diária, gere entradas para os próximos 30 dias
        for (let i = 0; i < 30; i++) {
          const date = new Date(currentDate);
          date.setDate(date.getDate() + i);
          dates.push(date);
        }
      } else if (medication.recurrence === 'weekly') {
        // Para recorrência semanal, gere entradas para as próximas 8 semanas apenas nos dias selecionados
        for (let i = 0; i < 56; i++) { // 56 dias = 8 semanas
          const date = new Date(currentDate);
          date.setDate(date.getDate() + i);
          
          const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getDay()];
          
          if (medication.days_of_week.includes(dayKey)) {
            dates.push(new Date(date));
          }
        }
      }
      
      // Para cada data e cada horário, crie uma entrada no agendamento
      for (const date of dates) {
        for (const timeStr of medication.times) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const scheduledDateTime = new Date(date);
          scheduledDateTime.setHours(hours, minutes, 0, 0);
          
          // Não agende medicamentos no passado
          if (scheduledDateTime < now) continue;
          
          // Formate a data e a hora para o banco de dados
          const formattedDate = scheduledDateTime.toISOString().split('T')[0];
          const formattedTime = timeStr;
          
          scheduleEntries.push({
            user_id: userId,
            medication_id: medicationId,
            medication_name: medication.name,
            dosage: medication.dosage,
            scheduled_date: formattedDate,
            scheduled_time: formattedTime,
            frequency: medication.recurrence,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
      
      // Salve todas as entradas de agendamento
      if (scheduleEntries.length > 0) {
        const { error: scheduleError } = await supabase
          .from('medication_schedule')
          .insert(scheduleEntries);
        
        if (scheduleError) throw scheduleError;
      }
      
      Alert.alert('Success', 'Medication schedule updated successfully');
      navigation.goBack();
      
    } catch (error) {
      console.error('Error updating medication:', error);
      Alert.alert('Error', 'Failed to update medication schedule');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A8DFD" />
        <Text style={styles.loadingText}>Loading medication data...</Text>
      </View>
    );
  }
  
  // O resto do componente (renderização) é semelhante ao AddMedicationScreen
  // ...

  return (
    <View style={styles.container}>
      <ScrollView>
        <Text style={styles.title}>Edit Medication</Text>
        
        {/* Campos de formulário semelhantes ao AddMedicationScreen */}
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveMedication}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Updating...' : 'Update Medication'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// Estilos semelhantes ao AddMedicationScreen
const styles = StyleSheet.create({
  // ...
});

export default EditMedicationScreen; 