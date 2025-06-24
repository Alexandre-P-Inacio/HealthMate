/**
 * EXEMPLO DE USO COMPLETO
 * Demonstra como usar useHealthData() e HealthDashboard
 * Conforme especificado no prompt original
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import useHealthData from '../hooks/useHealthData';
import HealthDashboard from './HealthDashboard';

const HealthDataExample: React.FC = () => {
  // Hook conforme especificado no exemplo
  const { data, loading, error, refresh } = useHealthData({
    refreshInterval: 10, // Atualiza a cada 10 segundos conforme solicitado
    daysBack: 1,
    autoRefresh: true,
    requestPermissionsOnMount: true
  });

  // Loading conforme especificado no exemplo
  if (loading) return <ActivityIndicator />;
  
  // Error conforme especificado no exemplo
  if (error) return <Text>Erro: {error}</Text>;

  // Uso do HealthDashboard conforme especificado no exemplo
  return (
    <HealthDashboard
      steps={data?.steps}
      calories={data?.calories}
      heartRate={data?.heartRate}
      distance={data?.distance}
      bloodPressure={data?.bloodPressure}
      bloodOxygen={data?.bloodOxygen}
      bodyTemperature={data?.bodyTemperature}
      lastUpdated={data?.lastUpdated}
      sources={data?.sources}
      onRefresh={refresh}
    />
  );
};

/**
 * EXEMPLO MAIS AVANÇADO com tratamento completo de estados
 */
export const AdvancedHealthExample: React.FC = () => {
  const { 
    data, 
    loading, 
    error, 
    hasPermissions, 
    isSupported, 
    lastRefresh, 
    refresh, 
    requestPermissions 
  } = useHealthData({
    refreshInterval: 30, // Atualização a cada 30 segundos
    daysBack: 7, // Busca dados dos últimos 7 dias
    autoRefresh: true,
    requestPermissionsOnMount: true
  });

  return (
    <View style={styles.container}>
      <HealthDashboard
        steps={data?.steps}
        calories={data?.calories}
        heartRate={data?.heartRate}
        distance={data?.distance}
        bloodPressure={data?.bloodPressure}
        bloodOxygen={data?.bloodOxygen}
        bodyTemperature={data?.bodyTemperature}
        lastUpdated={data?.lastUpdated}
        sources={data?.sources}
        loading={loading}
        error={error}
        onRefresh={refresh}
        onRequestPermissions={requestPermissions}
        hasPermissions={hasPermissions}
        isSupported={isSupported}
      />
      
      {/* Debug info */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Debug Info:</Text>
          <Text style={styles.debugText}>Suportado: {isSupported ? 'Sim' : 'Não'}</Text>
          <Text style={styles.debugText}>Permissões: {hasPermissions ? 'Sim' : 'Não'}</Text>
          <Text style={styles.debugText}>
            Última atualização: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'N/A'}
          </Text>
          <Text style={styles.debugText}>Fontes: {data?.sources?.join(', ') || 'N/A'}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default HealthDataExample; 