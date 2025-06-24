/**
 * Health Connect TypeScript Service
 * Projeto: Expo Native (development build) 
 * Funcionalidades: Buscar dados de saúde (passos, calorias, frequência cardíaca) do Health Connect
 * Compatibilidade: Expo Native (não Expo Go)
 */

import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  getSdkStatus,
  readRecords,
  openHealthConnectSettings,
  SdkAvailabilityStatus,
  HealthConnectRecord,
} from 'react-native-health-connect';

// ===========================================
// TIPOS E INTERFACES
// ===========================================

export interface HealthPermission {
  accessType: 'read' | 'write';
  recordType: string;
}

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

export interface HealthDataResult {
  success: boolean;
  data?: HealthData;
  error?: string;
  needsPermissions?: boolean;
}

export interface PermissionResult {
  success: boolean;
  granted: string[];
  error?: string;
}

// ===========================================
// SERVIÇO PRINCIPAL
// ===========================================

class HealthConnectTypeScriptService {
  private isInitialized: boolean = false;
  private hasPermissions: boolean = false;

  /**
   * 1. Função para solicitar permissões necessárias ao usuário
   */
  async requestHealthPermissions(): Promise<PermissionResult> {
    try {
      console.log('🔐 [HealthConnect] Solicitando permissões...');

      // Verifica se é Android
      if (Platform.OS !== 'android') {
        return {
          success: false,
          granted: [],
          error: 'Health Connect está disponível apenas no Android 14+'
        };
      }

      // Inicializa Health Connect se necessário
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) {
          return {
            success: false,
            granted: [],
            error: `Falha na inicialização: ${initResult.error}`
          };
        }
      }

      // Define as permissões necessárias
      const permissions: HealthPermission[] = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'BloodPressure' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'BodyTemperature' },
      ];

      console.log('📋 [HealthConnect] Solicitando permissões:', permissions.map(p => p.recordType));

      // Solicita as permissões
      const grantedPermissions = await requestPermission(permissions);
      
      this.hasPermissions = grantedPermissions && grantedPermissions.length > 0;

      if (this.hasPermissions) {
        console.log(`✅ [HealthConnect] ${grantedPermissions.length} permissões concedidas`);
        return {
          success: true,
          granted: grantedPermissions.map(p => p.recordType)
        };
      } else {
        // Abre configurações automaticamente se não conseguiu permissões
        await this.openHealthConnectSettings();
        return {
          success: false,
          granted: [],
          error: 'Nenhuma permissão concedida. Configurações abertas - configure manualmente.'
        };
      }

    } catch (error: any) {
      console.error('❌ [HealthConnect] Erro ao solicitar permissões:', error);
      
      // Tenta abrir configurações como fallback
      try {
        await this.openHealthConnectSettings();
      } catch (settingsError) {
        console.log('⚠️ [HealthConnect] Erro ao abrir configurações:', settingsError);
      }

      return {
        success: false,
        granted: [],
        error: `Erro: ${error.message}. Configurações abertas para configuração manual.`
      };
    }
  }

  /**
   * 2. Função para buscar dados de saúde do Health Connect
   */
  async fetchHealthData(daysBack: number = 1): Promise<HealthDataResult> {
    try {
      console.log(`📊 [HealthConnect] Buscando dados dos últimos ${daysBack} dias...`);

      // Verifica inicialização
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) {
          return {
            success: false,
            error: initResult.error,
            needsPermissions: true
          };
        }
      }

      // Verifica permissões
      if (!this.hasPermissions) {
        return {
          success: false,
          error: 'Permissões não concedidas. Solicite permissões primeiro.',
          needsPermissions: true
        };
      }

      // Define intervalo de tempo
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };

      console.log('🕐 [HealthConnect] Buscando dados entre:', startDate.toLocaleDateString(), 'e', endDate.toLocaleDateString());

      // Busca dados em paralelo
      const [
        stepsData,
        caloriesData,
        heartRateData,
        distanceData,
        weightData,
        bloodPressureData,
        oxygenData,
        temperatureData
      ] = await Promise.allSettled([
        this.safeReadRecords('Steps', timeRangeFilter),
        this.safeReadRecords('ActiveCaloriesBurned', timeRangeFilter),
        this.safeReadRecords('HeartRate', timeRangeFilter),
        this.safeReadRecords('Distance', timeRangeFilter),
        this.safeReadRecords('Weight', timeRangeFilter),
        this.safeReadRecords('BloodPressure', timeRangeFilter),
        this.safeReadRecords('OxygenSaturation', timeRangeFilter),
        this.safeReadRecords('BodyTemperature', timeRangeFilter)
      ]);

      // Processa os resultados
      const steps = this.processStepsData(stepsData.status === 'fulfilled' ? stepsData.value : []);
      const calories = this.processCaloriesData(caloriesData.status === 'fulfilled' ? caloriesData.value : []);
      const heartRate = this.processHeartRateData(heartRateData.status === 'fulfilled' ? heartRateData.value : []);
      const distance = this.processDistanceData(distanceData.status === 'fulfilled' ? distanceData.value : []);
      const bloodPressure = this.processBloodPressureData(bloodPressureData.status === 'fulfilled' ? bloodPressureData.value : []);
      const bloodOxygen = this.processOxygenData(oxygenData.status === 'fulfilled' ? oxygenData.value : []);
      const bodyTemperature = this.processTemperatureData(temperatureData.status === 'fulfilled' ? temperatureData.value : []);

      // Coleta fontes de dados
      const sources = this.collectDataSources([
        ...(stepsData.status === 'fulfilled' ? stepsData.value : []),
        ...(caloriesData.status === 'fulfilled' ? caloriesData.value : []),
        ...(heartRateData.status === 'fulfilled' ? heartRateData.value : [])
      ]);

      const healthData: HealthData = {
        steps,
        calories,
        heartRate,
        distance,
        bloodPressure,
        bloodOxygen,
        bodyTemperature,
        lastUpdated: new Date().toISOString(),
        sources
      };

      console.log('✅ [HealthConnect] Dados processados:', {
        steps: steps || 'N/A',
        calories: calories || 'N/A',
        heartRate: heartRate || 'N/A',
        sources: sources.length
      });

      return {
        success: true,
        data: healthData
      };

    } catch (error: any) {
      console.error('❌ [HealthConnect] Erro ao buscar dados:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Abre as configurações do Health Connect
   */
  async openHealthConnectSettings(): Promise<void> {
    try {
      console.log('🔧 [HealthConnect] Abrindo configurações...');
      await openHealthConnectSettings();
    } catch (error: any) {
      console.error('❌ [HealthConnect] Erro ao abrir configurações:', error);
      throw error;
    }
  }

  // ===========================================
  // MÉTODOS PRIVADOS
  // ===========================================

  private async initializeHealthConnect(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 [HealthConnect] Inicializando...');

      // Verifica disponibilidade
      const status = await getSdkStatus();
      console.log('📱 [HealthConnect] Status do SDK:', status);

      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        let errorMessage = 'Health Connect não disponível';
        switch (status) {
          case SdkAvailabilityStatus.SDK_UNAVAILABLE:
            errorMessage = 'Health Connect não está instalado neste dispositivo';
            break;
          case SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
            errorMessage = 'Health Connect precisa ser atualizado via Google Play Store';
            break;
        }
        return { success: false, error: errorMessage };
      }

      // Inicializa
      const initialized = await initialize();
      if (!initialized) {
        return { success: false, error: 'Falha ao inicializar Health Connect' };
      }

      this.isInitialized = true;
      console.log('✅ [HealthConnect] Inicializado com sucesso');
      return { success: true };

    } catch (error: any) {
      console.error('❌ [HealthConnect] Erro na inicialização:', error);
      return { success: false, error: error.message };
    }
  }

  private async safeReadRecords(recordType: string, timeRangeFilter: any): Promise<any[]> {
    try {
      const records = await readRecords(recordType, { timeRangeFilter });
      console.log(`📊 [HealthConnect] ${recordType}: ${records.length} registros`);
      return records || [];
    } catch (error: any) {
      console.log(`⚠️ [HealthConnect] Erro ao ler ${recordType}:`, error.message);
      return [];
    }
  }

  private processStepsData(records: any[]): number | null {
    if (!records || records.length === 0) return null;
    const totalSteps = records.reduce((total, record) => total + (record.count || 0), 0);
    return totalSteps;
  }

  private processCaloriesData(records: any[]): number | null {
    if (!records || records.length === 0) return null;
    const totalCalories = records.reduce((total, record) => {
      return total + (record.energy?.inCalories || 0);
    }, 0);
    return Math.round(totalCalories);
  }

  private processHeartRateData(records: any[]): number | null {
    if (!records || records.length === 0) return null;
    // Pega a medição mais recente
    const sorted = records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return sorted[0].beatsPerMinute || null;
  }

  private processDistanceData(records: any[]): number | null {
    if (!records || records.length === 0) return null;
    const totalMeters = records.reduce((total, record) => {
      return total + (record.distance?.inMeters || 0);
    }, 0);
    return parseFloat((totalMeters / 1000).toFixed(2)); // Converte para km
  }

  private processBloodPressureData(records: any[]): { systolic: number; diastolic: number } | null {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    const latest = sorted[0];
    return {
      systolic: latest.systolic?.inMillimetersOfMercury || 0,
      diastolic: latest.diastolic?.inMillimetersOfMercury || 0
    };
  }

  private processOxygenData(records: any[]): number | null {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return sorted[0].percentage?.value || null;
  }

  private processTemperatureData(records: any[]): number | null {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return sorted[0].temperature?.inCelsius || null;
  }

  private collectDataSources(records: any[]): string[] {
    const sources = new Set<string>();
    records.forEach(record => {
      const packageName = record.metadata?.dataOrigin?.packageName;
      if (packageName) {
        const sourceName = this.getSourceName(packageName);
        sources.add(sourceName);
      }
    });
    return Array.from(sources);
  }

  private getSourceName(packageName: string): string {
    const sourceNames: { [key: string]: string } = {
      'com.sec.android.app.shealth': 'Samsung Health',
      'com.google.android.apps.fitness': 'Google Fit',
      'com.fitdays.fitdays': 'FitDays',
      'com.mi.health': 'Mi Health',
      'com.huawei.health': 'Huawei Health',
      'com.fitbit.FitbitMobile': 'Fitbit',
      'com.garmin.android.apps.connectmobile': 'Garmin Connect',
      'com.polar.polarflow': 'Polar Flow'
    };
    return sourceNames[packageName] || packageName || 'Health Connect';
  }
}

// Exporta instância singleton
export default new HealthConnectTypeScriptService(); 