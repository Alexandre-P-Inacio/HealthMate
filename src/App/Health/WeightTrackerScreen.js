import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import HealthConnectService from '../../services/HealthConnectTypeScript';

const WeightTrackerScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [healthResponses, setHealthResponses] = useState(null);

  const fetchAllHealthData = async () => {
    setLoading(true);
    console.log('🚀 [Fetch] Iniciando busca de dados da balança digital...');
    
    try {
      const promises = [
        HealthConnectService.getWeightData(),
        HealthConnectService.getBodyFatData(),
        HealthConnectService.getLeanBodyMassData(),
        HealthConnectService.getBodyWaterMassData(),
        HealthConnectService.getBoneMassData(),
        HealthConnectService.getBasalMetabolicRateData(),
        // Removed getHeightData() - permission error
      ];

      const results = await Promise.allSettled(promises);
      
      // Process and extract data properly
      const responses = {
        weightRes: null,
        bodyFatRes: null,
        leanBodyMassRes: null,
        bodyWaterMassRes: null,
        boneMassRes: null,
        bmrRes: null,
      };

      const labels = ['Weight', 'BodyFat', 'LeanBodyMass', 'BodyWaterMass', 'BoneMass', 'BMR'];
      
      results.forEach((result, index) => {
        const label = labels[index];
        console.log(`📊 [${label}] Status: ${result.status}`);
        
        if (result.status === 'fulfilled') {
          const data = result.value;
          console.log(`✅ [${label}] Raw response:`, JSON.stringify(data, null, 2));
          
          // Extract the actual records array
          let extractedData = null;
          if (data && data.records) {
            extractedData = { data: data.records };
            console.log(`🔍 [${label}] Extracted ${data.records.length} records from .records`);
          } else if (data && Array.isArray(data)) {
            extractedData = { data: data };
            console.log(`🔍 [${label}] Using direct array with ${data.length} items`);
          } else if (data && data.data && Array.isArray(data.data)) {
            extractedData = { data: data.data };
            console.log(`🔍 [${label}] Using .data array with ${data.data.length} items`);
          } else {
            extractedData = { data: [] };
            console.log(`⚠️ [${label}] No recognizable data structure, using empty array`);
          }
          
          // Store in responses
          switch (index) {
            case 0: responses.weightRes = extractedData; break;
            case 1: responses.bodyFatRes = extractedData; break;
            case 2: responses.leanBodyMassRes = extractedData; break;
            case 3: responses.bodyWaterMassRes = extractedData; break;
            case 4: responses.boneMassRes = extractedData; break;
            case 5: responses.bmrRes = extractedData; break;
          }
        } else {
          console.log(`❌ [${label}] Error:`, result.reason);
        }
      });

      console.log('🎯 [Fetch] Processamento concluído. Salvando respostas...');
      setHealthResponses(responses);
      
      // Log final structure
      Object.keys(responses).forEach(key => {
        if (responses[key] && responses[key].data) {
          console.log(`📋 [Final] ${key}: ${responses[key].data.length} registros`);
        }
      });
      
    } catch (error) {
      console.error('❌ [Fetch] Erro geral:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper para formatar data/hora
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Create table rows from actual data
  const createTableRows = () => {
    if (!healthResponses) return [];

    let allRows = [];
    
    console.log('🔍 [Tabela] Criando linhas da tabela...');
    
    // Weight data
    if (healthResponses.weightRes && healthResponses.weightRes.data) {
      healthResponses.weightRes.data.forEach(item => {
        if (item.weight && item.weight.inKilograms) {
          allRows.push({
            date: item.time,
            metric: 'Peso',
            value: item.weight.inKilograms.toFixed(2),
            unit: 'kg'
          });
        }
      });
    }
    
    // Body fat data
    if (healthResponses.bodyFatRes && healthResponses.bodyFatRes.data) {
      healthResponses.bodyFatRes.data.forEach(item => {
        if (item.percentage) {
          allRows.push({
            date: item.time,
            metric: 'Gordura corporal',
            value: item.percentage.toFixed(1),
            unit: '%'
          });
        }
      });
    }
    
    // Bone mass data
    if (healthResponses.boneMassRes && healthResponses.boneMassRes.data) {
      healthResponses.boneMassRes.data.forEach(item => {
        if (item.mass && item.mass.inKilograms) {
          allRows.push({
            date: item.time,
            metric: 'Massa óssea',
            value: item.mass.inKilograms.toFixed(2),
            unit: 'kg'
          });
        }
      });
    }
    
    // BMR data
    if (healthResponses.bmrRes && healthResponses.bmrRes.data) {
      healthResponses.bmrRes.data.forEach(item => {
        if (item.basalMetabolicRate && item.basalMetabolicRate.inKilocaloriesPerDay) {
          allRows.push({
            date: item.time,
            metric: 'Taxa metabólica basal',
            value: item.basalMetabolicRate.inKilocaloriesPerDay.toFixed(0),
            unit: 'kcal/dia'
          });
        }
      });
    }
    
    // Lean body mass data
    if (healthResponses.leanBodyMassRes && healthResponses.leanBodyMassRes.data) {
      healthResponses.leanBodyMassRes.data.forEach(item => {
        if (item.mass && item.mass.inKilograms) {
          allRows.push({
            date: item.time,
            metric: 'Massa corporal magra',
            value: item.mass.inKilograms.toFixed(2),
            unit: 'kg'
          });
        }
      });
    }
    
    // Body water mass data
    if (healthResponses.bodyWaterMassRes && healthResponses.bodyWaterMassRes.data) {
      healthResponses.bodyWaterMassRes.data.forEach(item => {
        if (item.mass && item.mass.inKilograms) {
          allRows.push({
            date: item.time,
            metric: 'Massa de água corporal',
            value: item.mass.inKilograms.toFixed(2),
            unit: 'kg'
          });
        }
      });
    }

    console.log(`🎯 [Tabela] ${allRows.length} registros criados para a tabela`);
    
    // Sort by date descending
    return allRows.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const tableRows = createTableRows();

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#6A8DFD', '#8A6EF5']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weight Tracker</Text>
        <View style={styles.placeholder} />
      </LinearGradient>
      
      <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.headerSection}>
            <Ionicons name="scale" size={60} color="#66BB6A" />
            <Text style={styles.title}>Dados da Balança Digital</Text>
            <Text style={styles.subtitle}>Todos os dados de composição corporal do Health Connect</Text>
            
            <TouchableOpacity style={styles.fetchButton} onPress={fetchAllHealthData} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={22} color="#fff" />
                  <Text style={styles.fetchButtonText}>Buscar dados da balança digital</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {healthResponses && (
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.headerCell]}>Data/Hora</Text>
                <Text style={[styles.tableCell, styles.headerCell]}>Métrica</Text>
                <Text style={[styles.tableCell, styles.headerCell]}>Valor</Text>
                <Text style={[styles.tableCell, styles.headerCell]}>Unidade</Text>
              </View>
              
              {tableRows.length > 0 ? (
                tableRows.map((row, idx) => (
                  <View style={styles.tableRow} key={idx}>
                    <Text style={styles.tableCell}>{formatDate(row.date)}</Text>
                    <Text style={styles.tableCell}>{row.metric}</Text>
                    <Text style={styles.tableCell}>{row.value}</Text>
                    <Text style={styles.tableCell}>{row.unit}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <Text style={styles.tableCell}>-</Text>
                  <Text style={styles.tableCell}>Sem dados disponíveis</Text>
                  <Text style={styles.tableCell}>-</Text>
                  <Text style={styles.tableCell}>-</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#6A8DFD' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    paddingTop: 50 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 40 },
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  contentContainer: { 
    padding: 20 
  },
  headerSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#2D3142', 
    marginTop: 15, 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 14, 
    color: '#666', 
    textAlign: 'center', 
    marginBottom: 20 
  },
  fetchButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#6A8DFD', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 25 
  },
  fetchButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 10 
  },
  tableContainer: { 
    backgroundColor: '#fff',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#6A8DFD' 
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0' 
  },
  tableCell: { 
    flex: 1, 
    padding: 12, 
    textAlign: 'center', 
    color: '#333', 
    fontSize: 13 
  },
  headerCell: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
});

export default WeightTrackerScreen; 