// Health Connect Service - Implementação Correta com Plugin Oficial Expo
// Plugin: expo-health-connect (configuração)
// Código: react-native-health-connect (runtime)

import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  getSdkStatus,
  readRecords,
  openHealthConnectSettings,
  SdkAvailabilityStatus
} from 'react-native-health-connect';

class HealthConnectService {
  constructor() {
    this.isInitialized = false;
    this.hasPermissions = false;
  }

  /**
   * Verifica se Health Connect está disponível
   */
  async checkAvailability() {
    try {
      if (Platform.OS !== 'android') {
        return {
          isAvailable: false,
          message: 'Health Connect está disponível apenas no Android'
        };
      }

      const status = await getSdkStatus();
      console.log('📊 Health Connect SDK Status:', status);

      switch (status) {
        case SdkAvailabilityStatus.SDK_AVAILABLE:
          return {
            isAvailable: true,
            status: status,
            message: 'Health Connect disponível'
          };
        case SdkAvailabilityStatus.SDK_UNAVAILABLE:
          return {
            isAvailable: false,
            status: status,
            message: 'Health Connect não está disponível neste dispositivo'
          };
        case SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
          return {
            isAvailable: false,
            status: status,
            message: 'Health Connect precisa ser atualizado via Google Play Store'
          };
        default:
          return {
            isAvailable: true,
            status: status,
            message: 'Health Connect instalado mas precisa de configuração'
          };
      }
    } catch (error) {
      console.error('❌ Erro ao verificar Health Connect:', error);
      return {
        isAvailable: false,
        message: `Erro: ${error.message}`
      };
    }
  }

  /**
   * Inicializa Health Connect corretamente
   */
  async initializeHealthConnect() {
    try {
      console.log('🔄 Inicializando Health Connect...');

      // Se já foi inicializado, retorna sucesso
      if (this.isInitialized) {
        return {
          success: true,
          message: 'Health Connect já inicializado',
          status: 'INITIALIZED'
        };
      }

      // Verifica disponibilidade primeiro
      const availability = await this.checkAvailability();
      if (!availability.isAvailable) {
        return {
          success: false,
          message: availability.message
        };
      }

      // Inicializa a biblioteca com retry
      let initialized = false;
      let attempts = 0;
      const maxAttempts = 3;

      while (!initialized && attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`🔄 Tentativa ${attempts} de inicialização...`);
          
          initialized = await initialize();
          
          if (initialized) {
            // Aguarda um momento para garantir que a inicialização foi completada
            await new Promise(resolve => setTimeout(resolve, 1000));
            break;
          } else {
            console.log(`⚠️ Tentativa ${attempts} falhou, tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.log(`⚠️ Erro na tentativa ${attempts}:`, error.message);
          if (attempts === maxAttempts) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!initialized) {
        throw new Error('Falha ao inicializar Health Connect após múltiplas tentativas');
      }

      this.isInitialized = true;
      console.log('✅ Health Connect inicializado com sucesso');

      return {
        success: true,
        message: 'Health Connect inicializado',
        status: availability.status
      };

    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      this.isInitialized = false;
      
      return {
        success: false,
        message: `Falha na inicialização: ${error.message}`
      };
    }
  }

  /**
   * Solicita permissões necessárias
   */
  async requestHealthPermissions() {
    try {
      // SEMPRE inicializa primeiro para evitar o erro lateinit
      const initResult = await this.initializeHealthConnect();
      if (!initResult.success) {
        return {
          success: false,
          message: initResult.message,
          needsSettings: true
        };
      }

      // Aguarda um momento para garantir que a inicialização foi completada
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('🔐 Solicitando permissões do Health Connect...');

      // Define as permissões necessárias - VERSÃO MELHORADA
      const permissions = [
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'BloodPressure' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'BodyTemperature' },
        { accessType: 'read', recordType: 'SleepSession' }
      ];

      // FORÇA a solicitação de permissões para que o app apareça na lista
      console.log('🎯 Forçando aparição do app na lista de permissões...');
      
      // Primeiro tenta solicitar UMA permissão para forçar a aparição na lista
      try {
        const basicPermission = [{ accessType: 'read', recordType: 'Weight' }];
        console.log('📝 Solicitando permissão básica primeiro...');
        await requestPermission(basicPermission);
      } catch (basicError) {
        console.log('⚠️ Erro na permissão básica (normal):', basicError.message);
      }

      // Aguarda um momento
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Agora solicita TODAS as permissões
      console.log('📋 Solicitando todas as permissões...');
      const grantedPermissions = await requestPermission(permissions);
      console.log('📋 Permissões concedidas:', grantedPermissions);

      this.hasPermissions = grantedPermissions && grantedPermissions.length > 0;

      if (this.hasPermissions) {
        return {
          success: true,
          message: `${grantedPermissions.length} permissões concedidas`,
          permissions: grantedPermissions
        };
      } else {
        // Se não conseguiu permissões, abre as configurações automaticamente
        console.log('🔧 Abrindo configurações do Health Connect...');
        await this.openSettings();
        
        return {
          success: false,
          message: 'Nenhuma permissão foi concedida. Configurações abertas - conceda as permissões manualmente.',
          needsSettings: true,
          settingsOpened: true
        };
      }

    } catch (error) {
      console.error('❌ Erro ao solicitar permissões:', error);
      
      // Se for o erro lateinit, retorna mensagem específica
      if (error.message.includes('lateinit') || error.message.includes('requestPermission')) {
        return {
          success: false,
          message: 'Erro de inicialização do Health Connect. Reinicie o app e tente novamente.',
          needsSettings: true
        };
      }
      
      // Para outros erros, abre as configurações
      try {
        console.log('🔧 Erro nas permissões - abrindo configurações...');
        await this.openSettings();
      } catch (settingsError) {
        console.log('⚠️ Erro ao abrir configurações:', settingsError.message);
      }
      
      return {
        success: false,
        message: error.message + ' - Configurações abertas para configuração manual.',
        needsSettings: true,
        settingsOpened: true
      };
    }
  }

  /**
   * Busca dados de peso de QUALQUER app no Health Connect
   */
  async getWeightData(daysBack = 7) {
    try {
      // SEMPRE inicializa primeiro para evitar erros
      const initResult = await this.initializeHealthConnect();
      if (!initResult.success) {
        return {
          success: false,
          error: initResult.message,
          needsPermissions: true
        };
      }

      // Aguarda para garantir inicialização completa
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verifica/solicita permissões
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) {
          return {
            success: false,
            error: permResult.message,
            needsPermissions: true
          };
        }
      }

      console.log('🔍 Buscando dados de PESO de todos os apps...');

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      // Busca dados de PESO de QUALQUER app
      const records = await readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
        // SEM filtro de dataOrigin - pega de TODOS os apps
      });

      if (records && records.length > 0) {
        const weightData = records.map(record => ({
          weight: record.weight.inKilograms,
          timestamp: record.time,
          source: this.getSourceName(record.metadata?.dataOrigin?.packageName || 'Unknown')
        }));

        // Ordena por data (mais recente primeiro)
        weightData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log(`✅ ${weightData.length} registros de PESO encontrados de vários apps`);

        return {
          success: true,
          data: weightData,
          latest: weightData[0],
          count: weightData.length,
          category: 'Peso'
        };
      } else {
        console.log('📊 Nenhum registro de PESO encontrado em nenhum app');
        return {
          success: true,
          data: [],
          message: 'Nenhum dado de peso encontrado em nenhum app conectado ao Health Connect',
          category: 'Peso'
        };
      }

    } catch (error) {
      console.error('❌ Erro ao buscar dados de PESO:', error);
      
      // Trata erros específicos
      if (error.message.includes('lateinit') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Erro de inicialização. Reinicie o app e tente novamente.',
          needsPermissions: true
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Busca dados de saúde por CATEGORIA de QUALQUER app
   */
  async getHealthDataByCategory(daysBack = 7) {
    try {
      // SEMPRE inicializa primeiro para evitar erros
      const initResult = await this.initializeHealthConnect();
      if (!initResult.success) {
        return {
          success: false,
          error: initResult.message,
          needsPermissions: true
        };
      }

      // Aguarda para garantir inicialização completa
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verifica/solicita permissões
      if (!this.hasPermissions) {
        const permResult = await this.requestHealthPermissions();
        if (!permResult.success) {
          return {
            success: false,
            error: permResult.message,
            needsPermissions: true
          };
        }
      }

      console.log('📱 Buscando dados de SAÚDE por categoria de todos os apps...');

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysBack);

      const timeRangeFilter = {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      };

      // Busca CADA CATEGORIA de dados de QUALQUER app
      const [
        heartRateRecords,
        stepsRecords, 
        caloriesRecords,
        distanceRecords,
        bloodPressureRecords,
        oxygenRecords,
        temperatureRecords,
        sleepRecords
      ] = await Promise.all([
        this.safeReadRecords('HeartRate', timeRangeFilter),
        this.safeReadRecords('Steps', timeRangeFilter),
        this.safeReadRecords('ActiveCaloriesBurned', timeRangeFilter),
        this.safeReadRecords('Distance', timeRangeFilter),
        this.safeReadRecords('BloodPressure', timeRangeFilter),
        this.safeReadRecords('OxygenSaturation', timeRangeFilter),
        this.safeReadRecords('BodyTemperature', timeRangeFilter),
        this.safeReadRecords('SleepSession', timeRangeFilter)
      ]);

      // Processa os dados por CATEGORIA
      const healthData = {
        heartRate: this.getLatestHeartRate(heartRateRecords),
        steps: this.getTotalSteps(stepsRecords),
        calories: this.getTotalCalories(caloriesRecords),
        distance: this.getTotalDistance(distanceRecords),
        bloodPressure: this.getLatestBloodPressure(bloodPressureRecords),
        bloodOxygen: this.getLatestOxygen(oxygenRecords),
        bodyTemperature: this.getLatestTemperature(temperatureRecords),
        sleepData: this.getLatestSleep(sleepRecords),
        timestamp: new Date().toISOString()
      };

      const availableCategories = Object.keys(healthData)
        .filter(key => key !== 'timestamp')
        .filter(key => healthData[key] !== null && healthData[key] !== undefined);

      console.log(`✅ Dados de saúde: ${availableCategories.length} CATEGORIAS disponíveis`);

      return {
        success: true,
        data: healthData,
        availableCategories: availableCategories,
        summary: this.createCategorySummary(healthData),
        categories: this.getCategoryDetails(healthData)
      };

    } catch (error) {
      console.error('❌ Erro ao buscar dados de saúde por categoria:', error);
      
      // Trata erros específicos
      if (error.message.includes('lateinit') || error.message.includes('permission')) {
        return {
          success: false,
          error: 'Erro de inicialização. Reinicie o app e tente novamente.',
          needsPermissions: true
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Lê registros de forma segura
   */
  async safeReadRecords(recordType, timeRangeFilter) {
    try {
      const records = await readRecords(recordType, { timeRangeFilter });
      console.log(`📊 ${recordType}: ${records.length} registros`);
      return records || [];
    } catch (error) {
      console.log(`⚠️ Erro ao ler ${recordType}: ${error.message}`);
      return [];
    }
  }

  /**
   * Processa frequência cardíaca
   */
  getLatestHeartRate(records) {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.time) - new Date(a.time));
    return sorted[0].beatsPerMinute;
  }

  /**
   * Processa passos
   */
  getTotalSteps(records) {
    if (!records || records.length === 0) return null;
    return records.reduce((total, record) => total + (record.count || 0), 0);
  }

  /**
   * Processa calorias
   */
  getTotalCalories(records) {
    if (!records || records.length === 0) return null;
    return records.reduce((total, record) => total + (record.energy?.inCalories || 0), 0);
  }

  /**
   * Processa distância
   */
  getTotalDistance(records) {
    if (!records || records.length === 0) return null;
    const totalMeters = records.reduce((total, record) => total + (record.distance?.inMeters || 0), 0);
    return (totalMeters / 1000).toFixed(2); // Converte para km
  }

  /**
   * Processa pressão arterial
   */
  getLatestBloodPressure(records) {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.time) - new Date(a.time));
    const latest = sorted[0];
    return {
      systolic: latest.systolic?.inMillimetersOfMercury,
      diastolic: latest.diastolic?.inMillimetersOfMercury,
      timestamp: latest.time
    };
  }

  /**
   * Processa oxigenação do sangue
   */
  getLatestOxygen(records) {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.time) - new Date(a.time));
    return sorted[0].percentage?.value;
  }

  /**
   * Processa temperatura corporal
   */
  getLatestTemperature(records) {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.time) - new Date(a.time));
    return sorted[0].temperature?.inCelsius;
  }

  /**
   * Processa dados de sono
   */
  getLatestSleep(records) {
    if (!records || records.length === 0) return null;
    const sorted = records.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    const latest = sorted[0];
    const duration = (new Date(latest.endTime) - new Date(latest.startTime)) / (1000 * 60 * 60); // horas
    return {
      duration: duration.toFixed(1),
      startTime: latest.startTime,
      endTime: latest.endTime
    };
  }

  /**
   * Cria resumo por categorias
   */
  createCategorySummary(healthData) {
    const summary = [];
    if (healthData.heartRate) summary.push(`❤️ Freq. Cardíaca: ${healthData.heartRate} bpm`);
    if (healthData.steps) summary.push(`🚶 Passos: ${healthData.steps.toLocaleString()}`);
    if (healthData.calories) summary.push(`🔥 Calorias: ${Math.round(healthData.calories)} kcal`);
    if (healthData.distance) summary.push(`📏 Distância: ${healthData.distance} km`);
    if (healthData.bloodPressure) summary.push(`🩸 Pressão: ${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic} mmHg`);
    if (healthData.bloodOxygen) summary.push(`💨 SpO2: ${healthData.bloodOxygen}%`);
    if (healthData.bodyTemperature) summary.push(`🌡️ Temperatura: ${healthData.bodyTemperature}°C`);
    if (healthData.sleepData) summary.push(`😴 Sono: ${healthData.sleepData.duration}h`);
    return summary.join('\n');
  }

  /**
   * Obtém detalhes das categorias
   */
  getCategoryDetails(healthData) {
    const categories = [];
    if (healthData.heartRate) categories.push({ name: 'Frequência Cardíaca', value: healthData.heartRate, unit: 'bpm', icon: '❤️' });
    if (healthData.steps) categories.push({ name: 'Passos', value: healthData.steps.toLocaleString(), unit: 'passos', icon: '🚶' });
    if (healthData.calories) categories.push({ name: 'Calorias', value: Math.round(healthData.calories), unit: 'kcal', icon: '🔥' });
    if (healthData.distance) categories.push({ name: 'Distância', value: healthData.distance, unit: 'km', icon: '📏' });
    if (healthData.bloodPressure) categories.push({ name: 'Pressão Arterial', value: `${healthData.bloodPressure.systolic}/${healthData.bloodPressure.diastolic}`, unit: 'mmHg', icon: '🩸' });
    if (healthData.bloodOxygen) categories.push({ name: 'Oxigenação', value: healthData.bloodOxygen, unit: '%', icon: '💨' });
    if (healthData.bodyTemperature) categories.push({ name: 'Temperatura', value: healthData.bodyTemperature, unit: '°C', icon: '🌡️' });
    if (healthData.sleepData) categories.push({ name: 'Sono', value: healthData.sleepData.duration, unit: 'horas', icon: '😴' });
    return categories;
  }

  /**
   * Mapeia nomes de apps
   */
  getSourceName(packageName) {
    const sourceNames = {
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

  /**
   * Abre configurações do Health Connect
   */
  async openSettings() {
    try {
      await openHealthConnectSettings();
      return true;
    } catch (error) {
      console.error('❌ Erro ao abrir configurações:', error);
      return false;
    }
  }
}

export default new HealthConnectService(); 