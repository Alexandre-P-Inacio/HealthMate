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
  Permission,
  ReadRecordsResult
} from 'react-native-health-connect';

// ===========================================
// INTERFACES E TIPOS
// ===========================================

export interface HealthPermission {
  accessType: 'read' | 'write';
  recordType: string;
}

export interface HealthData {
  steps: number | null;
  calories: number | null;
  heartRate: number | null;
  weight?: number | null;
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
// CLASSE PRINCIPAL
// ===========================================

class HealthConnectTypeScriptService {
  private isInitialized: boolean = false;
  private hasPermissions: boolean = false;

  /**
   * 1. Função para solicitar permissões do Health Connect
   */
  async requestHealthPermissions(): Promise<PermissionResult> {
    try {
      console.log('🔐 [HealthConnect] Solicitando permissões...');

      // Verifica inicialização
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) {
          return {
            success: false,
            granted: [],
            error: initResult.error
          };
        }
      }

      // Define as permissões necessárias
      const permissions: Permission[] = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'Height' },
        { accessType: 'read', recordType: 'BodyFat' },
        { accessType: 'read', recordType: 'BoneMass' },
        { accessType: 'read', recordType: 'BasalMetabolicRate' },
        { accessType: 'read', recordType: 'LeanBodyMass' },
        { accessType: 'read', recordType: 'BodyWaterMass' }
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
        weightData
      ] = await Promise.allSettled([
        this.safeReadRecords('Steps', timeRangeFilter),
        this.safeReadRecords('ActiveCaloriesBurned', timeRangeFilter),
        this.safeReadRecords('HeartRate', timeRangeFilter),
        this.safeReadRecords('Weight', timeRangeFilter)
      ]);

      // Processa os resultados
      const steps = this.processStepsData(stepsData.status === 'fulfilled' ? stepsData.value : []);
      const calories = this.processCaloriesData(caloriesData.status === 'fulfilled' ? caloriesData.value : []);
      const heartRate = this.processHeartRateData(heartRateData.status === 'fulfilled' ? heartRateData.value : []);
      const weight = this.processWeightData(weightData.status === 'fulfilled' ? weightData.value : []);

      // Coleta fontes de dados
      const allRecords: any[] = [];
      if (stepsData.status === 'fulfilled') allRecords.push(...stepsData.value);
      if (caloriesData.status === 'fulfilled') allRecords.push(...caloriesData.value);
      if (heartRateData.status === 'fulfilled') allRecords.push(...heartRateData.value);
      if (weightData.status === 'fulfilled') allRecords.push(...weightData.value);
      
      const sources = this.collectDataSources(allRecords);

      const healthData: HealthData = {
        steps,
        calories,
        heartRate,
        weight,
        lastUpdated: new Date().toISOString(),
        sources
      };

      console.log('✅ [HealthConnect] Dados processados:', {
        steps: steps || 'N/A',
        calories: calories || 'N/A',
        heartRate: heartRate || 'N/A',
        weight: weight || 'N/A',
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
      const records = await readRecords(recordType as any, { timeRangeFilter });
      console.log(`📊 [HealthConnect] ${recordType}: ${Array.isArray(records) ? records.length : 0} registros`);
      return Array.isArray(records) ? records : [];
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

  private processWeightData(records: any[]): number | null {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return sorted[0].weight?.inKilograms || null;
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

  public async getWeightData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      console.log('[getWeightData] FORCING direct read...');
      
      // FORCE initialization without permission check
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) {
          console.log('[getWeightData] Init failed, but continuing...');
        } else {
          console.log('[getWeightData] Init successful');
        }
      }
      
      // Date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      
      console.log('[getWeightData] Calling readRecords directly...');
      
      // DIRECT call to readRecords - bypass all permission checks
      const result: any = await readRecords('Weight', { timeRangeFilter });
      console.log('[getWeightData] RAW readRecords result:', JSON.stringify(result, null, 2));
      
      // Extract records array
      const records = result?.records || [];
      console.log('[getWeightData] extracted records:', records.length, 'items');
      
      if (records.length > 0) {
        console.log('[getWeightData] First record structure:', JSON.stringify(records[0], null, 2));
      }
      
      let latest = null;
      if (records.length > 0) {
        latest = records.reduce((a: any, b: any) => {
          const aTime = new Date(a.time || a.endTime || a.startTime || 0).getTime();
          const bTime = new Date(b.time || b.endTime || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
        console.log('[getWeightData] latest record:', JSON.stringify(latest, null, 2));
      }
      
      return { success: true, data: records, latest };
    } catch (error: any) {
      console.error('[getWeightData] error:', error);
      return { success: false, error: error.message };
    }
  }



  public async getBodyFatData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      console.log('[getBodyFatData] FORCING direct read...');
      
      if (!this.isInitialized) {
        await this.initializeHealthConnect();
      }
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      
      const result: any = await readRecords('BodyFat', { timeRangeFilter });
      console.log('[getBodyFatData] RAW result:', JSON.stringify(result, null, 2));
      
      const records = result?.records || [];
      let latest = null;
      if (records.length > 0) {
        latest = records.reduce((a: any, b: any) => {
          const aTime = new Date(a.time || a.endTime || a.startTime || 0).getTime();
          const bTime = new Date(b.time || b.endTime || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data: records, latest };
    } catch (error: any) {
      console.error('[getBodyFatData] error:', error);
      return { success: false, error: error.message };
    }
  }

  public async getBoneMassData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      console.log('[getBoneMassData] FORCING direct read...');
      
      if (!this.isInitialized) {
        await this.initializeHealthConnect();
      }
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      
      const result: any = await readRecords('BoneMass', { timeRangeFilter });
      console.log('[getBoneMassData] RAW result:', JSON.stringify(result, null, 2));
      
      const records = result?.records || [];
      let latest = null;
      if (records.length > 0) {
        latest = records.reduce((a: any, b: any) => {
          const aTime = new Date(a.time || a.endTime || a.startTime || 0).getTime();
          const bTime = new Date(b.time || b.endTime || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data: records, latest };
    } catch (error: any) {
      console.error('[getBoneMassData] error:', error);
      return { success: false, error: error.message };
    }
  }

  public async getBasalMetabolicRateData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      console.log('[getBasalMetabolicRateData] FORCING direct read...');
      
      if (!this.isInitialized) {
        await this.initializeHealthConnect();
      }
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      
      const result: any = await readRecords('BasalMetabolicRate', { timeRangeFilter });
      console.log('[getBasalMetabolicRateData] RAW result:', JSON.stringify(result, null, 2));
      
      const records = result?.records || [];
      let latest = null;
      if (records.length > 0) {
        latest = records.reduce((a: any, b: any) => {
          const aTime = new Date(a.time || a.endTime || a.startTime || 0).getTime();
          const bTime = new Date(b.time || b.endTime || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data: records, latest };
    } catch (error: any) {
      console.error('[getBasalMetabolicRateData] error:', error);
      return { success: false, error: error.message };
    }
  }

  public async getLeanBodyMassData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      console.log('[getLeanBodyMassData] FORCING direct read...');
      
      if (!this.isInitialized) {
        await this.initializeHealthConnect();
      }
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      
      const result: any = await readRecords('LeanBodyMass', { timeRangeFilter });
      console.log('[getLeanBodyMassData] RAW result:', JSON.stringify(result, null, 2));
      
      const records = result?.records || [];
      let latest = null;
      if (records.length > 0) {
        latest = records.reduce((a: any, b: any) => {
          const aTime = new Date(a.time || a.endTime || a.startTime || 0).getTime();
          const bTime = new Date(b.time || b.endTime || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data: records, latest };
    } catch (error: any) {
      console.error('[getLeanBodyMassData] error:', error);
      return { success: false, error: error.message };
    }
  }

  public async getBodyWaterMassData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      console.log('[getBodyWaterMassData] FORCING direct read...');
      
      if (!this.isInitialized) {
        await this.initializeHealthConnect();
      }
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      
      const result: any = await readRecords('BodyWaterMass', { timeRangeFilter });
      console.log('[getBodyWaterMassData] RAW result:', JSON.stringify(result, null, 2));
      
      const records = result?.records || [];
      let latest = null;
      if (records.length > 0) {
        latest = records.reduce((a: any, b: any) => {
          const aTime = new Date(a.time || a.endTime || a.startTime || 0).getTime();
          const bTime = new Date(b.time || b.endTime || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data: records, latest };
    } catch (error: any) {
      console.error('[getBodyWaterMassData] error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Exporta instância singleton
export default new HealthConnectTypeScriptService(); 