import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import IntegratedHealthConnectService from '../services/IntegratedHealthConnectService';

const { width } = Dimensions.get('window');

const ScaleDataDashboard = () => {
  const [scaleData, setScaleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showData, setShowData] = useState(false);

  // Busca TODOS os dados da balança
  const fetchAllScaleData = async () => {
    try {
      setLoading(true);
      const result = await IntegratedHealthConnectService.getAllHealthConnectData(30);
      
      if (result.success) {
        // Processa os dados para o formato esperado pelo dashboard
        const processedData = processHealthDataForDashboard(result.healthConnectData);
        setScaleData(processedData);
        setShowData(true);
        
        // Mostra resumo em alerta
        Alert.alert(
          '⚖️ Dados da Balança Obtidos!',
          `✅ ${processedData.availableDataCount}/${processedData.totalDataTypes} tipos de dados encontrados\n\n` +
          `📊 Dados disponíveis:\n${processedData.summary.slice(0, 4).join('\n')}`,
          [{ text: 'Ver Todos os Dados', style: 'default' }]
        );
      } else {
        Alert.alert(
          '⚠️ Atenção', 
          result.error || 'Falha ao buscar dados da balança.\n\nCertifique-se de que as permissões foram concedidas no Health Connect.',
          [
            { text: 'Tentar Novamente', onPress: fetchAllScaleData },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      Alert.alert('❌ Erro', `Erro inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Processa dados do Health Connect para o formato do dashboard
  const processHealthDataForDashboard = (healthConnectData) => {
    const data = {};
    const summary = [];
    let availableDataCount = 0;
    const totalDataTypes = 8; // Peso, altura, IMC, FC, gordura, massa magra, massa óssea, água

    // Peso
    if (healthConnectData.Weight?.count > 0) {
      data.weight = healthConnectData.Weight.rawData[0].weight;
      summary.push('⚖️ Peso: Disponível');
      availableDataCount++;
    }

    // Altura
    if (healthConnectData.Height?.count > 0) {
      data.height = healthConnectData.Height.rawData[0].height;
      summary.push('📏 Altura: Disponível');
      availableDataCount++;
    }

    // Frequência Cardíaca
    if (healthConnectData.HeartRate?.count > 0) {
      data.heartRate = healthConnectData.HeartRate.rawData[0].beatsPerMinute;
      summary.push('❤️ Frequência Cardíaca: Disponível');
      availableDataCount++;
    }

    // Gordura Corporal
    if (healthConnectData.BodyFat?.count > 0) {
      data.bodyFat = healthConnectData.BodyFat.rawData[0].percentage;
      summary.push('🥩 Gordura Corporal: Disponível');
      availableDataCount++;
    }

    // Massa Magra
    if (healthConnectData.LeanBodyMass?.count > 0) {
      data.leanBodyMass = healthConnectData.LeanBodyMass.rawData[0].mass;
      summary.push('💪 Massa Magra: Disponível');
      availableDataCount++;
    }

    // Massa Óssea
    if (healthConnectData.BoneMass?.count > 0) {
      data.boneMass = healthConnectData.BoneMass.rawData[0].mass;
      summary.push('🦴 Massa Óssea: Disponível');
      availableDataCount++;
    }

    // Água Corporal
    if (healthConnectData.BodyWaterMass?.count > 0) {
      data.bodyWaterMass = healthConnectData.BodyWaterMass.rawData[0].mass;
      summary.push('💧 Água Corporal: Disponível');
      availableDataCount++;
    }

    // Taxa Metabólica Basal
    if (healthConnectData.BasalMetabolicRate?.count > 0) {
      data.basalMetabolicRate = healthConnectData.BasalMetabolicRate.rawData[0].basalMetabolicRate;
      summary.push('🔥 Taxa Metabólica: Disponível');
      availableDataCount++;
    }

    // Calcula IMC se peso e altura estão disponíveis
    if (data.weight && data.height) {
      const heightInMeters = data.height / 100;
      data.bmi = (data.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }

    return {
      data,
      summary,
      availableDataCount,
      totalDataTypes,
      recommendations: generateRecommendations(data)
    };
  };

  // Gera recomendações baseadas nos dados
  const generateRecommendations = (data) => {
    const recommendations = [];

    if (data.bmi) {
      const bmi = parseFloat(data.bmi);
      if (bmi < 18.5) {
        recommendations.push({
          type: 'warning',
          title: 'Abaixo do Peso',
          message: 'Considere aumentar a ingestão calórica de forma saudável'
        });
      } else if (bmi > 25) {
        recommendations.push({
          type: 'warning',
          title: 'Acima do Peso',
          message: 'Considere uma dieta balanceada e exercícios regulares'
        });
      }
    }

    if (data.bodyFat && data.bodyFat > 25) {
      recommendations.push({
        type: 'info',
        title: 'Gordura Corporal Elevada',
        message: 'Foque em exercícios cardiovasculares e musculação'
      });
    }

    return recommendations;
  };

  // Renderiza cartão de dado individual
  const renderDataCard = (title, value, unit, icon, color = '#6A8DFD', description = '') => (
    <View style={[styles.dataCard, { borderLeftColor: color }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
        </View>
      </View>
      <Text style={[styles.cardValue, { color }]}>
        {value !== null && value !== undefined ? `${value} ${unit}` : 'Não disponível'}
      </Text>
    </View>
  );

  // Determina cor do IMC
  const getBMIColor = (bmi) => {
    if (!bmi) return '#666';
    const bmiValue = parseFloat(bmi);
    if (bmiValue < 18.5) return '#FFC107'; // Amarelo - Abaixo do peso
    if (bmiValue < 25) return '#4CAF50'; // Verde - Normal
    if (bmiValue < 30) return '#FF9800'; // Laranja - Sobrepeso
    return '#F44336'; // Vermelho - Obesidade
  };

  // Renderiza seção de dados da balança
  const renderScaleDataSection = () => {
    if (!scaleData || !showData) return null;

    const { data, recommendations, availableDataCount, totalDataTypes } = scaleData;

    return (
      <ScrollView style={styles.dataSection}>
        {/* Header da seção */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚖️ Dados Completos da Balança</Text>
          <Text style={styles.sectionSubtitle}>
            {availableDataCount}/{totalDataTypes} tipos de dados disponíveis
          </Text>
          <TouchableOpacity 
            onPress={() => setShowData(false)}
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕ Fechar</Text>
          </TouchableOpacity>
        </View>

        {/* Categoria 1: Medidas Básicas */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>📊 Medidas Fundamentais</Text>
          <View style={styles.cardsGrid}>
            {renderDataCard(
              'Peso Corporal', 
              data.weight, 
              'kg', 
              '⚖️', 
              '#4CAF50',
              'Peso atual registrado'
            )}
            {renderDataCard(
              'Altura', 
              data.height, 
              'cm', 
              '📏', 
              '#2196F3',
              'Altura registrada'
            )}
            {renderDataCard(
              'Índice de Massa Corporal', 
              data.bmi, 
              '', 
              '📈', 
              getBMIColor(data.bmi),
              'IMC = Peso / Altura²'
            )}
            {renderDataCard(
              'Frequência Cardíaca', 
              data.heartRate, 
              'bpm', 
              '❤️', 
              '#E91E63',
              'Batimentos por minuto'
            )}
          </View>
        </View>

        {/* Categoria 2: Composição Corporal */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>🧬 Composição Corporal</Text>
          <View style={styles.cardsGrid}>
            {renderDataCard(
              'Gordura Corporal', 
              data.bodyFat, 
              '%', 
              '🥩', 
              '#FF9800',
              'Percentual de gordura'
            )}
            {renderDataCard(
              'Massa Magra', 
              data.leanBodyMass, 
              'kg', 
              '💪', 
              '#8BC34A',
              'Músculos + órgãos'
            )}
            {renderDataCard(
              'Massa Óssea', 
              data.boneMass, 
              'kg', 
              '🦴', 
              '#795548',
              'Peso dos ossos'
            )}
            {renderDataCard(
              'Água Corporal', 
              data.bodyWaterMass, 
              'kg', 
              '💧', 
              '#00BCD4',
              'Quantidade de água'
            )}
          </View>
        </View>

        {/* Categoria 3: Metabolismo */}
        <View style={styles.category}>
          <Text style={styles.categoryTitle}>🔥 Metabolismo</Text>
          <View style={styles.cardsGrid}>
            {renderDataCard(
              'Taxa Metabólica Basal', 
              data.basalMetabolicRate, 
              'cal/dia', 
              '🔥', 
              '#FF5722',
              'Calorias em repouso'
            )}
          </View>
        </View>

        {/* Recomendações Personalizadas */}
        {recommendations && recommendations.length > 0 && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsTitle}>💡 Recomendações Personalizadas</Text>
            {recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationCard}>
                <Text style={styles.recommendationText}>{rec.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Informações sobre os dados */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ Sobre os Dados</Text>
          <Text style={styles.infoText}>
            • Dados coletados dos últimos 30 dias{'\n'}
            • Fonte: Health Connect (todos os apps conectados){'\n'}
            • Última atualização: {new Date().toLocaleString('pt-BR')}{'\n'}
            • Dados mais recentes são priorizados
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Principal */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚖️ Balança Inteligente</Text>
        <Text style={styles.headerSubtitle}>Health Connect - Dados Completos</Text>
      </View>

      {/* Botão Principal */}
      {!showData && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.mainButton}
            onPress={fetchAllScaleData}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="large" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>⚖️</Text>
                <Text style={styles.buttonTitle}>Solicitar TODOS os Dados</Text>
                <Text style={styles.buttonSubtitle}>
                  9 tipos de dados da balança e composição corporal
                </Text>
                <View style={styles.dataTypesList}>
                  <Text style={styles.dataTypesText}>
                    ✓ Peso  ✓ Altura  ✓ IMC  ✓ Gordura Corporal{'\n'}
                    ✓ Massa Magra  ✓ Massa Óssea  ✓ Água Corporal{'\n'}
                    ✓ Taxa Metabólica Basal  ✓ Frequência Cardíaca
                  </Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.instructionText}>
            📱 Este botão irá solicitar acesso a TODOS os tipos de dados mostrados na tela de permissões do Health Connect
          </Text>
        </View>
      )}

      {/* Dados da Balança */}
      {renderScaleDataSection()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#6A8DFD',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E8F0FF',
  },
  buttonContainer: {
    padding: 20,
    alignItems: 'center',
  },
  mainButton: {
    backgroundColor: '#4CAF50',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#E8F5E8',
    textAlign: 'center',
    marginBottom: 15,
  },
  dataTypesList: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 10,
    width: '100%',
  },
  dataTypesText: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 18,
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    paddingHorizontal: 10,
  },
  dataSection: {
    flex: 1,
  },
  sectionHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  closeButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  category: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginBottom: 5,
    borderRadius: 15,
    padding: 15,
    elevation: 2,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dataCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    width: (width - 80) / 2,
    borderLeftWidth: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  cardDescription: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recommendationsSection: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginTop: 5,
    borderRadius: 15,
    padding: 15,
    elevation: 2,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  recommendationCard: {
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  recommendationText: {
    fontSize: 14,
    color: '#555',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    marginTop: 5,
    borderRadius: 15,
    padding: 15,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});

export default ScaleDataDashboard; 