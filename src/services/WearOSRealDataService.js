
// Wear OS Real Data Service - REAL data from connected Wear OS devices
// Uses Google Fit API for actual wearable data (NO SIMULATION)

import GoogleFit, { Scopes } from 'react-native-google-fit';
import { Platform } from 'react-native';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

class WearOSRealDataService {
  constructor() {
    this.isInitialized = false;
    this.isAuthorized = false;
    this.dataCallbacks = {};
    this.realtimeSubscription = null;
    this.isRealTimeActive = false;
    this.lastRealData = {
      heartRate: null,
      steps: null,
      calories: null,
      distance: null,
      timestamp: null
    };
  }

  /**
   * Initialize Google Fit for Wear OS data access (with safe scopes and detailed logs)
   */
  async initializeGoogleFit() {
    try {
      console.log('⌚ [WearOS] Inicializando Google Fit para Wear OS...');

      if (Platform.OS !== 'android') {
        throw new Error('Wear OS data only available on Android');
      }

      // Build scopes array and filter out any null/undefined/empty
      const allScopes = [
        Scopes.FITNESS_ACTIVITY_READ,
        Scopes.FITNESS_ACTIVITY_READ_WRITE,
        Scopes.FITNESS_BODY_READ,
        Scopes.FITNESS_BODY_READ_WRITE,
        Scopes.FITNESS_HEART_RATE_READ,
        Scopes.FITNESS_HEART_RATE_READ_WRITE,
        Scopes.FITNESS_LOCATION_READ,
        Scopes.FITNESS_LOCATION_READ_WRITE,
      ];
      const scopes = allScopes.filter(s => typeof s === 'string' && s.length > 0);
      console.log('⌚ [WearOS] Scopes enviados para Google Fit:', scopes);

      const options = { scopes };

      const authResult = await GoogleFit.authorize(options);
      
      if (authResult.success) {
        this.isInitialized = true;
        this.isAuthorized = true;
        console.log('✅ [WearOS] Google Fit autorizado com sucesso');
        
        // Check for Wear OS data sources
        await this.detectWearOSSources();
        
        return { success: true, message: 'Google Fit initialized for Wear OS' };
      } else {
        console.error('❌ [WearOS] Google Fit authorization failed:', authResult);
        alert('Falha na autorização do Google Fit.\n\nCertifique-se de que:\n- O app Google Fit está instalado e logado com a mesma conta do relógio\n- Todas as permissões de saúde estão concedidas no celular e relógio\n- O relógio está conectado ao celular\n\nDepois, tente novamente.');
        throw new Error('Google Fit authorization failed');
      }

    } catch (error) {
      console.error('❌ [WearOS] Erro na inicialização:', error);
      this.isInitialized = false;
      this.isAuthorized = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect Wear OS data sources
   */
  async detectWearOSSources() {
    try {
      console.log('🔍 [WearOS] Detectando fontes de dados Wear OS...');

      // Get available data sources
      const dataSources = await GoogleFit.getDataSources();
      
      const wearOSSources = dataSources.filter(source => 
        source.appPackageName && (
          source.appPackageName.includes('wear') ||
          source.appPackageName.includes('watch') ||
          source.appPackageName.includes('samsung') ||
          source.device?.type === 'watch'
        )
      );

      console.log(`⌚ [WearOS] ${wearOSSources.length} fontes Wear OS detectadas:`);
      wearOSSources.forEach(source => {
        console.log(`  📱 ${source.name} (${source.appPackageName})`);
      });

      return wearOSSources;

    } catch (error) {
      console.error('❌ [WearOS] Erro ao detectar fontes:', error);
      return [];
    }
  }

  /**
   * Start real-time data collection from Wear OS
   */
  async startRealTimeCollection() {
    try {
      if (!this.isAuthorized) {
        const initResult = await this.initializeGoogleFit();
        if (!initResult.success) {
          return { success: false, error: 'Google Fit not authorized' };
        }
      }

      console.log('🚀 [WearOS] Iniciando coleta de dados REAIS do Wear OS...');
      
      this.isRealTimeActive = true;

      // Start collecting different data types
      await Promise.all([
        this.startHeartRateCollection(),
        this.startStepsCollection(),
        this.startCaloriesCollection(),
        this.startDistanceCollection()
      ]);

      // Set up real-time monitoring
      this.setupRealTimeMonitoring();

      console.log('✅ [WearOS] Coleta de dados reais ativa');
      return { 
        success: true, 
        message: 'Real-time Wear OS data collection started' 
      };

    } catch (error) {
      console.error('❌ [WearOS] Erro ao iniciar coleta:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start heart rate data collection
   */
  async startHeartRateCollection() {
    try {
      console.log('💓 [WearOS] Iniciando coleta de frequência cardíaca...');

      // Get recent heart rate data (last 10 minutes)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (10 * 60 * 1000));

      const heartRateData = await GoogleFit.getHeartRateSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (heartRateData && Array.isArray(heartRateData) && heartRateData.length > 0) {
        const latestHR = heartRateData[heartRateData.length - 1];
        
        // SAFE null check
        if (latestHR && typeof latestHR.value === 'number' && latestHR.value > 0) {
          const heartRate = Math.round(latestHR.value);
          console.log(`💓 [WearOS] Frequência cardíaca REAL: ${heartRate} bpm`);
          this.handleRealData('heartRate', heartRate);
        } else {
          console.log('⚠️ [WearOS] Dados de FC inválidos ou nulos');
        }
      } else {
        console.log('⚠️ [WearOS] Nenhum dado de FC encontrado nos últimos 10 minutos');
      }

    } catch (error) {
      console.error('❌ [WearOS] Erro ao coletar FC:', error.message);
    }
  }

  /**
   * Start steps data collection
   */
  async startStepsCollection() {
    try {
      console.log('🚶 [WearOS] Iniciando coleta de passos...');

      // Get today's steps
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const steps = await GoogleFit.getDailyStepCountSamples({
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
      });

      if (steps && Array.isArray(steps) && steps.length > 0) {
        // Get total steps for today with SAFE null checking
        const totalSteps = steps.reduce((total, step) => {
          if (step && typeof step.steps === 'number' && step.steps >= 0) {
            return total + step.steps;
          }
          return total;
        }, 0);
        
        if (totalSteps > 0) {
          console.log(`🚶 [WearOS] Passos REAIS de hoje: ${totalSteps}`);
          this.handleRealData('steps', totalSteps);
        } else {
          console.log('⚠️ [WearOS] Dados de passos inválidos ou zero');
        }
      } else {
        console.log('⚠️ [WearOS] Nenhum dado de passos encontrado hoje');
      }

    } catch (error) {
      console.error('❌ [WearOS] Erro ao coletar passos:', error.message);
    }
  }

  /**
   * Start calories data collection
   */
  async startCaloriesCollection() {
    try {
      console.log('🔥 [WearOS] Iniciando coleta de calorias...');

      // Get today's calories
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const calories = await GoogleFit.getDailyCalorieSamples({
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
      });

      if (calories && Array.isArray(calories) && calories.length > 0) {
        const latestCalories = calories[calories.length - 1];
        
        // SAFE null check for calories
        if (latestCalories) {
          const calorieValue = latestCalories.calorie || latestCalories.value || 0;
          
          if (typeof calorieValue === 'number' && calorieValue > 0) {
            console.log(`🔥 [WearOS] Calorias REAIS: ${calorieValue} kcal`);
            this.handleRealData('calories', Math.round(calorieValue));
          } else {
            console.log('⚠️ [WearOS] Dados de calorias inválidos ou zero');
          }
        } else {
          console.log('⚠️ [WearOS] Objeto de calorias nulo');
        }
      } else {
        console.log('⚠️ [WearOS] Nenhum dado de calorias encontrado hoje');
      }

    } catch (error) {
      console.error('❌ [WearOS] Erro ao coletar calorias:', error.message);
    }
  }

  /**
   * Start distance data collection
   */
  async startDistanceCollection() {
    try {
      console.log('📍 [WearOS] Iniciando coleta de distância...');

      // Get today's distance
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const distance = await GoogleFit.getDailyDistanceSamples({
        startDate: today.toISOString(),
        endDate: new Date().toISOString(),
      });

      if (distance && Array.isArray(distance) && distance.length > 0) {
        // SAFE null check for distance calculation
        const totalDistance = distance.reduce((total, dist) => {
          if (dist && typeof dist.distance === 'number' && dist.distance >= 0) {
            return total + dist.distance;
          }
          return total;
        }, 0);
        
        if (totalDistance > 0) {
          // Convert meters to kilometers
          const distanceKm = totalDistance / 1000;
          
          console.log(`📍 [WearOS] Distância REAL: ${distanceKm.toFixed(2)} km`);
          this.handleRealData('distance', parseFloat(distanceKm.toFixed(2)));
        } else {
          console.log('⚠️ [WearOS] Dados de distância inválidos ou zero');
        }
      } else {
        console.log('⚠️ [WearOS] Nenhum dado de distância encontrado hoje');
      }

    } catch (error) {
      console.error('❌ [WearOS] Erro ao coletar distância:', error.message);
    }
  }

  /**
   * Setup real-time monitoring with intervals
   */
  setupRealTimeMonitoring() {
    console.log('⏰ [WearOS] Configurando monitoramento em tempo real...');

    // Monitor every 30 seconds for real-time updates
    this.realtimeSubscription = setInterval(async () => {
      if (this.isRealTimeActive) {
        console.log('🔄 [WearOS] Atualizando dados em tempo real...');
        
        // Collect fresh data
        await Promise.all([
          this.startHeartRateCollection(),
          this.startStepsCollection(),
          this.startCaloriesCollection(),
          this.startDistanceCollection()
        ]);
      }
    }, 30000); // Every 30 seconds

    console.log('✅ [WearOS] Monitoramento em tempo real configurado (30s)');
  }

  /**
   * Handle real data and save to database
   */
  handleRealData(dataType, value) {
    try {
      const timestamp = new Date().toISOString();
      
      console.log(`📊 [WearOS] DADOS REAIS - ${dataType}: ${value}`);

      // Update last real data
      this.lastRealData[dataType] = value;
      this.lastRealData.timestamp = timestamp;

      // Save to database
      this.saveWearOSData(dataType, value);

      // Call UI callbacks
      if (this.dataCallbacks[dataType]) {
        this.dataCallbacks[dataType](value, 'WEAR_OS_REAL');
      }

      // Call general callback
      if (this.dataCallbacks.onRealData) {
        this.dataCallbacks.onRealData({
          dataType,
          value,
          source: 'WEAR_OS_REAL',
          timestamp
        });
      }

    } catch (error) {
      console.error('❌ [WearOS] Erro ao processar dados reais:', error);
    }
  }

  /**
   * Save Wear OS data to database (explicit columns)
   */
  async saveWearOSData(dataType, value) {
    try {
      const userData = DataUser.getUserData();
      if (!userData?.id) return;

      const userId = this.generateUserUUID(userData.id);
      const now = new Date().toISOString();

      // Map dataType to column
      const columnMap = {
        heartRate: 'heart_rate',
        steps: 'steps',
        calories: 'calories',
        distance: 'distance',
      };
      const column = columnMap[dataType];
      if (!column) return;

      const record = {
        user_id: userId,
        source: 'wear_os_real',
        device_name: 'Wear OS Device',
        collected_at: now,
        [column]: value
      };

      const { error } = await supabase
        .from('smartwatch_data')
        .insert([record]);

      if (error) {
        console.error('❌ [WearOS] Erro ao salvar dados:', error);
      } else {
        console.log(`✅ [WearOS] Dados reais salvos: ${dataType} = ${value}`);
      }

    } catch (error) {
      console.error('❌ [WearOS] Erro ao salvar dados:', error);
    }
  }

  /**
   * Generate UUID from user ID
   */
  generateUserUUID(userId) {
    if (typeof userId === 'string' && userId.includes('-')) {
      return userId;
    }
    const userIdStr = String(userId).padStart(8, '0');
    return `00000000-0000-4000-8000-${userIdStr}0000`;
  }

  /**
   * Set data callback for real-time updates
   */
  setDataCallback(dataType, callback) {
    this.dataCallbacks[dataType] = callback;
  }

  /**
   * Force immediate data sync
   */
  async forceSyncNow() {
    try {
      console.log('🚀 [WearOS] Forçando sincronização imediata...');

      if (!this.isAuthorized) {
        return { success: false, error: 'Google Fit not authorized' };
      }

      // Collect all data types immediately
      await Promise.all([
        this.startHeartRateCollection(),
        this.startStepsCollection(),
        this.startCaloriesCollection(),
        this.startDistanceCollection()
      ]);

      return { 
        success: true, 
        message: 'Dados Wear OS sincronizados com sucesso',
        data: this.lastRealData
      };

    } catch (error) {
      console.error('❌ [WearOS] Erro na sincronização forçada:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current Wear OS status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAuthorized: this.isAuthorized,
      isRealTimeActive: this.isRealTimeActive,
      lastRealData: this.lastRealData,
      hasRecentData: this.lastRealData.timestamp && 
        (Date.now() - new Date(this.lastRealData.timestamp).getTime()) < 300000 // 5 minutes
    };
  }

  /**
   * Get latest real data
   */
  getLatestRealData() {
    return {
      ...this.lastRealData,
      isReal: true,
      source: 'WEAR_OS',
      connected: this.isAuthorized && this.isRealTimeActive
    };
  }

  /**
   * Stop real-time collection
   */
  stopRealTimeCollection() {
    try {
      console.log('🛑 [WearOS] Parando coleta de dados reais...');

      this.isRealTimeActive = false;

      if (this.realtimeSubscription) {
        clearInterval(this.realtimeSubscription);
        this.realtimeSubscription = null;
      }

      console.log('✅ [WearOS] Coleta de dados reais parada');
      return { success: true };

    } catch (error) {
      console.error('❌ [WearOS] Erro ao parar coleta:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if we have real recent data (no simulation needed)
   */
  hasRecentRealData() {
    if (!this.lastRealData.timestamp) return false;
    
    const dataAge = Date.now() - new Date(this.lastRealData.timestamp).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    return dataAge < fiveMinutes;
  }

  /**
   * Get Wear OS device info
   */
  async getWearOSDeviceInfo() {
    try {
      if (!this.isAuthorized) return null;

      const dataSources = await this.detectWearOSSources();
      
      return {
        connectedDevices: dataSources.length,
        devices: dataSources.map(source => ({
          name: source.name,
          package: source.appPackageName,
          type: source.device?.type || 'unknown'
        }))
      };

    } catch (error) {
      console.error('❌ [WearOS] Erro ao obter info do dispositivo:', error);
      return null;
    }
  }
}

export default new WearOSRealDataService(); 