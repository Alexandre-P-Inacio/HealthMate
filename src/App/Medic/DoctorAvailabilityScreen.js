import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator, ToastAndroid, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DoctorAvailabilityService } from '../../services/DoctorAvailabilityService';
import DataUser from '../../../navigation/DataUser';

const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];
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

function showToast(msg) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert(msg);
}

const useDoctorAvailability = () => {
  const [weeklySchedule, setWeeklySchedule] = useState(defaultSchedule);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, day: null, type: null });
  const [customTime, setCustomTime] = useState('');
  const fetchedOnce = useRef(false);

  useEffect(() => {
    if (!fetchedOnce.current) {
      fetchAvailability();
      fetchedOnce.current = true;
    }
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const result = await DoctorAvailabilityService.getMyAvailability();
      if (result.success) {
        const blankSchedule = {
          monday: { start: '', end: '' },
          tuesday: { start: '', end: '' },
          wednesday: { start: '', end: '' },
          thursday: { start: '', end: '' },
          friday: { start: '', end: '' },
          saturday: { start: '', end: '' },
          sunday: { start: '', end: '' }
        };
        const recurring = result.data.filter(a => a.is_recurring && a.start_time && a.end_time);
        const schedule = { ...blankSchedule };
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
      } else {
        setWeeklySchedule({
          monday: { start: '', end: '' },
          tuesday: { start: '', end: '' },
          wednesday: { start: '', end: '' },
          thursday: { start: '', end: '' },
          friday: { start: '', end: '' },
          saturday: { start: '', end: '' },
          sunday: { start: '', end: '' }
        });
        Alert.alert('Erro', result.error || 'Não foi possível carregar a disponibilidade.');
        console.error('Erro ao buscar disponibilidade:', result.error);
      }
    } catch (err) {
      setWeeklySchedule({
        monday: { start: '', end: '' },
        tuesday: { start: '', end: '' },
        wednesday: { start: '', end: '' },
        thursday: { start: '', end: '' },
        friday: { start: '', end: '' },
        saturday: { start: '', end: '' },
        sunday: { start: '', end: '' }
      });
      Alert.alert('Erro', err.message || 'Erro inesperado');
      console.error('Erro inesperado ao buscar disponibilidade:', err);
    }
    setLoading(false);
  };

  const saveAvailability = async () => {
    setLoading(true);
    try {
      const currentUser = DataUser.getUserData();
      if (!currentUser || !currentUser.id) {
        setLoading(false);
        Alert.alert('Erro', 'Usuário não logado. Por favor, faça login novamente.');
        return;
      }
      // Delete all existing recurring slots
      const result = await DoctorAvailabilityService.getAvailabilityByDoctorId(currentUser.id);
      if (result.success) {
        const existing = result.data.filter(a => a.is_recurring);
        for (const slot of existing) {
          const del = await DoctorAvailabilityService.deleteAvailability(slot.id);
          if (!del.success) throw new Error(del.error || 'Erro ao deletar disponibilidade.');
        }
      } else {
        throw new Error(result.error || 'Erro ao buscar disponibilidade.');
      }
      // Insert new slots
      for (const { key, idx } of WEEKDAYS) {
        const { start, end } = weeklySchedule[key];
        if (start && end) {
          const add = await DoctorAvailabilityService.addAvailability({
            day_of_week: idx,
            start_time: start + ':00',
            end_time: end + ':00',
            is_recurring: true,
            is_available: true
          });
          if (!add.success) throw new Error(add.error || 'Erro ao adicionar disponibilidade.');
        }
      }
      setLoading(false);
      showToast('Disponibilidade salva com sucesso!');
      fetchAvailability();
    } catch (err) {
      setLoading(false);
      Alert.alert('Erro', err.message || 'Erro inesperado ao salvar disponibilidade.');
    }
  };

  const handleSelectHour = (day, type, hour) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [type]: hour }
    }));
  };

  const handleClearDay = (day) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: { start: '', end: '' }
    }));
  };

  const openCustomModal = (day, type) => {
    setModal({ visible: true, day, type });
    setCustomTime(weeklySchedule[day][type] || '');
  };

  const saveCustomHour = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(customTime)) {
      showToast('Formato inválido. Use HH:MM, ex: 08:30');
      return;
    }
    setWeeklySchedule(prev => ({
      ...prev,
      [modal.day]: { ...prev[modal.day], [modal.type]: customTime }
    }));
    setModal({ visible: false, day: null, type: null });
  };

  return {
    weeklySchedule, setWeeklySchedule, loading, modal, setModal, customTime, setCustomTime,
    fetchAvailability, saveAvailability, handleSelectHour, handleClearDay, openCustomModal, saveCustomHour
  };
};

const TimeChip = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.hourChip, selected && styles.selectedChip]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.chipText, selected && styles.selectedChipText]}>{label}</Text>
  </TouchableOpacity>
);

const DayCard = ({ dayKey, label, schedule, onSelectHour, onClear, onOpenCustom }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Text style={styles.cardTitle}>{label}</Text>
      <TouchableOpacity onPress={() => onClear(dayKey)}>
        <Ionicons name="close-circle" size={22} color="#e74c3c" />
      </TouchableOpacity>
    </View>
    <View style={styles.row}>
      <Text style={styles.timeLabel}>Início:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {HOURS.map(h => (
          <TimeChip
            key={h}
            label={h}
            selected={schedule.start === h}
            onPress={() => onSelectHour(dayKey, 'start', h)}
          />
        ))}
        <TouchableOpacity style={styles.customChip} onPress={() => onOpenCustom(dayKey, 'start')}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.customChipText}>Personalizar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
    <View style={styles.row}>
      <Text style={styles.timeLabel}>Fim:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {HOURS.map(h => (
          <TimeChip
            key={h}
            label={h}
            selected={schedule.end === h}
            onPress={() => onSelectHour(dayKey, 'end', h)}
          />
        ))}
        <TouchableOpacity style={styles.customChip} onPress={() => onOpenCustom(dayKey, 'end')}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.customChipText}>Personalizar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
);

const DoctorAvailabilityScreen = ({ navigation }) => {
  const {
    weeklySchedule, loading, modal, customTime,
    saveAvailability, handleSelectHour, handleClearDay, openCustomModal, setCustomTime, setModal, saveCustomHour
  } = useDoctorAvailability();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#3498db" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Disponibilidade Semanal</Text>
          <Text style={styles.headerSubtitle}>Defina os horários em que você estará disponível para consultas.</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {WEEKDAYS.map(({ key, label }) => (
          <DayCard
            key={key}
            dayKey={key}
            label={label}
            schedule={weeklySchedule[key]}
            onSelectHour={handleSelectHour}
            onClear={handleClearDay}
            onOpenCustom={openCustomModal}
          />
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.saveButton} onPress={saveAvailability} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginRight: 8 }} />}
        <Text style={styles.saveButtonText}>Salvar Disponibilidade</Text>
      </TouchableOpacity>
      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setModal({ visible: false, day: null, type: null })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Personalizar Horário</Text>
            <Text style={styles.modalLabel}>{modal.type === 'start' ? 'Início' : 'Fim'} (HH:MM)</Text>
            <TextInput
              style={styles.modalInput}
              value={customTime}
              onChangeText={setCustomTime}
              placeholder="08:00"
              keyboardType="numeric"
              maxLength={5}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setModal({ visible: false, day: null, type: null })}>
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={saveCustomHour}>
                <Text style={styles.modalBtnSaveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f6fc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e3e9f2', elevation: 2 },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#3498db', letterSpacing: 1 },
  headerSubtitle: { fontSize: 15, color: '#555', marginTop: 2, marginBottom: 2 },
  scrollContent: { padding: 18, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 22, shadowColor: '#3498db', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 10, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#3498db', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  timeLabel: { fontSize: 16, color: '#555', marginRight: 8, minWidth: 54, fontWeight: 'bold' },
  hourChip: { backgroundColor: '#eaf3ff', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16, marginRight: 8, marginBottom: 4, borderWidth: 1, borderColor: '#e0e7ef' },
  selectedChip: { backgroundColor: '#3498db', borderColor: '#3498db' },
  chipText: { color: '#3498db', fontWeight: 'bold', fontSize: 16 },
  selectedChipText: { color: '#fff' },
  customChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6c47ff', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, marginRight: 8, marginBottom: 4 },
  customChipText: { color: '#fff', fontWeight: 'bold', fontSize: 15, marginLeft: 4 },
  saveButton: { flexDirection: 'row', backgroundColor: '#3498db', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 30, shadowColor: '#3498db', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 4, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 18, padding: 24, width: 320, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#3498db', marginBottom: 18 },
  modalLabel: { fontSize: 15, color: '#555', alignSelf: 'flex-start', marginTop: 8 },
  modalInput: { borderWidth: 1, borderColor: '#e0e7ef', borderRadius: 8, padding: 10, fontSize: 16, width: '100%', marginTop: 4, backgroundColor: '#f7fafd', color: '#333' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 22 },
  modalBtnCancel: { flex: 1, backgroundColor: '#e3e9f2', padding: 12, borderRadius: 8, alignItems: 'center', marginRight: 8 },
  modalBtnCancelText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  modalBtnSave: { flex: 1, backgroundColor: '#3498db', padding: 12, borderRadius: 8, alignItems: 'center', marginLeft: 8 },
  modalBtnSaveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default DoctorAvailabilityScreen; 