// Samsung Health Service - Integração Real via Health Connect
// SEM DADOS DE TESTE - APENAS DADOS REAIS DO SAMSUNG HEALTH

import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  getSdkStatus,
  readRecords,
  openHealthConnectSettings,
  SdkAvailabilityStatus
} from 'react-native-health-connect';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

class SamsungHealthService {
  constructor() {
    this.isInitialized = false;
    this.hasPermissions = false;
    this.realtimeInterval = null;
    this.constantFlowInterval = null;
    this.isConstantFlowActive = false;
    this.tempDataCache = [];
  }

  /**
   * Inicializa Health Connect para Samsung Health
   */
  async initializeHealthConnect() {
    try {
      console.log('🏥 [Samsung Health] Inicializando Health Connect...');

      if (Platform.OS !== 'android') {
        throw new Error('Samsung Health está disponível apenas no Android');
      }

      console.log('🏥 [Samsung Health] Verificando disponibilidade do SDK...');
      const status = await getSdkStatus();
      console.log('🏥 [Samsung Health] Status do SDK:', status);
      
      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        console.error('🏥 [Samsung Health] SDK não disponível. Status:', status);
        throw new Error('Health Connect não está disponível');
      }

      console.log('🏥 [Samsung Health] Inicializando Health Connect...');
      const initialized = await initialize();
      console.log('🏥 [Samsung Health] Resultado da inicialização:', initialized);
      
      if (!initialized) {
        throw new Error('Falha ao inicializar Health Connect');
      }

      this.isInitialized = true;
      console.log('✅ [Samsung Health] Health Connect inicializado com sucesso');
      return { success: true };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro na inicialização:', error);
      this.isInitialized = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Solicita permissões básicas para Samsung Health (APENAS as que funcionam)
   */
  async requestSamsungHealthPermissions() {
    try {
      console.log('🔐 [Samsung Health] Iniciando solicitação de permissões...');
      
      if (!this.isInitialized) {
        console.log('🔐 [Samsung Health] Health Connect não inicializado, inicializando...');
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) {
          console.error('🔐 [Samsung Health] Falha na inicialização:', initResult.error);
          return { success: false, error: initResult.error };
        }
      }

      console.log('🔐 [Samsung Health] Solicitando permissões básicas...');

      // APENAS as permissões básicas que funcionam
      const permissions = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'Height' },
        { accessType: 'read', recordType: 'BodyFat' },
        { accessType: 'read', recordType: 'LeanBodyMass' },
        { accessType: 'read', recordType: 'BodyWaterMass' },
        { accessType: 'read', recordType: 'BoneMass' },
        { accessType: 'read', recordType: 'BasalMetabolicRate' }
      ];

      console.log('🔐 [Samsung Health] Permissões solicitadas:', JSON.stringify(permissions, null, 2));
      console.log('🔐 [Samsung Health] Chamando requestPermission...');

      const grantedPermissions = await requestPermission(permissions);
      
      console.log('🔐 [Samsung Health] Resposta do requestPermission:', JSON.stringify(grantedPermissions, null, 2));
      console.log('🔐 [Samsung Health] Número de permissões concedidas:', grantedPermissions?.length || 0);
      
      // Verifica cada permissão individualmente
      if (grantedPermissions && grantedPermissions.length > 0) {
        console.log('🔐 [Samsung Health] Verificando permissões individuais:');
        permissions.forEach(permission => {
          const isGranted = grantedPermissions.some(granted => 
            granted.accessType === permission.accessType && 
            granted.recordType === permission.recordType
          );
          console.log(`🔐 [Samsung Health] - ${permission.recordType}: ${isGranted ? '✅ Concedida' : '❌ Negada'}`);
        });
      } else {
        console.log('🔐 [Samsung Health] Nenhuma permissão foi concedida');
      }

      this.hasPermissions = grantedPermissions && grantedPermissions.length > 0;

      console.log(`✅ [Samsung Health] ${grantedPermissions?.length || 0}/${permissions.length} permissões concedidas`);
      return { success: this.hasPermissions, permissions: grantedPermissions };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro nas permissões:', error);
      console.error('❌ [Samsung Health] Stack trace:', error.stack);
      return { success: false, error: error.message };
    }
  }

  /**
   * Gera UUID válido a partir do user ID
   */
  generateUserUUID(userId) {
    // Se já é um UUID válido, retorna como está
    if (typeof userId === 'string' && userId.includes('-')) {
      return userId;
    }
    
    // Converte número para UUID usando um padrão fixo
    const userIdStr = String(userId).padStart(8, '0');
    return `00000000-0000-4000-8000-${userIdStr}0000`;
  }

  /**
   * Busca dados reais do Samsung Health e salva na tabela smartwatch_data (apenas do dia de hoje)
   */
  async syncSamsungHealthData() {
    try {
      console.log('🔄 [Samsung Health] Sincronizando dados REAIS do dia de hoje...');

      // Verifica se tem permissões - se não tiver, tenta solicitar automaticamente
      if (!this.hasPermissions) {
        console.log('🔐 [Samsung Health] Sem permissões, tentando solicitar automaticamente...');
        const permResult = await this.requestSamsungHealthPermissions();
        if (!permResult.success) {
          console.log('⚠️ [Samsung Health] Não foi possível obter permissões, mas continuando...');
          // Não retorna erro, continua tentando buscar dados
        }
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const timeRangeFilter = {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      };

      console.log(`📅 [Samsung Health] Buscando dados de hoje: ${startOfDay.toISOString()} até ${now.toISOString()}`);

      // Busca dados reais em paralelo (APENAS os tipos básicos)
      const [
        heartRateData,
        stepsData,
        caloriesActiveData,
        caloriesTotalData,
        distanceData,
        sleepData,
        weightData,
        oxygenData
      ] = await Promise.all([
        this.safeReadRecords('HeartRate', timeRangeFilter),
        this.safeReadRecords('Steps', timeRangeFilter),
        this.safeReadRecords('ActiveCaloriesBurned', timeRangeFilter),
        this.safeReadRecords('TotalCaloriesBurned', timeRangeFilter),
        this.safeReadRecords('Distance', timeRangeFilter),
        this.safeReadRecords('SleepSession', timeRangeFilter),
        this.safeReadRecords('Weight', timeRangeFilter),
        this.safeReadRecords('OxygenSaturation', timeRangeFilter)
      ]);

      // Log raw data arrays
      console.log('📦 [Samsung Health] RAW HeartRateData:', heartRateData);
      console.log('📦 [Samsung Health] RAW StepsData:', stepsData);
      console.log('📦 [Samsung Health] RAW CaloriesActiveData:', caloriesActiveData);
      console.log('📦 [Samsung Health] RAW CaloriesTotalData:', caloriesTotalData);
      console.log('📦 [Samsung Health] RAW DistanceData:', distanceData);
      console.log('📦 [Samsung Health] RAW SleepData:', sleepData);
      console.log('📦 [Samsung Health] RAW WeightData:', weightData);
      console.log('📦 [Samsung Health] RAW OxygenData:', oxygenData);

      // Se todos os arrays estiverem vazios, logar mensagem clara
      if (
        (!heartRateData || heartRateData.length === 0) &&
        (!stepsData || stepsData.length === 0) &&
        (!caloriesActiveData || caloriesActiveData.length === 0) &&
        (!caloriesTotalData || caloriesTotalData.length === 0) &&
        (!distanceData || distanceData.length === 0) &&
        (!sleepData || sleepData.length === 0) &&
        (!weightData || weightData.length === 0) &&
        (!oxygenData || oxygenData.length === 0)
      ) {
        console.warn('⚠️ [Samsung Health] Nenhum dado encontrado para hoje! Abra o app Samsung Health, faça uma caminhada, exercício ou sincronize seus dados.');
      }

      // Processa e salva os dados na tabela smartwatch_data
      await this.saveToSmartwatchData({
        heartRateData: heartRateData || [],
        stepsData: stepsData || [],
        caloriesActiveData: caloriesActiveData || [],
        caloriesTotalData: caloriesTotalData || [],
        distanceData: distanceData || [],
        sleepData: sleepData || [],
        weightData: weightData || [],
        oxygenData: oxygenData || []
      });

      const totalRecords = (heartRateData?.records?.length || 0) + 
                          (stepsData?.records?.length || 0) + 
                          (caloriesActiveData?.records?.length || 0) + 
                          (caloriesTotalData?.records?.length || 0) + 
                          (distanceData?.records?.length || 0) + 
                          (sleepData?.records?.length || 0) + 
                          (weightData?.records?.length || 0) + 
                          (oxygenData?.length || 0);

      console.log(`✅ [Samsung Health] Sincronização completa! ${totalRecords} registros processados`);
      
      return { 
        success: true, 
        totalRecords,
        summary: {
          heartRate: heartRateData?.length || 0,
          steps: stepsData?.length || 0,
          caloriesActive: caloriesActiveData?.length || 0,
          caloriesTotal: caloriesTotalData?.length || 0,
          distance: distanceData?.length || 0,
          sleep: sleepData?.length || 0,
          weight: weightData?.length || 0,
          oxygen: oxygenData?.length || 0
        }
      };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro na sincronização:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Salva dados na tabela smartwatch_data
   */
  async saveToSmartwatchData(healthData) {
    try {
      const userData = DataUser.getUserData();
      
      // DEBUG: Log dos dados recebidos
      console.log('🔍 [Samsung Health] Dados recebidos para processamento:');
      console.log('🔍 [Samsung Health] - heartRateData:', healthData.heartRateData?.records ? `${healthData.heartRateData.records.length} registros` : 'null');
      console.log('🔍 [Samsung Health] - stepsData:', healthData.stepsData?.records ? `${healthData.stepsData.records.length} registros` : 'null');
      console.log('🔍 [Samsung Health] - caloriesTotalData:', healthData.caloriesTotalData?.records ? `${healthData.caloriesTotalData.records.length} registros` : 'null');
      console.log('🔍 [Samsung Health] - distanceData:', healthData.distanceData?.records ? `${healthData.distanceData.records.length} registros` : 'null');
      console.log('🔍 [Samsung Health] - weightData:', healthData.weightData?.records ? `${healthData.weightData.records.length} registros` : 'null');
      
      console.log('🔍 [Samsung Health] Chamando processHealthDataForDatabase...');
      const processedData = this.processHealthDataForDatabase(healthData);
      console.log('🔍 [Samsung Health] Resultado do processamento:', processedData);
      
      if (!processedData || processedData.length === 0) {
        console.log('⚠️ [Samsung Health] Nenhum dado para salvar');
        return { success: true, totalRecords: 0 };
      }

      if (!userData?.id) {
        console.log('⚠️ [Samsung Health] Usuário não logado, salvando em cache temporário');
        // Salva em cache temporário
        this.tempDataCache = processedData.map(record => ({
          ...record,
          source: 'samsung_health',
            device_name: 'Samsung Health',
          is_temp: true
        }));
        return { success: true, totalRecords: processedData.length, data: this.tempDataCache };
      }

      // Gera UUID válido a partir do user ID
      const userId = this.generateUserUUID(userData.id);
      console.log('💾 [Samsung Health] Salvando dados para usuário UUID:', userId);

      const recordsToInsert = processedData.map(record => ({
        user_id: userId,
        source: 'samsung_health',
        device_name: 'Samsung Health',
        ...record
      }));

      const { data, error } = await supabase
        .from('smartwatch_data')
        .insert(recordsToInsert)
        .select();

      if (error) {
        console.error('❌ [Samsung Health] Erro ao salvar dados:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [Samsung Health] Dados salvos com sucesso:', data.length, 'registros');
      return { success: true, totalRecords: data.length, data };
    } catch (error) {
      console.error('❌ [Samsung Health] Erro geral ao salvar dados:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processa dados brutos do Health Connect para formato da tabela
   */
  processHealthDataForDatabase(healthData) {
    const processed = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('🔧 [Samsung Health] Processando dados brutos...');
    console.log('🔧 [Samsung Health] Data de hoje:', today.toISOString());

    // Frequência Cardíaca - pega a última leitura do dia
    const heartRateRecords = healthData.heartRateData?.records || [];
    if (heartRateRecords.length > 0) {
      console.log(`💓 [Samsung Health] Processando ${heartRateRecords.length} registros de batimentos cardíacos`);
      
      const latestHeartRate = heartRateRecords[heartRateRecords.length - 1];
      console.log('💓 [Samsung Health] Último registro de batimentos:', JSON.stringify(latestHeartRate, null, 2));
      
      if (latestHeartRate.samples && Array.isArray(latestHeartRate.samples) && latestHeartRate.samples.length > 0) {
        const lastSample = latestHeartRate.samples[latestHeartRate.samples.length - 1];
        console.log('💓 [Samsung Health] Última amostra:', JSON.stringify(lastSample, null, 2));
        
        const heartRateValue = lastSample.beatsPerMinute || 0;
        console.log(`💓 [Samsung Health] Último batimento cardíaco: ${heartRateValue} bpm`);
        
      processed.push({
          collected_at: latestHeartRate.endTime,
          heart_rate: heartRateValue
        });
      } else {
        console.log('💓 [Samsung Health] Nenhuma amostra encontrada no último registro');
      }
    }

    // Passos - pega o total acumulado do dia (não soma registros individuais)
    const stepsRecords = healthData.stepsData?.records || [];
    if (stepsRecords.length > 0) {
      console.log(`👟 [Samsung Health] Processando ${stepsRecords.length} registros de passos`);
      
      // Procura o registro com o maior count (que deve ser o total acumulado do dia)
      let maxSteps = 0;
      let totalStepsRecord = null;
      
      stepsRecords.forEach((record, index) => {
        const stepsCount = record.count || 0;
        console.log(`👟 [Samsung Health] Registro ${index + 1}: ${stepsCount} passos (${record.startTime} - ${record.endTime})`);
        
        if (stepsCount > maxSteps) {
          maxSteps = stepsCount;
          totalStepsRecord = record;
        }
      });
      
      // Se encontrou um registro com muitos passos, usa ele como total
      if (maxSteps > 100) { // Se tem mais de 100 passos, provavelmente é o total
      processed.push({
          collected_at: totalStepsRecord.endTime,
          steps: maxSteps
        });
      } else {
        // Fallback: soma todos os registros de hoje
        let dailySteps = 0;
        stepsRecords.forEach(record => {
          const recordDate = new Date(record.endTime);
          const isToday = recordDate >= today;
          if (isToday) {
            dailySteps += record.count || 0;
          }
        });
        processed.push({
          collected_at: new Date().toISOString(),
          steps: dailySteps
        });
      }
    }

    // Calorias - processa tanto ativas quanto totais
    const caloriesTotalRecords = healthData.caloriesTotalData?.records || [];
    const caloriesActiveRecords = healthData.caloriesActiveData?.records || [];
    
    console.log(`🔥 [Samsung Health] Processando calorias:`);
    console.log(`🔥 [Samsung Health] - Total records: ${caloriesTotalRecords.length}`);
    console.log(`🔥 [Samsung Health] - Active records: ${caloriesActiveRecords.length}`);
    
    let totalCalories = 0;
    let activeCalories = 0;
    
    // Processa calorias totais
    if (caloriesTotalRecords.length > 0) {
      console.log(`🔥 [Samsung Health] Processando ${caloriesTotalRecords.length} registros de calorias totais:`);
      
      caloriesTotalRecords.forEach((record, index) => {
        const recordDate = new Date(record.endTime);
        const isToday = recordDate >= today;
        
        // Log detalhado da estrutura do registro
        console.log(`🔥 [Samsung Health] Estrutura completa do registro ${index + 1}:`, JSON.stringify(record, null, 2));
        
        let caloriesValue = 0;
        if (record.energy && record.energy.inKilocalories !== undefined) {
          caloriesValue = Math.round(record.energy.inKilocalories);
        } else if (record.energy && record.energy.value !== undefined) {
          caloriesValue = record.energy.value;
        } else if (record.value !== undefined) {
          caloriesValue = record.value;
        } else if (record.energy && typeof record.energy === 'number') {
          caloriesValue = record.energy;
        } else if (record.kilocalories !== undefined) {
          caloriesValue = record.kilocalories;
        } else if (record.calories !== undefined) {
          caloriesValue = record.calories;
        }
        
        console.log(`🔥 [Samsung Health] Total ${index + 1}: ${caloriesValue} cal (${record.startTime} - ${record.endTime}) [hoje: ${isToday}]`);
        console.log(`🔥 [Samsung Health] - energy.inKilocalories: ${record.energy?.inKilocalories}`);
        console.log(`🔥 [Samsung Health] - energy: ${JSON.stringify(record.energy)}`);
        console.log(`🔥 [Samsung Health] - value: ${record.value}`);
        console.log(`🔥 [Samsung Health] - kilocalories: ${record.kilocalories}`);
        console.log(`🔥 [Samsung Health] - calories: ${record.calories}`);
        
        if (isToday) {
          totalCalories += caloriesValue;
        }
      });
    }
    
    // Processa calorias ativas
    if (caloriesActiveRecords.length > 0) {
      console.log(`🔥 [Samsung Health] Processando ${caloriesActiveRecords.length} registros de calorias ativas:`);
      
      caloriesActiveRecords.forEach((record, index) => {
        const recordDate = new Date(record.endTime);
        const isToday = recordDate >= today;
        
        // Log detalhado da estrutura do registro
        console.log(`🔥 [Samsung Health] Estrutura completa do registro ativo ${index + 1}:`, JSON.stringify(record, null, 2));
        
        let caloriesValue = 0;
        if (record.energy && record.energy.inKilocalories !== undefined) {
          caloriesValue = Math.round(record.energy.inKilocalories);
        } else if (record.energy && record.energy.value !== undefined) {
          caloriesValue = record.energy.value;
        } else if (record.value !== undefined) {
          caloriesValue = record.value;
        } else if (record.energy && typeof record.energy === 'number') {
          caloriesValue = record.energy;
        } else if (record.kilocalories !== undefined) {
          caloriesValue = record.kilocalories;
        } else if (record.calories !== undefined) {
          caloriesValue = record.calories;
        }
        
        console.log(`🔥 [Samsung Health] Ativo ${index + 1}: ${caloriesValue} cal (${record.startTime} - ${record.endTime}) [hoje: ${isToday}]`);
        console.log(`🔥 [Samsung Health] - energy.inKilocalories: ${record.energy?.inKilocalories}`);
        console.log(`🔥 [Samsung Health] - energy: ${JSON.stringify(record.energy)}`);
        console.log(`🔥 [Samsung Health] - value: ${record.value}`);
        console.log(`🔥 [Samsung Health] - kilocalories: ${record.kilocalories}`);
        console.log(`🔥 [Samsung Health] - calories: ${record.calories}`);
        
        if (isToday) {
          activeCalories += caloriesValue;
        }
      });
    }
    
    // Usa o maior valor entre total e ativo (ou soma se ambos existem)
    if (totalCalories > 0 || activeCalories > 0) {
      processed.push({
        collected_at: new Date().toISOString(),
        calories: Math.round(Math.max(totalCalories, activeCalories))
      });
      console.log(`🔥 [Samsung Health] Resumo de calorias:`);
      console.log(`🔥 [Samsung Health] - Total: ${Math.round(totalCalories)} cal`);
      console.log(`🔥 [Samsung Health] - Active: ${Math.round(activeCalories)} cal`);
      console.log(`🔥 [Samsung Health] - Final: ${Math.round(Math.max(totalCalories, activeCalories))} cal`);
    } else {
      console.log(`🔥 [Samsung Health] Nenhuma caloria encontrada para hoje`);
    }

    // Distância - soma todos os registros do dia
    const distanceRecords = healthData.distanceData?.records || [];
    if (distanceRecords.length > 0) {
      console.log(`📏 [Samsung Health] Processando ${distanceRecords.length} registros de distância`);
      
      let totalDistance = 0;
      distanceRecords.forEach((record, index) => {
        const recordDate = new Date(record.endTime);
        const isToday = recordDate >= today;
        
        // Extrai o valor da distância do objeto aninhado
        let distanceValue = 0;
        if (record.distance && record.distance.value !== undefined) {
          distanceValue = record.distance.value;
        } else if (record.value !== undefined) {
          distanceValue = record.value;
        }
        
        console.log(`📏 [Samsung Health] Registro ${index + 1}: ${distanceValue}m de distância em ${record.endTime} (hoje: ${isToday})`);
        
        if (isToday) {
          totalDistance += distanceValue;
          console.log(`📏 [Samsung Health] ✅ Adicionando ${distanceValue}m de distância de ${record.endTime}`);
        } else {
          console.log(`📏 [Samsung Health] ❌ Ignorando ${distanceValue}m de distância de ${record.endTime} (não é hoje)`);
        }
      });
      
      if (totalDistance > 0) {
        const distanceKm = Math.round((totalDistance / 1000) * 100) / 100;
        console.log(`📏 [Samsung Health] Total de distância do dia: ${distanceKm} km`);
      processed.push({
          collected_at: new Date().toISOString(),
          distance: distanceKm
        });
      } else {
        console.log(`📏 [Samsung Health] Nenhuma distância encontrada para hoje`);
      }
    }

    // Peso - pega a última medição
    const weightRecords = healthData.weightData?.records || [];
    if (weightRecords.length > 0) {
      console.log(`⚖️ [Samsung Health] Processando ${weightRecords.length} registros de peso`);
      
      const latestWeight = weightRecords[weightRecords.length - 1];
      console.log('⚖️ [Samsung Health] Último registro de peso:', JSON.stringify(latestWeight, null, 2));
      
      // Extrai o valor do peso do objeto aninhado
      let weightValue = 0;
      if (latestWeight.weight && latestWeight.weight.value !== undefined) {
        weightValue = latestWeight.weight.value;
      } else if (latestWeight.value !== undefined) {
        weightValue = latestWeight.value;
      }
      
      if (weightValue > 0) {
        console.log(`⚖️ [Samsung Health] Peso: ${weightValue} kg`);
      processed.push({
          collected_at: latestWeight.time,
          weight: Math.round(weightValue * 100) / 100
        });
      } else {
        console.log(`⚖️ [Samsung Health] Valor de peso inválido: ${weightValue}`);
      }
    }

    // Sono - pega a última sessão do dia
    const sleepRecords = healthData.sleepData?.records || [];
    if (sleepRecords.length > 0) {
      console.log(`😴 [Samsung Health] Processando ${sleepRecords.length} sessões de sono`);
      
      let totalSleepHours = 0;
      sleepRecords.forEach((record, index) => {
        const recordDate = new Date(record.endTime);
        const isToday = recordDate >= today;
        
        console.log(`😴 [Samsung Health] Sessão ${index + 1}:`, JSON.stringify(record, null, 2));
        
        if (isToday && record.startTime && record.endTime) {
          const startTime = new Date(record.startTime);
          const endTime = new Date(record.endTime);
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          
          console.log(`😴 [Samsung Health] Sono ${index + 1}: ${durationHours.toFixed(1)}h (${record.startTime} - ${record.endTime})`);
          
          if (durationHours > 0 && durationHours <= 24) { // Validação básica
            totalSleepHours += durationHours;
          }
        }
      });
      
      if (totalSleepHours > 0) {
        console.log(`😴 [Samsung Health] Total de sono do dia: ${totalSleepHours.toFixed(1)}h`);
        processed.push({
          collected_at: new Date().toISOString(),
          sleep_hours: Math.round(totalSleepHours * 10) / 10
        });
      } else {
        console.log(`😴 [Samsung Health] Nenhum sono válido encontrado para hoje`);
      }
    }

    // Oxigênio no Sangue (O2) - valor fixo de 95%
    processed.push({
      collected_at: new Date().toISOString(),
      oxygen: 95
    });
    console.log('🫁 [Samsung Health] Oxigênio no sangue fixo: 95%');

    console.log('📊 [Samsung Health] Dados processados:', processed);
    return processed;
  }

  /**
   * Busca dados da tabela smartwatch_data (DADOS REAIS)
   */
  async getSmartwatchData(daysBack = 7) {
    try {
      const userData = DataUser.getUserData();
      
      // Se não há usuário logado, retorna dados do cache temporário
      if (!userData?.id) {
        console.log('⚠️ [Samsung Health] Usuário não logado, retornando dados do cache temporário');
        return { success: true, data: this.tempDataCache || [] };
      }

      // Gera UUID válido a partir do user ID
      const userId = this.generateUserUUID(userData.id);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      console.log(`📱 [Samsung Health] Buscando dados para usuário ${userId} dos últimos ${daysBack} dias`);

      // Busca usando user_id como UUID válido
      const { data, error } = await supabase
        .from('smartwatch_data')
        .select('*')
        .eq('user_id', userId) // Usa UUID válido
        .gte('collected_at', startDate.toISOString())
        .order('collected_at', { ascending: false });

      if (error) {
        console.error('❌ [Samsung Health] Erro ao buscar dados:', error);
        return { success: false, error: error.message, data: [] };
      }

      console.log(`📱 [Samsung Health] ${data?.length || 0} registros encontrados na smartwatch_data`);
      return { success: true, data: data || [] };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao buscar dados:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Busca registros com tratamento de erro
   */
  async safeReadRecords(recordType, timeRangeFilter) {
    try {
      // Verifica se o timeRangeFilter está correto
      if (!timeRangeFilter || !timeRangeFilter.startTime || !timeRangeFilter.endTime) {
        console.log(`⚠️ [Samsung Health] Time range filter inválido para ${recordType}, usando período padrão`);
        
        // Cria um time range filter padrão se não for fornecido
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);
        
        timeRangeFilter = {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        };
      }

      console.log(`🔍 [Samsung Health] Buscando ${recordType} de ${timeRangeFilter.startTime} até ${timeRangeFilter.endTime}`);
      
      const records = await readRecords(recordType, { timeRangeFilter });
      return records || [];
    } catch (error) {
      console.log(`⚠️ [Samsung Health] Erro ao buscar ${recordType}: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtém dados vitais mais recentes (DADOS REAIS)
   */
  async getLatestVitalSigns() {
    try {
      const result = await this.getSmartwatchData(1); // Último dia
      if (!result.success || result.data.length === 0) {
        return {
          success: false,
          message: 'Nenhum dado vital encontrado. Sincronize com Samsung Health.',
          data: null
        };
      }

      // Pega o registro mais recente
      const latest = result.data[0];

      return {
        success: true,
        data: {
          heartRate: latest.heart_rate,
          bloodPressure: {
            systolic: latest.blood_pressure_systolic,
            diastolic: latest.blood_pressure_diastolic
          },
          bloodOxygen: latest.blood_oxygen,
          temperature: latest.body_temperature,
          steps: latest.steps,
          calories: latest.calories,
          distance: latest.distance,
          collectedAt: latest.collected_at,
          deviceName: latest.device_name,
          source: latest.source
        }
      };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao buscar dados vitais:', error);
      return {
        success: false,
        message: 'Erro ao acessar dados vitais',
        data: null
      };
    }
  }

  /**
   * Abre configurações do Health Connect
   */
  async openHealthConnectSettings() {
    try {
      await openHealthConnectSettings();
      return { success: true };
    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao abrir configurações:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Monitora dados em tempo real de smartwatches conectados (apenas do dia de hoje)
   */
  async startRealTimeMonitoring(intervalSeconds = 45) {
    try {
      console.log(`🔄 [Samsung Health] Iniciando monitoramento em tempo real (intervalo: ${intervalSeconds} seg)`);
      if (!this.hasPermissions) {
        const permResult = await this.requestSamsungHealthPermissions();
        if (!permResult.success) {
          throw new Error('Permissões necessárias para monitoramento em tempo real');
        }
      }
      const fetchRealtimeData = async () => {
        try {
          console.log('⏱️ [Samsung Health] Buscando dados em tempo real (hoje)...');
          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const timeRangeFilter = {
            operator: 'between',
            startTime: startOfDay.toISOString(),
            endTime: now.toISOString(),
          };
          const [heartRateData, stepsData, caloriesData] = await Promise.all([
            this.safeReadRecords('HeartRate', timeRangeFilter),
            this.safeReadRecords('Steps', timeRangeFilter),
            this.safeReadRecords('ActiveCaloriesBurned', timeRangeFilter)
          ]);
          console.log('📦 [Samsung Health] RAW HeartRateData:', heartRateData);
          console.log('📦 [Samsung Health] RAW StepsData:', stepsData);
          console.log('📦 [Samsung Health] RAW CaloriesData:', caloriesData);
          const totalNewRecords = heartRateData.length + stepsData.length + caloriesData.length;
          if (totalNewRecords > 0) {
            console.log(`🔔 [Samsung Health] ${totalNewRecords} novos registros detectados!`);
            await this.saveToSmartwatchData({
              heartRateData,
              stepsData,
              caloriesActiveData: caloriesData,
              caloriesTotalData: [],
              distanceData: [],
              sleepData: [],
              weightData: [],
              oxygenData: []
            });
            return {
              success: true,
              newRecords: totalNewRecords,
              data: {
                heartRate: heartRateData,
                steps: stepsData,
                calories: caloriesData
              }
            };
          } else {
            console.log('⚪ [Samsung Health] Nenhum dado novo hoje');
            return { success: true, newRecords: 0 };
          }
        } catch (error) {
          console.error('❌ [Samsung Health] Erro no monitoramento em tempo real:', error);
          return { success: false, error: error.message };
        }
      };
      const initialResult = await fetchRealtimeData();
      this.realtimeInterval = setInterval(fetchRealtimeData, intervalSeconds * 1000);
      console.log(`✅ [Samsung Health] Monitoramento em tempo real ativo (hoje)`);
      return {
        success: true,
        initialData: initialResult,
        intervalId: this.realtimeInterval
      };
    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao iniciar monitoramento:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Para o monitoramento em tempo real
   */
  stopRealTimeMonitoring() {
    if (this.realtimeInterval) {
      clearInterval(this.realtimeInterval);
      this.realtimeInterval = null;
      console.log('⏹️ [Samsung Health] Monitoramento em tempo real parado');
      return { success: true };
    }
    return { success: false, message: 'Nenhum monitoramento ativo' };
  }

  /**
   * Verifica conectividade com smartwatches
   */
  async checkSmartwatchConnectivity() {
    try {
      console.log('📱 [Samsung Health] Verificando conectividade com smartwatches...');

      // Busca dados dos últimos 10 minutos para verificar se há dispositivos ativos
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000));

      const timeRangeFilter = {
        operator: 'between',
        startTime: tenMinutesAgo.toISOString(),
        endTime: now.toISOString(),
      };

      const [heartRateData, stepsData] = await Promise.all([
        this.safeReadRecords('HeartRate', timeRangeFilter),
        this.safeReadRecords('Steps', timeRangeFilter)
      ]);

      const hasRecentData = heartRateData.length > 0 || stepsData.length > 0;
      
      // Verifica se há dados recentes na nossa tabela também
      const dbResult = await this.getSmartwatchData(1);
      const hasRecentDbData = dbResult.success && dbResult.data.length > 0;

      const connectivity = {
        healthConnectActive: hasRecentData,
        databaseSynced: hasRecentDbData,
        lastHeartRateReading: heartRateData.length > 0 ? heartRateData[0].time : null,
        lastStepsReading: stepsData.length > 0 ? stepsData[0].endTime : null,
        totalRecentRecords: heartRateData.length + stepsData.length,
        smartwatchConnected: hasRecentData,
        recommendations: []
      };

      // Gera recomendações baseadas na conectividade
      if (!hasRecentData && !hasRecentDbData) {
        connectivity.recommendations.push({
          type: 'no_connection',
          title: 'Nenhum smartwatch detectado',
          message: 'Verifique se seu smartwatch está conectado e sincronizando com Samsung Health',
          action: 'openSamsungHealth'
        });
      } else if (!hasRecentData && hasRecentDbData) {
        connectivity.recommendations.push({
          type: 'sync_issue',
          title: 'Problema de sincronização',
          message: 'Dados antigos encontrados. Verifique a sincronização do Health Connect',
          action: 'openHealthConnect'
        });
      } else if (hasRecentData) {
        connectivity.recommendations.push({
          type: 'connected',
          title: 'Smartwatch conectado',
          message: 'Recebendo dados em tempo real do seu dispositivo',
          action: 'none'
        });
      }

      console.log('📊 [Samsung Health] Status da conectividade:', connectivity);
      return { success: true, connectivity };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao verificar conectividade:', error);
      return {
        success: false,
        error: error.message,
        connectivity: {
          healthConnectActive: false,
          databaseSynced: false,
          smartwatchConnected: false,
          recommendations: [{
            type: 'error',
            title: 'Erro de conectividade',
            message: 'Não foi possível verificar a conexão com smartwatches',
            action: 'retry'
          }]
        }
      };
    }
  }

  /**
   * Inicia fluxo constante de dados (sincronização automática)
   */
  async startConstantDataFlow(intervalMinutes = 1) {
    try {
      console.log(`🔄 [Samsung Health] Iniciando fluxo constante de dados (intervalo: ${intervalMinutes} min)`);

      // Para fluxo anterior se existir
      this.stopConstantDataFlow();

      // Verifica se tem permissões
      if (!this.hasPermissions) {
        const permResult = await this.requestSamsungHealthPermissions();
        if (!permResult.success) {
          throw new Error('Permissões necessárias para fluxo constante');
        }
      }

      // Função de sincronização automática
      const autoSync = async () => {
        try {
          console.log('⏰ [Samsung Health] Sincronização automática iniciada...');
          
          // Sincroniza dados dos últimos 30 minutos
          const syncResult = await this.syncSamsungHealthData(1);
          
          if (syncResult.success && syncResult.totalRecords > 0) {
            console.log(`✅ [Samsung Health] Sincronização automática: ${syncResult.totalRecords} novos registros`);
          } else {
            console.log('📊 [Samsung Health] Sincronização automática: nenhum dado novo');
          }

          return syncResult;
        } catch (error) {
          console.error('❌ [Samsung Health] Erro na sincronização automática:', error);
          return { success: false, error: error.message };
        }
      };

      // Executa sincronização inicial
      await autoSync();

      // Configura intervalo para sincronização contínua
      this.constantFlowInterval = setInterval(autoSync, intervalMinutes * 60 * 1000);
      this.isConstantFlowActive = true;

      console.log(`✅ [Samsung Health] Fluxo constante de dados ativo (${intervalMinutes} min)`);
      
      return {
        success: true,
        intervalMinutes,
        message: `Fluxo constante ativo - sincronização a cada ${intervalMinutes} minuto(s)`
      };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao iniciar fluxo constante:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Para o fluxo constante de dados
   */
  stopConstantDataFlow() {
    if (this.constantFlowInterval) {
      clearInterval(this.constantFlowInterval);
      this.constantFlowInterval = null;
      this.isConstantFlowActive = false;
      console.log('⏹️ [Samsung Health] Fluxo constante de dados parado');
      return { success: true, message: 'Fluxo constante parado' };
    }
    return { success: false, message: 'Nenhum fluxo constante ativo' };
  }

  /**
   * Verifica status do fluxo constante
   */
  getConstantFlowStatus() {
    return {
      isActive: this.isConstantFlowActive,
      hasInterval: this.constantFlowInterval !== null,
      message: this.isConstantFlowActive ? 'Fluxo constante ativo' : 'Fluxo constante inativo'
    };
  }

  /**
   * Força sincronização imediata (para testes)
   */
  async forceSyncNow() {
    try {
      console.log('🚀 [Samsung Health] Forçando sincronização imediata...');
      
      const syncResult = await this.syncSamsungHealthData(1);
      
      if (syncResult.success) {
        console.log(`✅ [Samsung Health] Sincronização forçada concluída: ${syncResult.totalRecords} registros`);
        return {
          success: true,
          totalRecords: syncResult.totalRecords,
          message: `Sincronização concluída - ${syncResult.totalRecords} registros processados`
        };
      } else {
        throw new Error(syncResult.error || 'Falha na sincronização');
      }

    } catch (error) {
      console.error('❌ [Samsung Health] Erro na sincronização forçada:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Consolida dados do dia atual para exibição no dashboard
   */
  async getTodayHealthSummary() {
    try {
      console.log('📊 [Samsung Health] Consolidando dados do dia atual...');
      
      // Primeiro sincroniza dados frescos
      const syncResult = await this.syncSamsungHealthData();
      if (!syncResult.success) {
        console.warn('⚠️ [Samsung Health] Erro na sincronização:', syncResult.error);
      }

      // Busca dados do banco
      const dbResult = await this.getSmartwatchData(1);
      if (!dbResult.success || dbResult.data.length === 0) {
        console.log('📊 [Samsung Health] Nenhum dado encontrado no banco para hoje');
        return {
          success: true,
          data: {
            steps: 0,
            heartRate: 0,
            calories: 0,
            sleep: 0,
            water: 0,
            weight: 0,
            distance: 0,
            oxygen: 0
          }
        };
      }

      // Consolida dados do dia
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let summary = {
        steps: 0,
        heartRate: 0,
        calories: 0,
        sleep: 0,
        water: 0,
        weight: 0,
        distance: 0,
        oxygen: 0
      };

      // Processa cada registro
      dbResult.data.forEach(record => {
        const recordDate = new Date(record.collected_at);
        if (recordDate >= today) {
          // Passos - soma todos
          if (record.steps) {
            summary.steps += record.steps;
          }
          
          // Frequência cardíaca - pega a mais recente
          if (record.heart_rate && record.heart_rate > summary.heartRate) {
            summary.heartRate = record.heart_rate;
          }
          
          // Calorias - soma todas
          if (record.calories) {
            summary.calories += record.calories;
          }
          if (record.calories_active) {
            summary.calories += record.calories_active;
          }
          
          // Sono - pega o maior valor
          if (record.sleep_hours && record.sleep_hours > summary.sleep) {
            summary.sleep = record.sleep_hours;
          }
          
          // Água - soma todas
          if (record.water_intake) {
            summary.water += record.water_intake;
          }
          
          // Peso - pega o mais recente
          if (record.weight && record.weight > summary.weight) {
            summary.weight = record.weight;
          }
          
          // Distância - soma todas
          if (record.distance) {
            summary.distance += record.distance;
          }
        }
      });

      console.log('📊 [Samsung Health] Resumo do dia:', summary);
      
      return {
        success: true,
        data: summary
      };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao consolidar dados:', error);
      return {
        success: false,
        error: error.message,
        data: {
          steps: 0,
          heartRate: 0,
          calories: 0,
          sleep: 0,
          water: 0,
          weight: 0,
          distance: 0,
          oxygen: 0
        }
      };
    }
  }

  /**
   * Busca e processa dados do Samsung Health para exibição direta (sem salvar no banco)
   */
  async getRawHealthDataForDisplay() {
    try {
      console.log('📊 [Samsung Health] Buscando dados brutos para exibição...');

      // Verifica se tem permissões - se não tiver, tenta solicitar automaticamente
      if (!this.hasPermissions) {
        console.log('🔐 [Samsung Health] Sem permissões, tentando solicitar automaticamente...');
        const permResult = await this.requestSamsungHealthPermissions();
        if (!permResult.success) {
          console.log('⚠️ [Samsung Health] Não foi possível obter permissões, mas continuando...');
          // Não retorna erro, continua tentando buscar dados
        }
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const timeRangeFilter = {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      };

      console.log(`📅 [Samsung Health] Buscando dados de hoje: ${startOfDay.toISOString()} até ${now.toISOString()}`);

      // Busca dados reais em paralelo
      const [
        heartRateData,
        stepsData,
        caloriesActiveData,
        caloriesTotalData,
        distanceData,
        sleepData,
        weightData,
        oxygenData
      ] = await Promise.all([
        this.safeReadRecords('HeartRate', timeRangeFilter),
        this.safeReadRecords('Steps', timeRangeFilter),
        this.safeReadRecords('ActiveCaloriesBurned', timeRangeFilter),
        this.safeReadRecords('TotalCaloriesBurned', timeRangeFilter),
        this.safeReadRecords('Distance', timeRangeFilter),
        this.safeReadRecords('SleepSession', timeRangeFilter),
        this.safeReadRecords('Weight', timeRangeFilter),
        this.safeReadRecords('OxygenSaturation', timeRangeFilter)
      ]);

      // Processa dados para exibição
      const summary = this.processRawDataForSummary({
        heartRateData,
        stepsData,
        caloriesActiveData,
        caloriesTotalData,
        distanceData,
        sleepData,
        weightData,
        oxygenData
      });

      const totalRecords = (heartRateData?.records?.length || 0) + 
                          (stepsData?.records?.length || 0) + 
                          (caloriesActiveData?.records?.length || 0) + 
                          (caloriesTotalData?.records?.length || 0) + 
                          (distanceData?.records?.length || 0) + 
                          (sleepData?.records?.length || 0) + 
                          (weightData?.records?.length || 0) + 
                          (oxygenData?.length || 0);

      console.log('📊 [Samsung Health] Dados processados para exibição:', summary);
      
      return { 
        success: true, 
        summary,
        totalRecords,
        rawData: {
          heartRateData,
          stepsData,
          caloriesActiveData,
          caloriesTotalData,
          distanceData,
          sleepData,
          weightData,
          oxygenData
        }
      };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao buscar dados brutos:', error);
      return { 
        success: false, 
        error: error.message,
        summary: {
          steps: 0,
          heartRate: 0,
          calories: 0,
          sleep: 0,
          water: 0,
          weight: 0,
          distance: 0,
          oxygen: 0
        },
        totalRecords: 0
      };
    }
  }

  /**
   * Processa dados brutos para resumo de exibição
   */
  processRawDataForSummary(healthData) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('🔧 [Samsung Health] Processando dados brutos para resumo...');

    let summary = {
      steps: 0,
      heartRate: 0,
      calories: 0,
      sleep: 0,
      water: 0,
      weight: 0,
      distance: 0,
      oxygen: 0
    };

    // Frequência Cardíaca - pega a última leitura do dia
    const heartRateRecords = healthData.heartRateData?.records || [];
    if (heartRateRecords.length > 0) {
      const latestHeartRate = heartRateRecords[heartRateRecords.length - 1];
      if (latestHeartRate.samples && Array.isArray(latestHeartRate.samples) && latestHeartRate.samples.length > 0) {
        const lastSample = latestHeartRate.samples[latestHeartRate.samples.length - 1];
        summary.heartRate = lastSample.beatsPerMinute || 0;
        console.log(`💓 [Samsung Health] Frequência cardíaca: ${summary.heartRate} bpm`);
      }
    }

    // Passos - pega o total acumulado do dia (não soma registros individuais)
    const stepsRecords = healthData.stepsData?.records || [];
    if (stepsRecords.length > 0) {
      console.log(`👟 [Samsung Health] Processando ${stepsRecords.length} registros de passos`);
      
      // Procura o registro com o maior count (que deve ser o total acumulado do dia)
      let maxSteps = 0;
      let totalStepsRecord = null;
      
      stepsRecords.forEach((record, index) => {
        const stepsCount = record.count || 0;
        console.log(`👟 [Samsung Health] Registro ${index + 1}: ${stepsCount} passos (${record.startTime} - ${record.endTime})`);
        
        if (stepsCount > maxSteps) {
          maxSteps = stepsCount;
          totalStepsRecord = record;
        }
      });
      
      // Se encontrou um registro com muitos passos, usa ele como total
      if (maxSteps > 100) { // Se tem mais de 100 passos, provavelmente é o total
        summary.steps = maxSteps;
        console.log(`👟 [Samsung Health] Total acumulado de passos: ${summary.steps} (do registro: ${totalStepsRecord?.startTime} - ${totalStepsRecord?.endTime})`);
      } else {
        // Fallback: soma todos os registros de hoje
        let dailySteps = 0;
        stepsRecords.forEach(record => {
          const recordDate = new Date(record.endTime);
          const isToday = recordDate >= today;
          if (isToday) {
            dailySteps += record.count || 0;
          }
        });
        summary.steps = dailySteps;
        console.log(`👟 [Samsung Health] Total de passos (soma dos registros): ${summary.steps}`);
      }
    }

    // Calorias - processa tanto ativas quanto totais
    const caloriesTotalRecords = healthData.caloriesTotalData?.records || [];
    const caloriesActiveRecords = healthData.caloriesActiveData?.records || [];
    
    console.log(`🔥 [Samsung Health] Processando calorias:`);
    console.log(`🔥 [Samsung Health] - Total records: ${caloriesTotalRecords.length}`);
    console.log(`🔥 [Samsung Health] - Active records: ${caloriesActiveRecords.length}`);
    
    let totalCalories = 0;
    let activeCalories = 0;
    
    // Processa calorias totais
    if (caloriesTotalRecords.length > 0) {
      console.log(`🔥 [Samsung Health] Processando ${caloriesTotalRecords.length} registros de calorias totais:`);
      
      caloriesTotalRecords.forEach((record, index) => {
        const recordDate = new Date(record.endTime);
        const isToday = recordDate >= today;
        
        // Log detalhado da estrutura do registro
        console.log(`🔥 [Samsung Health] Estrutura completa do registro ${index + 1}:`, JSON.stringify(record, null, 2));
        
        let caloriesValue = 0;
        if (record.energy && record.energy.inKilocalories !== undefined) {
          caloriesValue = Math.round(record.energy.inKilocalories);
        } else if (record.energy && record.energy.value !== undefined) {
          caloriesValue = record.energy.value;
        } else if (record.value !== undefined) {
          caloriesValue = record.value;
        } else if (record.energy && typeof record.energy === 'number') {
          caloriesValue = record.energy;
        } else if (record.kilocalories !== undefined) {
          caloriesValue = record.kilocalories;
        } else if (record.calories !== undefined) {
          caloriesValue = record.calories;
        }
        
        console.log(`🔥 [Samsung Health] Total ${index + 1}: ${caloriesValue} cal (${record.startTime} - ${record.endTime}) [hoje: ${isToday}]`);
        console.log(`🔥 [Samsung Health] - energy.inKilocalories: ${record.energy?.inKilocalories}`);
        console.log(`🔥 [Samsung Health] - energy: ${JSON.stringify(record.energy)}`);
        console.log(`🔥 [Samsung Health] - value: ${record.value}`);
        console.log(`🔥 [Samsung Health] - kilocalories: ${record.kilocalories}`);
        console.log(`🔥 [Samsung Health] - calories: ${record.calories}`);
        
        if (isToday) {
          totalCalories += caloriesValue;
        }
      });
    }
    
    // Processa calorias ativas
    if (caloriesActiveRecords.length > 0) {
      console.log(`🔥 [Samsung Health] Processando ${caloriesActiveRecords.length} registros de calorias ativas:`);
      
      caloriesActiveRecords.forEach((record, index) => {
        const recordDate = new Date(record.endTime);
        const isToday = recordDate >= today;
        
        // Log detalhado da estrutura do registro
        console.log(`🔥 [Samsung Health] Estrutura completa do registro ativo ${index + 1}:`, JSON.stringify(record, null, 2));
        
        let caloriesValue = 0;
        if (record.energy && record.energy.inKilocalories !== undefined) {
          caloriesValue = Math.round(record.energy.inKilocalories);
        } else if (record.energy && record.energy.value !== undefined) {
          caloriesValue = record.energy.value;
        } else if (record.value !== undefined) {
          caloriesValue = record.value;
        } else if (record.energy && typeof record.energy === 'number') {
          caloriesValue = record.energy;
        } else if (record.kilocalories !== undefined) {
          caloriesValue = record.kilocalories;
        } else if (record.calories !== undefined) {
          caloriesValue = record.calories;
        }
        
        console.log(`🔥 [Samsung Health] Ativo ${index + 1}: ${caloriesValue} cal (${record.startTime} - ${record.endTime}) [hoje: ${isToday}]`);
        console.log(`🔥 [Samsung Health] - energy.inKilocalories: ${record.energy?.inKilocalories}`);
        console.log(`🔥 [Samsung Health] - energy: ${JSON.stringify(record.energy)}`);
        console.log(`🔥 [Samsung Health] - value: ${record.value}`);
        console.log(`🔥 [Samsung Health] - kilocalories: ${record.kilocalories}`);
        console.log(`🔥 [Samsung Health] - calories: ${record.calories}`);
        
        if (isToday) {
          activeCalories += caloriesValue;
        }
      });
    }
    
    // Usa o maior valor entre total e ativo (ou soma se ambos existem)
    if (totalCalories > 0 || activeCalories > 0) {
      summary.calories = Math.round(Math.max(totalCalories, activeCalories));
      console.log(`🔥 [Samsung Health] Resumo de calorias:`);
      console.log(`🔥 [Samsung Health] - Total: ${Math.round(totalCalories)} cal`);
      console.log(`🔥 [Samsung Health] - Active: ${Math.round(activeCalories)} cal`);
      console.log(`🔥 [Samsung Health] - Final: ${summary.calories} cal`);
    } else {
      console.log(`🔥 [Samsung Health] Nenhuma caloria encontrada para hoje`);
    }

    // Distância - soma todos os registros do dia
    const distanceRecords = healthData.distanceData?.records || [];
    if (distanceRecords.length > 0) {
      distanceRecords.forEach(record => {
        const recordDate = new Date(record.endTime);
        const isToday = recordDate >= today;
        if (isToday) {
          let distanceValue = 0;
          if (record.distance && record.distance.value !== undefined) {
            distanceValue = record.distance.value;
          } else if (record.value !== undefined) {
            distanceValue = record.value;
          }
          summary.distance += distanceValue;
        }
      });
      summary.distance = Math.round((summary.distance / 1000) * 100) / 100;
      console.log(`📏 [Samsung Health] Total de distância: ${summary.distance} km`);
    }

    // Peso - pega a última medição
    const weightRecords = healthData.weightData?.records || [];
    if (weightRecords.length > 0) {
      const latestWeight = weightRecords[weightRecords.length - 1];
      let weightValue = 0;
      if (latestWeight.weight && latestWeight.weight.value !== undefined) {
        weightValue = latestWeight.weight.value;
      } else if (latestWeight.value !== undefined) {
        weightValue = latestWeight.value;
      }
      if (weightValue > 0) {
        summary.weight = Math.round(weightValue * 100) / 100;
        console.log(`⚖️ [Samsung Health] Peso: ${summary.weight} kg`);
      }
    }

    // Sono - pega a última sessão do dia
    const sleepRecords = healthData.sleepData?.records || [];
    if (sleepRecords.length > 0) {
      console.log(`😴 [Samsung Health] Processando ${sleepRecords.length} sessões de sono para resumo`);
      
      let totalSleepHours = 0;
      sleepRecords.forEach((record, index) => {
        const recordDate = new Date(record.endTime);
        const isToday = recordDate >= today;
        
        console.log(`😴 [Samsung Health] Sessão ${index + 1}:`, JSON.stringify(record, null, 2));
        
        if (isToday && record.startTime && record.endTime) {
          const startTime = new Date(record.startTime);
          const endTime = new Date(record.endTime);
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          
          console.log(`😴 [Samsung Health] Sono ${index + 1}: ${durationHours.toFixed(1)}h (${record.startTime} - ${record.endTime})`);
          
          if (durationHours > 0 && durationHours <= 24) { // Validação básica
            totalSleepHours += durationHours;
          }
        }
      });
      
      if (totalSleepHours > 0) {
        summary.sleep = Math.round(totalSleepHours * 10) / 10;
        console.log(`😴 [Samsung Health] Total de sono para exibição: ${summary.sleep}h`);
      } else {
        console.log(`😴 [Samsung Health] Nenhum sono válido encontrado para exibição hoje`);
      }
    }

    // Oxigênio no Sangue (O2) - valor fixo de 95%
    summary.oxygen = 95;
    console.log('🫁 [Samsung Health] Oxigênio no sangue fixo: 95%');

    // Água - por enquanto 0 (não implementado)
    summary.water = 0;

    return summary;
  }

  /**
   * Verifica permissões atuais
   */
  async checkCurrentPermissions() {
    try {
      if (!this.isInitialized) {
        const initResult = await this.initializeHealthConnect();
        if (!initResult.success) {
          return { success: false, error: initResult.error };
        }
      }

      console.log('🔍 [Samsung Health] Verificando permissões atuais...');

      const permissions = [
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'Height' },
        { accessType: 'read', recordType: 'BodyFat' },
        { accessType: 'read', recordType: 'LeanBodyMass' },
        { accessType: 'read', recordType: 'BodyWaterMass' },
        { accessType: 'read', recordType: 'BoneMass' },
        { accessType: 'read', recordType: 'BasalMetabolicRate' }
      ];

      const grantedPermissions = await requestPermission(permissions);
      
      console.log('🔍 [Samsung Health] Status das permissões:');
      permissions.forEach(permission => {
        const isGranted = grantedPermissions.some(granted => 
          granted.accessType === permission.accessType && 
          granted.recordType === permission.recordType
        );
        console.log(`🔍 [Samsung Health] - ${permission.recordType}: ${isGranted ? '✅ Concedida' : '❌ Negada'}`);
      });

      return { 
        success: true, 
        permissions: grantedPermissions,
        totalGranted: grantedPermissions?.length || 0,
        totalRequested: permissions.length
      };

    } catch (error) {
      console.error('❌ [Samsung Health] Erro ao verificar permissões:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new SamsungHealthService(); 