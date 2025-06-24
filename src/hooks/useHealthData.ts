/**
 * Hook personalizado useHealthData()
 * Gerencia estados de loading, erro e dados de saúde
 * Solicita permissões ao montar e busca dados periodicamente
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import HealthConnectService from '../services/HealthConnectTypeScript';

// ===========================================
// TIPOS E INTERFACES
// ===========================================

export interface HealthData {
  steps: number | null;
  calories: number | null;
  heartRate: number | null;
  distance?: number | null;
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  } | null;
  bloodOxygen?: number | null;
  bodyTemperature?: number | null;
  lastUpdated: string;
  sources: string[];
}

export interface UseHealthDataOptions {
  refreshInterval?: number; // Intervalo de atualização em segundos (padrão: 30)
  daysBack?: number; // Quantos dias buscar (padrão: 1)
  autoRefresh?: boolean; // Se deve atualizar automaticamente (padrão: true)
  requestPermissionsOnMount?: boolean; // Se deve solicitar permissões ao montar (padrão: true)
}

export interface UseHealthDataReturn {
  data: HealthData | null;
  loading: boolean;
  error: string | null;
  hasPermissions: boolean;
  isSupported: boolean;
  lastRefresh: Date | null;
  refresh: () => Promise<void>;
  requestPermissions: () => Promise<void>;
}

// ===========================================
// HOOK PRINCIPAL
// ===========================================

export function useHealthData(options: UseHealthDataOptions = {}): UseHealthDataReturn {
  const {
    refreshInterval = 30, // 30 segundos
    daysBack = 1,
    autoRefresh = true,
    requestPermissionsOnMount = true
  } = options;

  // Estados
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermissions, setHasPermissions] = useState<boolean>(false);
  const [isSupported, setIsSupported] = useState<boolean>(Platform.OS === 'android');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Refs para controle de intervalos
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef<boolean>(true);

  /**
   * 4. Função para solicitar permissões
   */
  const requestPermissions = useCallback(async (): Promise<void> => {
    try {
      console.log('🔐 [useHealthData] Solicitando permissões...');
      setLoading(true);
      setError(null);

      if (!isSupported) {
        throw new Error('Health Connect está disponível apenas no Android 14+');
      }

      const result = await HealthConnectService.requestHealthPermissions();
      
      if (result.success) {
        setHasPermissions(true);
        console.log(`✅ [useHealthData] Permissões concedidas: ${result.granted.join(', ')}`);
      } else {
        setHasPermissions(false);
        setError(result.error || 'Falha ao obter permissões');
        console.log('❌ [useHealthData] Falha nas permissões:', result.error);
      }

    } catch (err: any) {
      console.error('❌ [useHealthData] Erro ao solicitar permissões:', err);
      setError(err.message);
      setHasPermissions(false);
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  /**
   * 3. Função para buscar dados de saúde
   */
  const fetchHealthData = useCallback(async (): Promise<void> => {
    try {
      console.log('📊 [useHealthData] Buscando dados de saúde...');
      setLoading(true);
      setError(null);

      if (!isSupported) {
        throw new Error('Health Connect não suportado neste dispositivo');
      }

      if (!hasPermissions) {
        throw new Error('Permissões necessárias não foram concedidas');
      }

      const result = await HealthConnectService.fetchHealthData(daysBack);
      
      if (result.success && result.data) {
        setData(result.data);
        setLastRefresh(new Date());
        console.log('✅ [useHealthData] Dados obtidos com sucesso');
      } else {
        throw new Error(result.error || 'Falha ao buscar dados');
      }

    } catch (err: any) {
      console.error('❌ [useHealthData] Erro ao buscar dados:', err);
      setError(err.message);
      
      // Se for erro de permissões, atualiza estado
      if (err.message.includes('permiss')) {
        setHasPermissions(false);
      }
    } finally {
      setLoading(false);
    }
  }, [isSupported, hasPermissions, daysBack]);

  /**
   * Função de refresh manual
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (!hasPermissions) {
      await requestPermissions();
      return;
    }
    await fetchHealthData();
  }, [hasPermissions, requestPermissions, fetchHealthData]);

  /**
   * Configura atualização automática
   */
  const setupAutoRefresh = useCallback(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    // Limpa intervalo anterior
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Cria novo intervalo
    refreshIntervalRef.current = setInterval(() => {
      if (isActiveRef.current && hasPermissions) {
        console.log(`⏰ [useHealthData] Atualização automática (${refreshInterval}s)`);
        fetchHealthData();
      }
    }, refreshInterval * 1000);

    console.log(`⏱️ [useHealthData] Auto-refresh configurado para ${refreshInterval}s`);
  }, [autoRefresh, refreshInterval, hasPermissions, fetchHealthData]);

  /**
   * Gerencia estado do app (ativo/inativo)
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    isActiveRef.current = nextAppState === 'active';
    
    if (nextAppState === 'active' && hasPermissions) {
      console.log('📱 [useHealthData] App ativo - atualizando dados');
      fetchHealthData();
    }
  }, [hasPermissions, fetchHealthData]);

  // ===========================================
  // EFEITOS
  // ===========================================

  /**
   * Inicialização ao montar o componente
   */
  useEffect(() => {
    const initializeHealthData = async () => {
      console.log('🚀 [useHealthData] Inicializando...');
      
      if (requestPermissionsOnMount && isSupported) {
        await requestPermissions();
      }
    };

    initializeHealthData();
  }, [requestPermissionsOnMount, isSupported, requestPermissions]);

  /**
   * Busca dados quando há permissões
   */
  useEffect(() => {
    if (hasPermissions) {
      fetchHealthData();
    }
  }, [hasPermissions, fetchHealthData]);

  /**
   * Configura auto-refresh quando necessário
   */
  useEffect(() => {
    setupAutoRefresh();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [setupAutoRefresh]);

  /**
   * Monitora estado do app
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [handleAppStateChange]);

  /**
   * Cleanup ao desmontar
   */
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // ===========================================
  // RETORNO DO HOOK
  // ===========================================

  return {
    data,
    loading,
    error,
    hasPermissions,
    isSupported,
    lastRefresh,
    refresh,
    requestPermissions
  };
}

export default useHealthData; 