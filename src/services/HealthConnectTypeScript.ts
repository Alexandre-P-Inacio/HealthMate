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
      // Ensure initialization
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }
      // Ensure permissions
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) {
          return { success: false, error: permResult.error };
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
      // Fetch weight records
      let data: any[] = await readRecords('Weight', { timeRangeFilter }) as unknown as any[];
      console.log('[getWeightData] readRecords returned:', data);
      data = Array.isArray(data) ? data : [];
      let latest = null;
      if (data.length > 0) {
        latest = data.reduce((a, b) => {
          const aTime = new Date(a.endTime || a.timestamp || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.timestamp || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data, latest };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getHeightData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) return { success: false, error: initResult.error };
      }
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) return { success: false, error: permResult.error };
      }
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      let data: any[] = await readRecords('Height', { timeRangeFilter }) as unknown as any[];
      data = Array.isArray(data) ? data : [];
      let latest = null;
      if (data.length > 0) {
        latest = data.reduce((a, b) => {
          const aTime = new Date(a.endTime || a.timestamp || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.timestamp || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data, latest };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getBodyFatData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) return { success: false, error: initResult.error };
      }
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) return { success: false, error: permResult.error };
      }
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      let data: any[] = await readRecords('BodyFat', { timeRangeFilter }) as unknown as any[];
      data = Array.isArray(data) ? data : [];
      let latest = null;
      if (data.length > 0) {
        latest = data.reduce((a, b) => {
          const aTime = new Date(a.endTime || a.timestamp || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.timestamp || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data, latest };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getBoneMassData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) return { success: false, error: initResult.error };
      }
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) return { success: false, error: permResult.error };
      }
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      let data: any[] = await readRecords('BoneMass', { timeRangeFilter }) as unknown as any[];
      data = Array.isArray(data) ? data : [];
      let latest = null;
      if (data.length > 0) {
        latest = data.reduce((a, b) => {
          const aTime = new Date(a.endTime || a.timestamp || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.timestamp || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data, latest };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getBasalMetabolicRateData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) return { success: false, error: initResult.error };
      }
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) return { success: false, error: permResult.error };
      }
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      let data: any[] = await readRecords('BasalMetabolicRate', { timeRangeFilter }) as unknown as any[];
      data = Array.isArray(data) ? data : [];
      let latest = null;
      if (data.length > 0) {
        latest = data.reduce((a, b) => {
          const aTime = new Date(a.endTime || a.timestamp || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.timestamp || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data, latest };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getLeanBodyMassData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) return { success: false, error: initResult.error };
      }
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) return { success: false, error: permResult.error };
      }
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      let data: any[] = await readRecords('LeanBodyMass', { timeRangeFilter }) as unknown as any[];
      data = Array.isArray(data) ? data : [];
      let latest = null;
      if (data.length > 0) {
        latest = data.reduce((a, b) => {
          const aTime = new Date(a.endTime || a.timestamp || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.timestamp || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data, latest };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  public async getBodyWaterMassData(daysBack: number = 7): Promise<{ success: boolean; data?: any[]; latest?: any; error?: string }> {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) return { success: false, error: initResult.error };
      }
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) return { success: false, error: permResult.error };
      }
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };
      let data: any[] = await readRecords('BodyWaterMass', { timeRangeFilter }) as unknown as any[];
      data = Array.isArray(data) ? data : [];
      let latest = null;
      if (data.length > 0) {
        latest = data.reduce((a, b) => {
          const aTime = new Date(a.endTime || a.timestamp || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.timestamp || b.startTime || 0).getTime();
          return bTime > aTime ? b : a;
        });
      }
      return { success: true, data, latest };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Exporta instância singleton
export default new HealthConnectTypeScriptService(); 