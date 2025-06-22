// Huawei Health Kit Integration Service
// This service uses Huawei's official Health Kit API to access health data
// from the Huawei Health app (not direct sensor access)

import { NativeModules, DeviceEventEmitter } from 'react-native';

class HuaweiHealthKitService {
  constructor() {
    this.isInitialized = false;
    this.subscribers = new Map();
  }

  /**
   * Initialize Huawei Health Kit
   * Requires Huawei Health app to be installed and user authorization
   */
  async initialize() {
    try {
      console.log('🔵 Inicializando Huawei Health Kit...');

      // Check if Huawei Health Kit is available
      if (!NativeModules.HuaweiHealthKit) {
        throw new Error('Huawei Health Kit não está disponível neste dispositivo');
      }

      // Request permissions
      const permissions = [
        'https://www.huawei.com/healthkit/heartrate.read',
        'https://www.huawei.com/healthkit/step.read',
        'https://www.huawei.com/healthkit/activity.read',
        'https://www.huawei.com/healthkit/sleep.read',
        'https://www.huawei.com/healthkit/bodyweight.read',
      ];

      const result = await NativeModules.HuaweiHealthKit.requestAuthorization(permissions);
      
      if (result.success) {
        this.isInitialized = true;
        console.log('✅ Huawei Health Kit inicializado com sucesso');
        return { success: true, message: 'Conectado ao Huawei Health' };
      } else {
        throw new Error(result.error || 'Autorização negada');
      }

    } catch (error) {
      console.error('❌ Erro ao inicializar Huawei Health Kit:', error);
      return { 
        success: false, 
        message: `Erro de inicialização: ${error.message}`,
        isHuaweiLimitation: true
      };
    }
  }

  /**
   * Get latest heart rate from Huawei Health app
   */
  async getHeartRate() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const endTime = Date.now();
      const startTime = endTime - (24 * 60 * 60 * 1000); // Last 24 hours

      const result = await NativeModules.HuaweiHealthKit.readData({
        dataType: 'heartrate',
        startTime,
        endTime,
        limit: 1
      });

      if (result.success && result.data.length > 0) {
        const heartRate = result.data[0].value;
        console.log(`💓 Frequência cardíaca (Huawei Health): ${heartRate} bpm`);
        return heartRate;
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao obter frequência cardíaca:', error);
      return null;
    }
  }

  /**
   * Get today's steps from Huawei Health app
   */
  async getSteps() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startTime = today.getTime();
      const endTime = Date.now();

      const result = await NativeModules.HuaweiHealthKit.readData({
        dataType: 'steps',
        startTime,
        endTime
      });

      if (result.success && result.data.length > 0) {
        const totalSteps = result.data.reduce((sum, entry) => sum + entry.value, 0);
        console.log(`🚶 Passos hoje (Huawei Health): ${totalSteps}`);
        return totalSteps;
      }

      return 0;
    } catch (error) {
      console.error('❌ Erro ao obter passos:', error);
      return 0;
    }
  }

  /**
   * Get sleep data from Huawei Health app
   */
  async getSleepData() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(18, 0, 0, 0); // Start from 6 PM yesterday
      
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Until 12 PM today

      const result = await NativeModules.HuaweiHealthKit.readData({
        dataType: 'sleep',
        startTime: yesterday.getTime(),
        endTime: today.getTime()
      });

      if (result.success && result.data.length > 0) {
        const sleepData = result.data[0];
        console.log('😴 Dados do sono (Huawei Health):', sleepData);
        return {
          duration: sleepData.duration || 0,
          quality: sleepData.quality || 'unknown',
          deepSleep: sleepData.deepSleep || 0,
          lightSleep: sleepData.lightSleep || 0
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Erro ao obter dados do sono:', error);
      return null;
    }
  }

  /**
   * Check if Huawei Health app is installed and accessible
   */
  async checkHuaweiHealthStatus() {
    try {
      const result = await NativeModules.HuaweiHealthKit.checkHealthAppStatus();
      return {
        isInstalled: result.isInstalled,
        version: result.version,
        isSupported: result.isSupported,
        recommendation: result.isInstalled ? 
          'App Huawei Health detectado. Você pode usar a integração via Health Kit.' :
          'Instale o app Huawei Health para usar esta funcionalidade.'
      };
    } catch (error) {
      return {
        isInstalled: false,
        version: null,
        isSupported: false,
        recommendation: 'Instale o app Huawei Health da AppGallery para usar dados de saúde.'
      };
    }
  }

  /**
   * Get comprehensive health data summary
   */
  async getHealthSummary() {
    try {
      const [heartRate, steps, sleepData] = await Promise.all([
        this.getHeartRate(),
        this.getSteps(),
        this.getSleepData()
      ]);

      return {
        timestamp: new Date().toISOString(),
        source: 'Huawei Health Kit',
        data: {
          heartRate: heartRate || 0,
          steps: steps || 0,
          sleep: sleepData,
          battery: null, // Not available via Health Kit
          temperature: null, // Not available via Health Kit
          bloodPressure: null, // Would need additional permissions
          spO2: null // Would need additional permissions
        },
        limitations: [
          'Dados baseados no histórico do app Huawei Health',
          'Não há acesso em tempo real aos sensores',
          'Depende da sincronização do dispositivo wearable com o app'
        ]
      };
    } catch (error) {
      console.error('❌ Erro ao obter resumo de saúde:', error);
      return null;
    }
  }

  /**
   * Open Huawei Health app for manual data sync
   */
  async openHuaweiHealthApp() {
    try {
      const result = await NativeModules.HuaweiHealthKit.openHealthApp();
      return result.success;
    } catch (error) {
      console.error('❌ Erro ao abrir Huawei Health:', error);
      return false;
    }
  }

  /**
   * Show instructions for manual data export
   */
  getManualExportInstructions() {
    return {
      title: '📱 Como exportar dados do Huawei Health',
      steps: [
        '1. Abra o app Huawei Health',
        '2. Vá para "Eu" > "Configurações"',
        '3. Selecione "Conta e privacidade"',
        '4. Toque em "Exportar dados"',
        '5. Escolha o período e tipos de dados',
        '6. Exporte como arquivo CSV/JSON',
        '7. Importe o arquivo no nosso app'
      ],
      note: 'Esta é a única forma 100% confiável de obter dados completos do Huawei Watch.',
      videoUrl: 'https://example.com/huawei-export-tutorial' // Placeholder
    };
  }
}

export default new HuaweiHealthKitService(); 