// Integrated Health Connect Service - Combina dados do Health Connect e Samsung Health
// MOSTRA DADOS REAIS DE AMBAS AS FONTES (APENAS TIPOS BÁSICOS)

import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  getSdkStatus,
  readRecords,
  openHealthConnectSettings,
  SdkAvailabilityStatus
} from 'react-native-health-connect';
import SamsungHealthService from './SamsungHealthService';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

class IntegratedHealthConnectService {
  constructor() {
    this.isInitialized = false;
    this.hasPermissions = false;
  }

  /**
   * Inicializa Health Connect
   */
  async initializeHealthConnect() {
    try {
      console.log('🔄 [INTEGRATED] Inicializando Health Connect...');

      if (Platform.OS !== 'android') {
        throw new Error('Health Connect apenas no Android');
      }

      const status = await getSdkStatus();
      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        throw new Error('Health Connect não disponível');
      }

      const initialized = await initialize();
      if (!initialized) {
        throw new Error('Falha na inicialização');
      }

      this.isInitialized = true;
      console.log('✅ [INTEGRATED] Health Connect inicializado');
      return { success: true };

    } catch (error) {
      console.error('❌ [INTEGRATED] Erro na inicialização:', error);
      this.isInitialized = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Solicita APENAS as permissões básicas que funcionam
   */
  async requestBasicPermissions() {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      console.log('🔐 [INTEGRATED] Solicitando permissões básicas...');

      // APENAS as permissões básicas e funcionais
      const permissions = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'Height' },
        { accessType: 'read', recordType: 'SleepSession' }
      ];

      const grantedPermissions = await requestPermission(permissions);
      this.hasPermissions = grantedPermissions && grantedPermissions.length > 0;

      console.log(`✅ [INTEGRATED] ${grantedPermissions?.length || 0}/${permissions.length} permissões concedidas`);
      return { 
        success: this.hasPermissions, 
        permissions: grantedPermissions,
        total: permissions.length,
        granted: grantedPermissions?.length || 0
      };

    } catch (error) {
      console.error('❌ [INTEGRATED] Erro nas permissões:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * LÊ APENAS OS DADOS BÁSICOS DO HEALTH CONNECT
   */
  async getBasicHealthConnectData(daysBack = 7) {
    try {
      console.log('📊 [INTEGRATED] ========== LENDO DADOS BÁSICOS DO HEALTH CONNECT ==========');

      // Verifica permissões
      if (!this.hasPermissions) {
        const permResult = await this.requestBasicPermissions();
        if (!permResult.success) {
          return { success: false, error: 'Sem permissões para Health Connect' };
        }
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const timeRangeFilter = {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };

      console.log(`📅 [INTEGRATED] Período: ${startDate.toLocaleString()} até ${endDate.toLocaleString()}`);
      console.log(`📅 [INTEGRATED] Buscando ${daysBack} dias de dados...`);

      // APENAS os tipos de dados básicos
      const dataTypes = [
        'Steps', 'Distance', 'ActiveCaloriesBurned', 'TotalCaloriesBurned',
        'HeartRate', 'Weight', 'Height', 'SleepSession'
      ];

      console.log(`🔍 [INTEGRATED] Tentando ler ${dataTypes.length} tipos de dados básicos...`);

      const healthConnectData = {};
      let totalRecordsFound = 0;
      let typesWithData = 0;

      // Lê cada tipo de dado em paralelo com tratamento de erro
      const promises = dataTypes.map(async (dataType) => {
        try {
          console.log(`🔄 [INTEGRATED] Lendo ${dataType}...`);
          const records = await readRecords(dataType, { timeRangeFilter });
          const count = records?.length || 0;
          
          if (count > 0) {
            console.log(`✅ [INTEGRATED] ${dataType}: ${count} registros encontrados`);
            healthConnectData[dataType] = {
              count: count,
              rawData: records,
              firstRecord: records[0],
              lastRecord: records[records.length - 1],
              dataType: dataType,
              source: 'Health Connect',
              timespan: {
                earliest: records[0]?.time || records[0]?.startTime || 'N/A',
                latest: records[records.length - 1]?.time || records[records.length - 1]?.endTime || 'N/A'
              }
            };
            totalRecordsFound += count;
            typesWithData++;
          } else {
            console.log(`❌ [INTEGRATED] ${dataType}: Nenhum registro encontrado`);
            healthConnectData[dataType] = {
              count: 0,
              rawData: [],
              message: 'Nenhum dado disponível para este tipo',
              source: 'Health Connect'
            };
          }
          
          return { dataType, count, success: true };
        } catch (error) {
          console.log(`⚠️ [INTEGRATED] Erro ao ler ${dataType}: ${error.message}`);
          healthConnectData[dataType] = {
            count: 0,
            rawData: [],
            error: error.message,
            source: 'Health Connect'
          };
          return { dataType, count: 0, success: false, error: error.message };
        }
      });

      const results = await Promise.all(promises);

      console.log('========================================');
      console.log('📊 [INTEGRATED] RESUMO DOS DADOS HEALTH CONNECT:');
      console.log('========================================');
      console.log(`🎯 TOTAL: ${totalRecordsFound} registros em ${typesWithData}/${dataTypes.length} tipos de dados`);
      console.log('');

      return {
        success: true,
        summary: {
          totalRecords: totalRecordsFound,
          typesWithData: typesWithData,
          totalTypesChecked: dataTypes.length,
          percentage: ((typesWithData / dataTypes.length) * 100).toFixed(1),
          periodDays: daysBack,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        healthConnectData: healthConnectData,
        categorizedSummary: this.createCategorizedSummary(healthConnectData)
      };

    } catch (error) {
      console.error('❌ [INTEGRATED] Erro geral:', error);
      return { 
        success: false, 
        error: error.message,
        healthConnectData: {},
        summary: { totalRecords: 0, typesWithData: 0 }
      };
    }
  }

  /**
   * Obtém dados do Samsung Health
   */
  async getSamsungHealthData(daysBack = 7) {
    try {
      console.log('📱 [INTEGRATED] Buscando dados do Samsung Health...');
      
      // Sincroniza dados do Samsung Health
      const syncResult = await SamsungHealthService.syncSamsungHealthData(daysBack);
      
      if (!syncResult.success) {
        console.log('⚠️ [INTEGRATED] Falha na sincronização do Samsung Health');
        return { success: false, data: [], error: syncResult.error };
      }

      // Busca dados salvos na tabela
      const dataResult = await SamsungHealthService.getSmartwatchData(daysBack);
      
      if (!dataResult.success) {
        console.log('⚠️ [INTEGRATED] Falha ao buscar dados do Samsung Health');
        return { success: false, data: [], error: dataResult.error };
      }

      console.log(`✅ [INTEGRATED] ${dataResult.data.length} registros do Samsung Health encontrados`);
      
      return {
        success: true,
        data: dataResult.data,
        summary: syncResult.summary
      };

    } catch (error) {
      console.error('❌ [INTEGRATED] Erro ao buscar dados do Samsung Health:', error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Obtém TODOS os dados combinados (versão simplificada)
   */
  async getAllIntegratedData(daysBack = 7) {
    try {
      console.log('🌟 [INTEGRATED] ========== OBTENDO TODOS OS DADOS INTEGRADOS BÁSICOS ==========');

      // Busca dados do Health Connect (apenas básicos)
      const healthConnectResult = await this.getBasicHealthConnectData(daysBack);
      
      // Busca dados do Samsung Health
      const samsungHealthResult = await this.getSamsungHealthData(daysBack);

      // Combina os resultados
      const combinedData = {
        healthConnect: healthConnectResult,
        samsungHealth: samsungHealthResult,
        summary: {
          healthConnectRecords: healthConnectResult.summary?.totalRecords || 0,
          samsungHealthRecords: samsungHealthResult.data?.length || 0,
          totalRecords: (healthConnectResult.summary?.totalRecords || 0) + (samsungHealthResult.data?.length || 0),
          periodDays: daysBack
        }
      };

      console.log('========================================');
      console.log('📊 [INTEGRATED] RESUMO FINAL INTEGRADO:');
      console.log('========================================');
      console.log(`🎯 Health Connect: ${combinedData.summary.healthConnectRecords} registros`);
      console.log(`🎯 Samsung Health: ${combinedData.summary.samsungHealthRecords} registros`);
      console.log(`🎯 TOTAL: ${combinedData.summary.totalRecords} registros`);
      console.log('');

      return {
        success: true,
        data: combinedData,
        recommendations: this.generateRecommendations(combinedData)
      };

    } catch (error) {
      console.error('❌ [INTEGRATED] Erro ao obter dados integrados:', error);
      return { 
        success: false, 
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Cria resumo categorizado dos dados básicos
   */
  createCategorizedSummary(healthConnectData) {
    const categories = {
      'Atividade Física': {
        types: ['Steps', 'Distance', 'ActiveCaloriesBurned', 'TotalCaloriesBurned'],
        icon: '🏃',
        data: {}
      },
      'Dados Vitais': {
        types: ['HeartRate'],
        icon: '❤️',
        data: {}
      },
      'Composição Corporal': {
        types: ['Weight', 'Height'],
        icon: '⚖️',
        data: {}
      },
      'Sono': {
        types: ['SleepSession'],
        icon: '😴',
        data: {}
      }
    };

    Object.entries(categories).forEach(([categoryName, category]) => {
      category.types.forEach(type => {
        if (healthConnectData[type] && healthConnectData[type].count > 0) {
          category.data[type] = healthConnectData[type];
        }
      });
    });

    return categories;
  }

  /**
   * Gera recomendações baseadas nos dados
   */
  generateRecommendations(combinedData) {
    const recommendations = [];
    
    const healthConnectRecords = combinedData.summary.healthConnectRecords;
    const samsungHealthRecords = combinedData.summary.samsungHealthRecords;
    
    if (healthConnectRecords === 0 && samsungHealthRecords === 0) {
      recommendations.push({
        type: 'no_data',
        title: 'Nenhum dado encontrado',
        message: 'Conecte dispositivos de saúde ou apps para começar a coletar dados',
        priority: 'high'
      });
    } else if (healthConnectRecords > 0 && samsungHealthRecords === 0) {
      recommendations.push({
        type: 'samsung_health',
        title: 'Conecte Samsung Health',
        message: 'Sincronize com Samsung Health para dados mais completos',
        priority: 'medium'
      });
    } else if (healthConnectRecords === 0 && samsungHealthRecords > 0) {
      recommendations.push({
        type: 'health_connect',
        title: 'Configure Health Connect',
        message: 'Ative permissões no Health Connect para mais dados',
        priority: 'medium'
      });
    } else {
      recommendations.push({
        type: 'success',
        title: 'Dados sincronizados com sucesso',
        message: `${combinedData.summary.totalRecords} registros encontrados`,
        priority: 'low'
      });
    }

    return recommendations;
  }

  /**
   * Abre configurações do Health Connect
   */
  async openHealthConnectSettings() {
    try {
      await openHealthConnectSettings();
      return { success: true };
    } catch (error) {
      console.error('❌ [INTEGRATED] Erro ao abrir configurações:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Alias for getAllIntegratedData (for backward compatibility)
   */
  async getAllHealthConnectData(daysBack = 7) {
    console.log('🔗 [INTEGRATED] Usando alias getAllHealthConnectData -> getAllIntegratedData');
    return await this.getAllIntegratedData(daysBack);
  }
}

export default new IntegratedHealthConnectService(); 