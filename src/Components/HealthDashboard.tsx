/**
 * 5. Componente HealthDashboard
 * Mostra dados de saúde (passos, calorias, frequência cardíaca) em cards separados
 * Inclui loading, erro e botão de atualização manual
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { HealthData } from '../hooks/useHealthData';

// ===========================================
// TIPOS E INTERFACES
// ===========================================

export interface HealthDashboardProps {
  steps?: number | null;
  calories?: number | null;
  heartRate?: number | null;
  distance?: number | null;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  } | null;
  bloodOxygen?: number | null;
  bodyTemperature?: number | null;
  lastUpdated?: string;
  sources?: string[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onRequestPermissions?: () => void;
  hasPermissions?: boolean;
  isSupported?: boolean;
}

interface HealthCardProps {
  title: string;
  value: string | number | null;
  unit: string;
  icon: string;
  iconType?: 'ionicons' | 'fontawesome5';
  color: string;
  backgroundColor: string;
}

// ===========================================
// COMPONENTES AUXILIARES
// ===========================================

const HealthCard: React.FC<HealthCardProps> = ({
  title,
  value,
  unit,
  icon,
  iconType = 'ionicons',
  color,
  backgroundColor
}) => {
  const displayValue = value !== null && value !== undefined ? value : '--';
  
  return (
    <View style={[styles.healthCard, { backgroundColor }]}>
      <View style={styles.cardHeader}>
        {iconType === 'fontawesome5' ? (
          <FontAwesome5 name={icon} size={24} color={color} />
        ) : (
          <Ionicons name={icon as any} size={24} color={color} />
        )}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      
      <View style={styles.cardContent}>
        <Text style={[styles.cardValue, { color }]}>
          {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
        </Text>
        <Text style={styles.cardUnit}>{unit}</Text>
      </View>
      
      {value === null && (
        <Text style={styles.noDataText}>Sem dados</Text>
      )}
    </View>
  );
};

const ErrorCard: React.FC<{
  error: string;
  onRetry?: () => void;
  onRequestPermissions?: () => void;
  hasPermissions?: boolean;
}> = ({ error, onRetry, onRequestPermissions, hasPermissions }) => (
  <View style={styles.errorCard}>
    <Ionicons name="warning" size={32} color="#E74C3C" />
    <Text style={styles.errorTitle}>Erro nos Dados de Saúde</Text>
    <Text style={styles.errorMessage}>{error}</Text>
    
    <View style={styles.errorButtons}>
      {!hasPermissions && onRequestPermissions && (
        <TouchableOpacity 
          style={[styles.errorButton, styles.permissionButton]} 
          onPress={onRequestPermissions}
        >
          <Ionicons name="shield-checkmark" size={20} color="#FFF" />
          <Text style={styles.errorButtonText}>Solicitar Permissões</Text>
        </TouchableOpacity>
      )}
      
      {onRetry && (
        <TouchableOpacity 
          style={[styles.errorButton, styles.retryButton]} 
          onPress={onRetry}
        >
          <Ionicons name="refresh" size={20} color="#FFF" />
          <Text style={styles.errorButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const LoadingCard: React.FC = () => (
  <View style={styles.loadingCard}>
    <ActivityIndicator size="large" color="#6A8DFD" />
    <Text style={styles.loadingText}>Carregando dados de saúde...</Text>
    <Text style={styles.loadingSubtext}>
      Aguarde enquanto sincronizamos com o Health Connect
    </Text>
  </View>
);

const UnsupportedCard: React.FC = () => (
  <View style={styles.unsupportedCard}>
    <Ionicons name="phone-portrait" size={32} color="#FFC107" />
    <Text style={styles.unsupportedTitle}>Dispositivo Não Suportado</Text>
    <Text style={styles.unsupportedMessage}>
      Health Connect está disponível apenas no Android 14 ou superior.
    </Text>
  </View>
);

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================

export const HealthDashboard: React.FC<HealthDashboardProps> = ({
  steps,
  calories,
  heartRate,
  distance,
  bloodPressure,
  bloodOxygen,
  bodyTemperature,
  lastUpdated,
  sources = [],
  loading = false,
  error = null,
  onRefresh,
  onRequestPermissions,
  hasPermissions = true,
  isSupported = Platform.OS === 'android'
}) => {
  
  // ===========================================
  // RENDERIZAÇÕES CONDICIONAIS
  // ===========================================

  // Dispositivo não suportado
  if (!isSupported) {
    return <UnsupportedCard />;
  }

  // Estado de loading
  if (loading && !steps && !calories && !heartRate) {
    return <LoadingCard />;
  }

  // Estado de erro
  if (error && !hasPermissions) {
    return (
      <ErrorCard 
        error={error}
        onRetry={onRefresh}
        onRequestPermissions={onRequestPermissions}
        hasPermissions={hasPermissions}
      />
    );
  }

  // ===========================================
  // DADOS PARA OS CARDS
  // ===========================================

  const healthCards = [
    {
      title: 'Passos',
      value: steps,
      unit: 'passos',
      icon: 'walk',
      iconType: 'ionicons' as const,
      color: '#3498DB',
      backgroundColor: '#EBF5FF'
    },
    {
      title: 'Calorias',
      value: calories,
      unit: 'kcal',
      icon: 'flame',
      iconType: 'ionicons' as const,
      color: '#E67E22',
      backgroundColor: '#FDF2E7'
    },
    {
      title: 'Freq. Cardíaca',
      value: heartRate,
      unit: 'bpm',
      icon: 'heart',
      iconType: 'ionicons' as const,
      color: '#E74C3C',
      backgroundColor: '#FDEAEA'
    },
    {
      title: 'Distância',
      value: distance,
      unit: 'km',
      icon: 'map',
      iconType: 'ionicons' as const,
      color: '#27AE60',
      backgroundColor: '#E8F5E8'
    },
    {
      title: 'SpO2',
      value: bloodOxygen,
      unit: '%',
      icon: 'water',
      iconType: 'ionicons' as const,
      color: '#9B59B6',
      backgroundColor: '#F4ECFF'
    },
    {
      title: 'Temperatura',
      value: bodyTemperature,
      unit: '°C',
      icon: 'thermometer',
      iconType: 'ionicons' as const,
      color: '#FF6B6B',
      backgroundColor: '#FFE8E8'
    }
  ];

  // Adiciona pressão arterial se disponível
  if (bloodPressure) {
    healthCards.push({
      title: 'Pressão Arterial',
      value: `${bloodPressure.systolic}/${bloodPressure.diastolic}`,
      unit: 'mmHg',
      icon: 'fitness',
      iconType: 'ionicons' as const,
      color: '#E91E63',
      backgroundColor: '#FCE8F0'
    });
  }

  // ===========================================
  // RENDERIZAÇÃO PRINCIPAL
  // ===========================================

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={onRefresh}
          colors={['#6A8DFD']}
          tintColor="#6A8DFD"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Dados de Saúde</Text>
          
          {onRefresh && (
            <TouchableOpacity 
              style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
              onPress={onRefresh}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#6A8DFD" />
              ) : (
                <Ionicons name="refresh" size={20} color="#6A8DFD" />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Informações de atualização */}
        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Última atualização: {new Date(lastUpdated).toLocaleString()}
          </Text>
        )}

        {/* Fontes de dados */}
        {sources.length > 0 && (
          <View style={styles.sourcesContainer}>
            <Text style={styles.sourcesLabel}>Fontes: </Text>
            <Text style={styles.sourcesText}>{sources.join(', ')}</Text>
          </View>
        )}
      </View>

      {/* Erro não crítico */}
      {error && hasPermissions && (
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={20} color="#F39C12" />
          <Text style={styles.warningText}>{error}</Text>
        </View>
      )}

      {/* Grid de Cards de Saúde */}
      <View style={styles.cardsGrid}>
        {healthCards.map((card, index) => (
          <HealthCard
            key={index}
            title={card.title}
            value={card.value}
            unit={card.unit}
            icon={card.icon}
            iconType={card.iconType}
            color={card.color}
            backgroundColor={card.backgroundColor}
          />
        ))}
      </View>

      {/* Rodapé com instruções */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          💡 Para melhores resultados, use um smartwatch ou app de fitness compatível com Health Connect
        </Text>
      </View>
    </ScrollView>
  );
};

// ===========================================
// ESTILOS
// ===========================================

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 cards por linha com margem

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 4,
  },
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  sourcesLabel: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '600',
  },
  sourcesText: {
    fontSize: 12,
    color: '#495057',
    flex: 1,
  },

  // Warning Card
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginLeft: 8,
    flex: 1,
  },

  // Cards Grid
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  healthCard: {
    width: cardWidth,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 8,
    flex: 1,
  },
  cardContent: {
    alignItems: 'flex-start',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  cardUnit: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 11,
    color: '#ADB5BD',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Error Card
  errorCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginTop: 12,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  permissionButton: {
    backgroundColor: '#6A8DFD',
  },
  retryButton: {
    backgroundColor: '#28A745',
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Loading Card
  loadingCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
  },

  // Unsupported Card
  unsupportedCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  unsupportedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F39C12',
    marginTop: 12,
    marginBottom: 8,
  },
  unsupportedMessage: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default HealthDashboard; 