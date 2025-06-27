import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import SamsungHealthService from '../../services/SamsungHealthService';
import { useAuth } from '../../contexts/AuthContext';

const VitalSignsScreen = () => {
  const navigation = useNavigation();
  const { isLoggedIn } = useAuth();
  const [vitalSigns, setVitalSigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const vitalTypes = [
    { id: 'heart_rate', name: 'Heart Rate', icon: 'heart', color: '#FF6B6B', unit: 'bpm' },
    { id: 'blood_pressure', name: 'Blood Pressure', icon: 'pulse', color: '#4ECDC4', unit: 'mmHg' },
    { id: 'blood_oxygen', name: 'Blood Oxygen', icon: 'water', color: '#45B7D1', unit: '%' },
    { id: 'body_temperature', name: 'Temperature', icon: 'thermometer', color: '#F7CA88', unit: '°C' },
    { id: 'steps', name: 'Steps', icon: 'walk', color: '#66BB6A', unit: 'steps' },
    { id: 'calories', name: 'Calories', icon: 'flame', color: '#FFA726', unit: 'kcal' }
  ];

  useEffect(() => {
    if (isLoggedIn) {
      fetchRealVitalSigns();
    } else {
      showGuestMessage();
    }
  }, [isLoggedIn]);

  const showGuestMessage = () => {
    setIsLoading(false);
    setVitalSigns([]);
    Alert.alert(
      'Login Necessário',
      'Para acessar dados reais do Samsung Health, faça login na sua conta.',
      [{ text: 'OK' }]
    );
  };

  const fetchRealVitalSigns = async () => {
    try {
      setIsLoading(true);
      console.log('📱 [VitalSigns] Buscando dados REAIS do Samsung Health...');

      // Busca dados da tabela smartwatch_data
      const result = await SamsungHealthService.getSmartwatchData(7);
      
      if (result.success && result.data.length > 0) {
        console.log(`✅ [VitalSigns] ${result.data.length} registros encontrados`);
        setVitalSigns(result.data);
        setLastSync(new Date().toLocaleString('pt-BR'));
      } else {
        console.log('⚠️ [VitalSigns] Nenhum dado encontrado - iniciando sincronização...');
        await syncSamsungHealthData();
      }

    } catch (error) {
      console.error('❌ [VitalSigns] Erro ao buscar dados:', error);
      Alert.alert('Erro', 'Falha ao carregar dados vitais');
    } finally {
      setIsLoading(false);
    }
  };

  const syncSamsungHealthData = async () => {
    try {
      console.log('🔄 [VitalSigns] Sincronizando com Samsung Health...');
      
      Alert.alert(
        'Sincronização Samsung Health',
        'Vamos buscar seus dados reais do Samsung Health. Conceda as permissões necessárias.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sincronizar',
            onPress: async () => {
              setIsLoading(true);
              
              const syncResult = await SamsungHealthService.syncSamsungHealthData(7);
              
              if (syncResult.success) {
                Alert.alert(
                  'Sincronização Completa',
                  `${syncResult.totalRecords} registros sincronizados do Samsung Health!`,
                  [{ text: 'OK', onPress: () => fetchRealVitalSigns() }]
                );
              } else {
                Alert.alert(
                  'Erro na Sincronização',
                  syncResult.error || 'Falha ao sincronizar com Samsung Health',
                  [
                    { text: 'Tentar Novamente', onPress: () => syncSamsungHealthData() },
                    { text: 'Configurações', onPress: () => openHealthConnectSettings() },
                    { text: 'Cancelar', style: 'cancel' }
                  ]
                );
              }
              
              setIsLoading(false);
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ [VitalSigns] Erro na sincronização:', error);
      Alert.alert('Erro', 'Falha na sincronização com Samsung Health');
      setIsLoading(false);
    }
  };

  const openHealthConnectSettings = async () => {
    try {
      await SamsungHealthService.openHealthConnectSettings();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir as configurações do Health Connect');
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchRealVitalSigns();
    setIsRefreshing(false);
  };

  const getLatestValue = (type) => {
    if (vitalSigns.length === 0) return null;
    
    // Encontra o registro mais recente que tem o tipo específico
    for (const record of vitalSigns) {
      if (type === 'blood_pressure' && record.blood_pressure_systolic && record.blood_pressure_diastolic) {
        return `${record.blood_pressure_systolic}/${record.blood_pressure_diastolic}`;
      }
      if (type === 'heart_rate' && record.heart_rate) {
        return record.heart_rate.toString();
      }
      if (type === 'blood_oxygen' && record.blood_oxygen) {
        return record.blood_oxygen.toString();
      }
      if (type === 'body_temperature' && record.body_temperature) {
        return record.body_temperature.toFixed(1);
      }
      if (type === 'steps' && record.steps) {
        return record.steps.toLocaleString('pt-BR');
      }
      if (type === 'calories' && record.calories) {
        return record.calories.toString();
      }
    }
    
    return null;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderVitalCard = (record, index) => (
    <View key={index} style={styles.vitalCard}>
      <View style={styles.vitalHeader}>
        <View style={styles.vitalTypeContainer}>
          <Ionicons name="fitness" size={20} color="#6A8DFD" />
          <Text style={styles.vitalType}>Dados Samsung Health</Text>
        </View>
        <Text style={styles.vitalTime}>
          {formatDate(record.collected_at)}
        </Text>
      </View>

      <View style={styles.vitalValues}>
        {record.heart_rate && (
          <View style={styles.valueRow}>
            <Ionicons name="heart" size={16} color="#FF6B6B" />
            <Text style={styles.valueText}>Frequência Cardíaca: {record.heart_rate} bpm</Text>
          </View>
        )}
        
        {record.blood_pressure_systolic && record.blood_pressure_diastolic && (
          <View style={styles.valueRow}>
            <Ionicons name="pulse" size={16} color="#4ECDC4" />
            <Text style={styles.valueText}>
              Pressão Arterial: {record.blood_pressure_systolic}/{record.blood_pressure_diastolic} mmHg
            </Text>
          </View>
        )}
        
        {record.blood_oxygen && (
          <View style={styles.valueRow}>
            <Ionicons name="water" size={16} color="#45B7D1" />
            <Text style={styles.valueText}>Saturação O₂: {record.blood_oxygen}%</Text>
          </View>
        )}
        
        {record.body_temperature && (
          <View style={styles.valueRow}>
            <Ionicons name="thermometer" size={16} color="#F7CA88" />
            <Text style={styles.valueText}>Temperatura: {record.body_temperature.toFixed(1)}°C</Text>
          </View>
        )}
        
        {record.steps && (
          <View style={styles.valueRow}>
            <Ionicons name="walk" size={16} color="#66BB6A" />
            <Text style={styles.valueText}>Passos: {record.steps.toLocaleString('pt-BR')}</Text>
          </View>
        )}
        
        {record.calories && (
          <View style={styles.valueRow}>
            <Ionicons name="flame" size={16} color="#FFA726" />
            <Text style={styles.valueText}>Calorias: {record.calories} kcal</Text>
          </View>
        )}
      </View>

      <View style={styles.sourceInfo}>
        <Ionicons name="phone-portrait" size={12} color="#999" />
        <Text style={styles.sourceText}>
          {record.device_name || 'Samsung Health'} • {record.source || 'Health Connect'}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#6A8DFD', '#8A6EF5']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dados Vitais</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A8DFD" />
          <Text style={styles.loadingText}>Carregando dados do Samsung Health...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <LinearGradient colors={['#6A8DFD', '#8A6EF5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dados Vitais</Text>
        <TouchableOpacity style={styles.syncButton} onPress={syncSamsungHealthData}>
          <Ionicons name="sync" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {!isLoggedIn ? (
          // Tela para usuários não logados
          <View style={styles.loginPromptContainer}>
            <Ionicons name="person-outline" size={80} color="#9BA3B7" />
            <Text style={styles.loginPromptTitle}>Login Necessário</Text>
            <Text style={styles.loginPromptText}>
              Para acessar seus dados vitais reais do Samsung Health, faça login na sua conta.
            </Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate('LoginScreen')}
            >
              <Text style={styles.loginButtonText}>Fazer Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Quick Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Últimos Valores</Text>
              <View style={styles.statsGrid}>
                {vitalTypes.map((type) => {
                  const latestValue = getLatestValue(type.id);
                  return (
                    <View key={type.id} style={[styles.statCard, { borderTopColor: type.color }]}>
                      <Ionicons name={type.icon} size={24} color={type.color} />
                      <Text style={styles.statTitle}>{type.name}</Text>
                      <Text style={styles.statValue}>
                        {latestValue ? `${latestValue} ${type.unit}` : 'Sem dados'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Sync Info */}
            {lastSync && (
              <View style={styles.syncInfo}>
                <Ionicons name="sync" size={16} color="#666" />
                <Text style={styles.syncText}>Última sincronização: {lastSync}</Text>
              </View>
            )}

            {/* Real Data Records */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Registros Samsung Health</Text>
                <TouchableOpacity onPress={openHealthConnectSettings}>
                  <Ionicons name="settings" size={20} color="#6A8DFD" />
                </TouchableOpacity>
              </View>
              
              {vitalSigns.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="phone-portrait" size={64} color="#9BA3B7" />
                  <Text style={styles.emptyTitle}>Nenhum Dado Encontrado</Text>
                  <Text style={styles.emptyText}>
                    Sincronize com o Samsung Health para ver seus dados vitais reais
                  </Text>
                  <TouchableOpacity
                    style={styles.syncFirstButton}
                    onPress={syncSamsungHealthData}
                  >
                    <Ionicons name="sync" size={20} color="#fff" />
                    <Text style={styles.syncFirstButtonText}>Sincronizar Samsung Health</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                vitalSigns.map((record, index) => renderVitalCard(record, index))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#6A8DFD' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666', fontWeight: '500' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 50 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  syncButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  placeholder: { width: 40 },
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  
  loginPromptContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff', margin: 20, borderRadius: 20, elevation: 4 },
  loginPromptTitle: { fontSize: 24, fontWeight: 'bold', color: '#2D3142', marginTop: 20, marginBottom: 15 },
  loginPromptText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  loginButton: { backgroundColor: '#6A8DFD', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  section: { margin: 15, marginBottom: 5 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3142' },
  
  syncInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginHorizontal: 15 },
  syncText: { fontSize: 12, color: '#666', marginLeft: 5 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, width: '48%', marginBottom: 15, borderTopWidth: 4, alignItems: 'center', elevation: 4 },
  statTitle: { fontSize: 12, color: '#666', marginTop: 8, marginBottom: 4, textAlign: 'center' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#2D3142', textAlign: 'center' },
  
  vitalCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  vitalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vitalTypeContainer: { flexDirection: 'row', alignItems: 'center' },
  vitalType: { fontSize: 16, fontWeight: 'bold', color: '#2D3142', marginLeft: 8 },
  vitalTime: { fontSize: 12, color: '#666' },
  
  vitalValues: { marginBottom: 10 },
  valueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  valueText: { fontSize: 14, color: '#2D3142', marginLeft: 8 },
  
  sourceInfo: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  sourceText: { fontSize: 11, color: '#999', marginLeft: 4 },
  
  emptyContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 4 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3142', marginTop: 15, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
  syncFirstButton: { flexDirection: 'row', backgroundColor: '#6A8DFD', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  syncFirstButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});

export default VitalSignsScreen; 