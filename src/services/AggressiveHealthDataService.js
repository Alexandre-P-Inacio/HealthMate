// Aggressive Health Data Service - REAL-TIME data by any means necessary
// Priority: 1) Wear OS Real Data 2) BLE 3) Health Connect 4) Samsung Health
// NO SIMULATION when real Wear OS data is available

import SamsungHealthService from './SamsungHealthService';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

class AggressiveHealthDataService {
  constructor() {
    this.isActive = false;
    this.dataCallbacks = {};
    this.lastRealData = {
      heartRate: null,
      steps: null,
      calories: null,
      distance: null,
      timestamp: null
    };
    this.dataSources = {
      samsungHealth: false
    };
  }

  /**
   * Initialize only Samsung Health
   */
  async initializeAllSources() {
    try {
      console.log('📱 [AGGRESSIVE] Inicializando apenas Samsung Health...');
      const result = await SamsungHealthService.initializeHealthConnect();
      if (result.success) {
        this.dataSources.samsungHealth = true;
        console.log('✅ [AGGRESSIVE] Samsung Health inicializado');
        return { success: true, sources: { samsungHealth: result }, message: 'Samsung Health disponível' };
      } else {
        return { success: false, sources: { samsungHealth: result }, message: 'Samsung Health não disponível' };
      }
    } catch (error) {
      console.error('❌ [AGGRESSIVE] Erro na inicialização:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start real-time data collection using only Samsung Health
   */
  async startAggressiveDataCollection() {
    try {
      if (this.isActive) {
        console.log('⚠️ [AGGRESSIVE] Coleta já ativa');
        return { success: false, error: 'Coleta já ativa' };
      }
      console.log('🚀 [AGGRESSIVE] Iniciando coleta apenas do Samsung Health...');
      this.startSamsungHealthMonitoring();
      this.isActive = true;
      return { success: true, message: 'Coleta ativa - apenas Samsung Health' };
    } catch (error) {
      console.error('❌ [AGGRESSIVE] Erro ao iniciar coleta:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start Samsung Health monitoring
   */
  startSamsungHealthMonitoring() {
    console.log('📱 [AGGRESSIVE] Iniciando monitoramento Samsung Health...');
    const syncSamsungHealth = async () => {
      try {
        const result = await SamsungHealthService.syncSamsungHealthData(1);
        if (result.success && result.totalRecords > 0) {
          console.log('📊 [AGGRESSIVE] Dados Samsung Health sincronizados');
          // Get latest data
          const dataResult = await SamsungHealthService.getSmartwatchData(1);
          if (dataResult.success && dataResult.data.length > 0) {
            this.processSamsungHealthData(dataResult.data[0]);
          }
        }
      } catch (error) {
        console.log('⚠️ [AGGRESSIVE] Erro no monitoramento Samsung Health:', error.message);
      }
    };
    // Sync every 45 seconds
    syncSamsungHealth(); // Initial call
    setInterval(syncSamsungHealth, 45000);
  }

  /**
   * Process Samsung Health data
   */
  processSamsungHealthData(data) {
    try {
      if (data && data.data && typeof data.data === 'object') {
        if (typeof data.data.heart_rate === 'number' && data.data.heart_rate > 0) {
          this.handleRealTimeData('heartRate', data.data.heart_rate, 'SAMSUNG_HEALTH');
        }
        if (typeof data.data.steps === 'number' && data.data.steps >= 0) {
          this.handleRealTimeData('steps', data.data.steps, 'SAMSUNG_HEALTH');
        }
        if (typeof data.data.calories_active === 'number' && data.data.calories_active > 0) {
          this.handleRealTimeData('calories', data.data.calories_active, 'SAMSUNG_HEALTH');
        }
        if (typeof data.data.distance === 'number' && data.data.distance > 0) {
          this.handleRealTimeData('distance', data.data.distance, 'SAMSUNG_HEALTH');
        }
      }
    } catch (error) {
      console.error('❌ [AGGRESSIVE] Erro ao processar dados Samsung Health:', error.message);
    }
  }

  /**
   * Handle real-time data from Samsung Health
   */
  handleRealTimeData(dataType, value, source) {
    try {
      const timestamp = new Date().toISOString();
      console.log(`📊 [AGGRESSIVE] ${dataType}: ${value} (${source})`);
      this.lastRealData[dataType] = value;
      this.lastRealData.timestamp = timestamp;
      this.saveAggressiveData(dataType, value, source);
      if (this.dataCallbacks[dataType]) {
        this.dataCallbacks[dataType](value, source);
      }
      if (this.dataCallbacks.onAnyData) {
        this.dataCallbacks.onAnyData({ dataType, value, source, timestamp });
      }
    } catch (error) {
      console.error('❌ [AGGRESSIVE] Erro ao processar dados:', error);
    }
  }

  /**
   * Save data to database with source tracking (explicit columns)
   */
  async saveAggressiveData(dataType, value, source) {
    try {
      const userData = DataUser.getUserData();
      if (!userData?.id) return;
      const userId = this.generateUserUUID(userData.id);
      const now = new Date().toISOString();
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
        source: `aggressive_${source.toLowerCase()}`,
        device_name: `Real-time ${source}`,
        collected_at: now,
        [column]: value
      };
      const { error } = await supabase
        .from('smartwatch_data')
        .insert([record]);
      if (error) {
        console.error('❌ [AGGRESSIVE] Erro ao salvar dados:', error);
      }
    } catch (error) {
      console.error('❌ [AGGRESSIVE] Erro ao salvar dados:', error);
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
   * Set data callback
   */
  setDataCallback(dataType, callback) {
    this.dataCallbacks[dataType] = callback;
  }

  /**
   * Get current real-time data
   */
  getCurrentData() {
    return {
      ...this.lastRealData,
      isActive: this.isActive,
      sources: this.dataSources
    };
  }

  /**
   * Get data collection status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      sources: this.dataSources,
      lastData: this.lastRealData
    };
  }

  /**
   * Stop data collection
   */
  async stopDataCollection() {
    try {
      console.log('🛑 [AGGRESSIVE] Parando coleta de dados...');
      this.isActive = false;
      console.log('✅ [AGGRESSIVE] Coleta de dados parada');
      return { success: true };
    } catch (error) {
      console.error('❌ [AGGRESSIVE] Erro ao parar coleta:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new AggressiveHealthDataService(); 