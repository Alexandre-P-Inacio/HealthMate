import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import SamsungHealthService from '../../services/SamsungHealthService';
import { useAuth } from '../../contexts/AuthContext';

const HeartRateScreen = () => {
  const navigation = useNavigation();
  const { isLoggedIn } = useAuth();
  const [heartRateData, setHeartRateData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [latestHeartRate, setLatestHeartRate] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchHeartRateData();
    } else {
      showLoginPrompt();
    }
  }, [isLoggedIn]);

  const showLoginPrompt = () => {
    setIsLoading(false);
  };

  const fetchHeartRateData = async () => {
    try {
      setIsLoading(true);
      console.log('❤️ [HeartRate] Buscando dados REAIS do Samsung Health...');

      // Busca dados reais da tabela smartwatch_data
      const result = await SamsungHealthService.getSmartwatchData(30);
      
      if (result.success && result.data.length > 0) {
        // Filtra apenas registros com dados de frequência cardíaca
        const heartRateRecords = result.data.filter(record => record.heart_rate !== null);
        
        if (heartRateRecords.length > 0) {
          console.log(`✅ [HeartRate] ${heartRateRecords.length} registros de frequência cardíaca encontrados`);
          setHeartRateData(heartRateRecords);
          setLatestHeartRate(heartRateRecords[0].heart_rate);
          setLastSync(new Date().toLocaleString('pt-BR'));
        } else {
          console.log('⚠️ [HeartRate] Nenhum dado de frequência cardíaca encontrado');
          setHeartRateData([]);
          setLatestHeartRate(null);
        }
      } else {
        console.log('⚠️ [HeartRate] Nenhum dado encontrado');
        setHeartRateData([]);
        setLatestHeartRate(null);
      }
    } catch (error) {
      console.error('❌ [HeartRate] Erro ao buscar dados:', error);
      Alert.alert('Erro', 'Falha ao carregar dados de frequência cardíaca');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const syncSamsungHealth = async () => {
    try {
      Alert.alert(
        'Sincronizar Samsung Health',
        'Buscar novos dados de frequência cardíaca do Samsung Health?',
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
                  `${syncResult.totalRecords} registros sincronizados!`,
                  [{ text: 'OK', onPress: () => fetchHeartRateData() }]
                );
              } else {
                Alert.alert('Erro', syncResult.error || 'Falha na sincronização');
              }
              
              setIsLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ [HeartRate] Erro na sincronização:', error);
      Alert.alert('Erro', 'Falha na sincronização');
      setIsLoading(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchHeartRateData();
  };

  const getHeartRateZone = (bpm) => {
    if (!bpm) return { zone: 'Unknown', color: '#9BA3B7', description: 'Sem dados' };
    
    if (bpm < 60) return { zone: 'Baixo', color: '#3498DB', description: 'Frequência baixa' };
    if (bpm <= 100) return { zone: 'Normal', color: '#2ECC71', description: 'Frequência normal' };
    if (bpm <= 150) return { zone: 'Elevado', color: '#F39C12', description: 'Frequência elevada' };
    return { zone: 'Alto', color: '#E74C3C', description: 'Frequência alta' };
  };

  const calculateStats = () => {
    if (heartRateData.length === 0) return { min: null, max: null, avg: null };
    
    const rates = heartRateData.map(record => record.heart_rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    
    return { min, max, avg };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderHeartRateCard = (record, index) => {
    const zone = getHeartRateZone(record.heart_rate);
    
    return (
      <View key={index} style={[styles.heartRateCard, { borderLeftColor: zone.color }]}>
        <View style={styles.cardHeader}>
          <View style={styles.heartRateInfo}>
            <Text style={[styles.heartRateValue, { color: zone.color }]}>
              {record.heart_rate} <Text style={styles.bpmText}>bpm</Text>
            </Text>
            <Text style={styles.heartRateZone}>{zone.zone}</Text>
          </View>
          <View style={styles.timeInfo}>
            <Text style={styles.timeText}>{formatDate(record.collected_at)}</Text>
            <Text style={styles.sourceText}>{record.device_name || 'Samsung Health'}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#FF6B6B', '#FF8A80']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Frequência Cardíaca</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Carregando dados do Samsung Health...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#FF6B6B', '#FF8A80']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Frequência Cardíaca</Text>
        <TouchableOpacity style={styles.syncButton} onPress={syncSamsungHealth}>
          <Ionicons name="sync" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView 
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {!isLoggedIn ? (
          // Tela para usuários não logados
          <View style={styles.loginPromptContainer}>
            <Ionicons name="heart-outline" size={80} color="#9BA3B7" />
            <Text style={styles.loginPromptTitle}>Login Necessário</Text>
            <Text style={styles.loginPromptText}>
              Para acessar dados reais de frequência cardíaca do Samsung Health, faça login.
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
            {/* Sync Info */}
            {lastSync && (
              <View style={styles.syncInfo}>
                <Ionicons name="sync" size={16} color="#666" />
                <Text style={styles.syncText}>Última sincronização: {lastSync}</Text>
              </View>
            )}

            {/* Current Heart Rate */}
            {latestHeartRate ? (
              <View style={styles.currentRateContainer}>
                <View style={styles.currentRateCard}>
                  <View style={styles.currentRateHeader}>
                    <Ionicons name="heart" size={32} color="#FF6B6B" />
                    <Text style={styles.currentRateLabel}>Última Medição</Text>
                  </View>
                  <Text style={styles.currentRateValue}>
                    {latestHeartRate} <Text style={styles.bpmLabel}>bpm</Text>
                  </Text>
                  <Text style={[styles.currentRateZone, { color: getHeartRateZone(latestHeartRate).color }]}>
                    {getHeartRateZone(latestHeartRate).zone} - {getHeartRateZone(latestHeartRate).description}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noDataCard}>
                <Ionicons name="heart-outline" size={48} color="#9BA3B7" />
                <Text style={styles.noDataTitle}>Nenhum Dado Encontrado</Text>
                <Text style={styles.noDataText}>
                  Sincronize com o Samsung Health para ver dados de frequência cardíaca
                </Text>
                <TouchableOpacity style={styles.syncDataButton} onPress={syncSamsungHealth}>
                  <Ionicons name="sync" size={20} color="#fff" />
                  <Text style={styles.syncDataButtonText}>Sincronizar Agora</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Statistics */}
            {heartRateData.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Estatísticas (30 dias)</Text>
                <View style={styles.statsContainer}>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{calculateStats().min}</Text>
                    <Text style={styles.statLabel}>Mínimo</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{calculateStats().avg}</Text>
                    <Text style={styles.statLabel}>Média</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statValue}>{calculateStats().max}</Text>
                    <Text style={styles.statLabel}>Máximo</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Historical Data */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Histórico Samsung Health</Text>
              {heartRateData.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="heart-outline" size={64} color="#9BA3B7" />
                  <Text style={styles.emptyTitle}>Nenhuma Medição</Text>
                  <Text style={styles.emptyText}>
                    Seus dados de frequência cardíaca aparecerão aqui após a sincronização
                  </Text>
                </View>
              ) : (
                heartRateData.map((record, index) => renderHeartRateCard(record, index))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FF6B6B' },
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
  loginButton: { backgroundColor: '#FF6B6B', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  syncInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, marginHorizontal: 15 },
  syncText: { fontSize: 12, color: '#666', marginLeft: 5 },
  
  currentRateContainer: { margin: 20 },
  currentRateCard: { backgroundColor: '#fff', borderRadius: 20, padding: 25, elevation: 4, alignItems: 'center' },
  currentRateHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  currentRateLabel: { fontSize: 18, fontWeight: 'bold', color: '#2D3142', marginLeft: 10 },
  currentRateValue: { fontSize: 48, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 10 },
  bpmLabel: { fontSize: 20, color: '#666' },
  currentRateZone: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  
  noDataCard: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 4, margin: 20 },
  noDataTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3142', marginTop: 15, marginBottom: 10 },
  noDataText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
  syncDataButton: { flexDirection: 'row', backgroundColor: '#FF6B6B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, alignItems: 'center' },
  syncDataButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  
  section: { margin: 20, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2D3142', marginBottom: 15 },
  
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 15, padding: 20, elevation: 4 },
  statCard: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#FF6B6B', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
  
  heartRateCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 10, borderLeftWidth: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heartRateInfo: { flex: 1 },
  heartRateValue: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  bpmText: { fontSize: 16, color: '#666' },
  heartRateZone: { fontSize: 14, color: '#666', fontWeight: '600' },
  timeInfo: { alignItems: 'flex-end' },
  timeText: { fontSize: 12, color: '#666', marginBottom: 2 },
  sourceText: { fontSize: 10, color: '#999' },
  
  emptyContainer: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 4 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#2D3142', marginTop: 15, marginBottom: 10 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 }
});

export default HeartRateScreen; 