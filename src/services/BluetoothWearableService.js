// Bluetooth Wearable Service - Direct connection to Samsung wearables
// REAL-TIME DATA via BLE

import { BleManager, Characteristic } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

// Samsung Health and Generic BLE UUIDs
const HEALTH_SERVICE_UUIDS = {
  HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
  BATTERY: '0000180f-0000-1000-8000-00805f9b34fb',
  DEVICE_INFO: '0000180a-0000-1000-8000-00805f9b34fb',
  FITNESS_MACHINE: '00001826-0000-1000-8000-00805f9b34fb',
  CYCLING_POWER: '00001818-0000-1000-8000-00805f9b34fb',
  RUNNING_SPEED: '00001814-0000-1000-8000-00805f9b34fb',
  // Samsung specific UUIDs (reverse engineered)
  SAMSUNG_HEALTH: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  SAMSUNG_SENSOR: '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
};

const CHARACTERISTICS = {
  HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
  BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
  DEVICE_NAME: '00002a00-0000-1000-8000-00805f9b34fb',
  MANUFACTURER_NAME: '00002a29-0000-1000-8000-00805f9b34fb',
  // Samsung specific characteristics
  SAMSUNG_DATA: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  SAMSUNG_NOTIFY: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
};

class BluetoothWearableService {
  constructor() {
    this.manager = new BleManager();
    this.connectedDevice = null;
    this.scanSubscription = null;
    this.isScanning = false;
    this.dataCallbacks = {};
    this.connectionState = 'disconnected';
    this.lastHeartRate = null;
    this.lastSteps = null;
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  /**
   * Initialize Bluetooth LE with detailed permission checks
   */
  async initialize() {
    try {
      console.log('🔵 [BLE] Inicializando Bluetooth Low Energy...');
      // Check permissions
      const permissions = [
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.ACCESS_FINE_LOCATION',
      ];
      const missing = [];
      for (const perm of permissions) {
        const granted = await this.checkPermission(perm);
        if (!granted) missing.push(perm);
      }
      if (missing.length > 0) {
        console.error('❌ [BLE] Permissões Bluetooth negadas:', missing);
        alert('Permissões Bluetooth necessárias foram negadas.\n\nVá em Configurações > Apps > HealthMate > Permissões e ative:\n- Bluetooth\n- Localização\n\nDepois, reinicie o app.');
        throw new Error('Permissões Bluetooth necessárias foram negadas');
      }

      // Verificar estado do Bluetooth
      const bluetoothState = await this.manager.state();
      console.log(`🔵 [BLE] Estado do Bluetooth: ${bluetoothState}`);

      if (bluetoothState !== 'PoweredOn') {
        throw new Error('Bluetooth não está ativo. Ative o Bluetooth e tente novamente.');
      }

      // Configurar listener de estado
      this.manager.onStateChange((state) => {
        console.log(`🔵 [BLE] Mudança de estado: ${state}`);
        if (state === 'PoweredOff') {
          this.connectionState = 'disconnected';
          this.connectedDevice = null;
        }
      });

      console.log('✅ [BLE] Bluetooth inicializado com sucesso');
      return { success: true };

      } catch (error) {
      console.error('❌ [BLE] Erro na inicialização:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request Android BLE permissions
   */
  async requestAndroidPermissions() {
    try {
      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
      ];

      const results = await PermissionsAndroid.requestMultiple(permissions);
      
      const allGranted = Object.values(results).every(
        result => result === PermissionsAndroid.RESULTS.GRANTED
      );

      console.log(`🔵 [BLE] Permissões Android: ${allGranted ? 'Concedidas' : 'Algumas negadas'}`);
      return allGranted;

    } catch (error) {
      console.error('❌ [BLE] Erro ao solicitar permissões:', error);
      return false;
    }
  }

  /**
   * Scan for Samsung wearables and health devices
   */
  async scanForWearables(timeoutSeconds = 30) {
    try {
      console.log('🔍 [BLE] Iniciando escaneamento de wearables Samsung...');
      
      if (this.isScanning) {
        console.log('⚠️ [BLE] Escaneamento já em progresso');
        return { success: false, error: 'Escaneamento já em progresso' };
      }

      this.isScanning = true;
      const foundDevices = [];

      // Samsung device name patterns
      const samsungPatterns = [
        'Galaxy Watch',
        'Galaxy Buds',
        'SM-R',
        'Galaxy Fit',
        'Gear',
        'Samsung',
        'Watch'
      ];

      const scanPromise = new Promise((resolve, reject) => {
        this.scanSubscription = this.manager.startDeviceScan(
          null, // Scan for all services
          { allowDuplicates: false },
          (error, device) => {
            if (error) {
              console.error('❌ [BLE] Erro no scan:', error);
              reject(error);
              return;
            }

            if (device && device.name) {
              const isSamsung = samsungPatterns.some(pattern => 
                device.name.toLowerCase().includes(pattern.toLowerCase())
              );

              if (isSamsung || device.name.toLowerCase().includes('health')) {
                console.log(`📱 [BLE] Dispositivo Samsung encontrado: ${device.name} (${device.id})`);
                foundDevices.push({
                  id: device.id,
                  name: device.name,
                  rssi: device.rssi,
                  services: device.serviceUUIDs || [],
                  manufacturerData: device.manufacturerData,
                  isSamsung: isSamsung
                });
              }
            }
          }
        );

        // Timeout do scan
        setTimeout(() => {
          this.stopScan();
          resolve(foundDevices);
        }, timeoutSeconds * 1000);
      });

      const devices = await scanPromise;
      
      console.log(`✅ [BLE] Escaneamento completo. ${devices.length} dispositivos Samsung encontrados`);
      return { success: true, devices };

    } catch (error) {
      console.error('❌ [BLE] Erro no escaneamento:', error);
      this.stopScan();
      return { success: false, error: error.message, devices: [] };
    }
  }

  /**
   * Stop BLE scan
   */
  stopScan() {
    if (this.scanSubscription) {
      this.manager.stopDeviceScan();
      this.scanSubscription = null;
    }
    this.isScanning = false;
    console.log('🛑 [BLE] Escaneamento interrompido');
  }

  /**
   * Connect to a Samsung wearable device
   */
  async connectToDevice(deviceId) {
    try {
      console.log(`🔗 [BLE] Conectando ao dispositivo: ${deviceId}`);
      this.connectionState = 'connecting';

      // Conectar ao dispositivo
      const device = await this.manager.connectToDevice(deviceId);
      console.log(`✅ [BLE] Conectado ao dispositivo: ${device.name}`);
      
      // Descobrir serviços
      const deviceWithServices = await device.discoverAllServicesAndCharacteristics();
      this.connectedDevice = deviceWithServices;
      this.connectionState = 'connected';

      // Listar serviços disponíveis
      await this.discoverServices(deviceWithServices);

      // Configurar monitoramento de dados
      await this.setupDataMonitoring(deviceWithServices);

      // Configurar callback de desconexão
      device.onDisconnected((error, disconnectedDevice) => {
        console.log(`🔌 [BLE] Dispositivo desconectado: ${disconnectedDevice?.name}`);
        this.connectionState = 'disconnected';
        this.connectedDevice = null;
        
        // Tentar reconectar se não foi intencional
        if (error && this.retryCount < this.maxRetries) {
          this.retryCount++;
          console.log(`🔄 [BLE] Tentando reconectar (${this.retryCount}/${this.maxRetries})...`);
          setTimeout(() => this.connectToDevice(deviceId), 5000);
        }
      });

      this.retryCount = 0; // Reset retry count on successful connection
      
      return {
        success: true,
        device: {
          id: device.id,
          name: device.name,
          rssi: device.rssi
        }
      };
      
    } catch (error) {
      console.error('❌ [BLE] Erro na conexão:', error);
      this.connectionState = 'disconnected';
      return { success: false, error: error.message };
    }
  }

  /**
   * Discover and log available services
   */
  async discoverServices(device) {
    try {
      console.log('🔍 [BLE] Descobrindo serviços disponíveis...');
      
      const services = await device.services();
      
      for (const service of services) {
        console.log(`📋 [BLE] Serviço encontrado: ${service.uuid}`);
        
        try {
          const characteristics = await service.characteristics();
          for (const char of characteristics) {
            console.log(`  📄 Característica: ${char.uuid} (Propriedades: ${char.isReadable ? 'R' : ''}${char.isWritable ? 'W' : ''}${char.isNotifiable ? 'N' : ''})`);
          }
        } catch (charError) {
          console.log(`  ⚠️ Erro ao ler características: ${charError.message}`);
        }
      }

    } catch (error) {
      console.error('❌ [BLE] Erro ao descobrir serviços:', error);
    }
  }

  /**
   * Setup real-time data monitoring
   */
  async setupDataMonitoring(device) {
    try {
      console.log('📊 [BLE] Configurando monitoramento de dados em tempo real...');

      // Monitor Heart Rate
      await this.monitorHeartRate(device);
      
      // Monitor Battery Level
      await this.monitorBattery(device);

      // Monitor Samsung specific data
      await this.monitorSamsungData(device);

      console.log('✅ [BLE] Monitoramento de dados configurado');

    } catch (error) {
      console.error('❌ [BLE] Erro ao configurar monitoramento:', error);
    }
  }

  /**
   * Monitor heart rate data
   */
  async monitorHeartRate(device) {
    try {
      const heartRateChar = await device.characteristicForService(
        HEALTH_SERVICE_UUIDS.HEART_RATE,
        CHARACTERISTICS.HEART_RATE_MEASUREMENT
      );

      if (heartRateChar && heartRateChar.isNotifiable) {
        console.log('❤️ [BLE] Iniciando monitoramento de frequência cardíaca...');

        await device.monitorCharacteristicForService(
          HEALTH_SERVICE_UUIDS.HEART_RATE,
          CHARACTERISTICS.HEART_RATE_MEASUREMENT,
          (error, characteristic) => {
            if (error) {
              console.error('❌ [BLE] Erro no monitoramento de FC:', error);
              return;
            }

            if (characteristic?.value) {
              const heartRate = this.parseHeartRateData(characteristic.value);
              if (heartRate) {
                this.lastHeartRate = heartRate;
                console.log(`💓 [BLE] Frequência cardíaca: ${heartRate} bpm`);
                this.saveRealTimeData('heartRate', heartRate);
                
                // Callback para UI
                if (this.dataCallbacks.heartRate) {
                  this.dataCallbacks.heartRate(heartRate);
                }
              }
            }
          }
        );
      }

    } catch (error) {
      console.log(`⚠️ [BLE] Serviço de FC não disponível: ${error.message}`);
    }
  }

  /**
   * Monitor battery level
   */
  async monitorBattery(device) {
    try {
      const batteryChar = await device.characteristicForService(
        HEALTH_SERVICE_UUIDS.BATTERY,
        CHARACTERISTICS.BATTERY_LEVEL
      );

      if (batteryChar && batteryChar.isReadable) {
        console.log('🔋 [BLE] Lendo nível de bateria...');

        const batteryData = await batteryChar.read();
        if (batteryData?.value) {
          const batteryLevel = this.parseBatteryData(batteryData.value);
          console.log(`🔋 [BLE] Bateria: ${batteryLevel}%`);
          
          if (this.dataCallbacks.battery) {
            this.dataCallbacks.battery(batteryLevel);
          }
        }
      }

    } catch (error) {
      console.log(`⚠️ [BLE] Serviço de bateria não disponível: ${error.message}`);
    }
  }

  /**
   * Monitor Samsung specific data
   */
  async monitorSamsungData(device) {
    try {
      // Try Samsung specific services
      const samsungServices = [
        HEALTH_SERVICE_UUIDS.SAMSUNG_HEALTH,
        HEALTH_SERVICE_UUIDS.SAMSUNG_SENSOR
      ];

      for (const serviceUUID of samsungServices) {
        try {
          await device.monitorCharacteristicForService(
            serviceUUID,
            CHARACTERISTICS.SAMSUNG_NOTIFY,
            (error, characteristic) => {
              if (error) {
                console.log(`⚠️ [BLE] Erro Samsung service ${serviceUUID}: ${error.message}`);
                return;
              }

              if (characteristic?.value) {
                console.log(`📊 [BLE] Dados Samsung recebidos: ${characteristic.value}`);
                this.parseSamsungData(characteristic.value);
              }
            }
          );

          console.log(`✅ [BLE] Monitoramento Samsung ${serviceUUID} configurado`);

        } catch (serviceError) {
          console.log(`⚠️ [BLE] Samsung service ${serviceUUID} não disponível`);
        }
      }

    } catch (error) {
      console.log(`⚠️ [BLE] Serviços Samsung não disponíveis: ${error.message}`);
    }
  }

  /**
   * Parse heart rate data from BLE characteristic
   */
  parseHeartRateData(base64Value) {
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Value, 'base64');
      
      // Heart Rate Measurement format (Bluetooth spec)
      // Byte 0: Flags
      // Byte 1-2: Heart Rate Value (uint16 or uint8)
      
      const flags = buffer[0];
      const hrFormat = flags & 0x01; // 0 = uint8, 1 = uint16
      
      let heartRate;
      if (hrFormat === 0) {
        // 8-bit heart rate
        heartRate = buffer[1];
      } else {
        // 16-bit heart rate (little endian)
        heartRate = buffer[1] | (buffer[2] << 8);
      }

      // Validate reasonable heart rate range
      if (heartRate >= 30 && heartRate <= 220) {
        return heartRate;
      }
      
      return null;

    } catch (error) {
      console.error('❌ [BLE] Erro ao parsear dados de FC:', error);
      return null;
    }
  }

  /**
   * Parse battery data
   */
  parseBatteryData(base64Value) {
    try {
      const buffer = Buffer.from(base64Value, 'base64');
      const batteryLevel = buffer[0]; // Battery level is usually a single byte (0-100)
      
      if (batteryLevel >= 0 && batteryLevel <= 100) {
        return batteryLevel;
      }
      
      return null;

    } catch (error) {
      console.error('❌ [BLE] Erro ao parsear dados de bateria:', error);
      return null;
    }
  }

  /**
   * Parse Samsung specific data
   */
  parseSamsungData(base64Value) {
    try {
      const buffer = Buffer.from(base64Value, 'base64');
      console.log(`📊 [BLE] Dados Samsung (hex): ${buffer.toString('hex')}`);
      
      // Samsung data parsing would require reverse engineering
      // For now, log the raw data for analysis
      
      // Try to extract steps if it's a step counter notification
      if (buffer.length >= 4) {
        const possibleSteps = buffer.readUInt32LE(0);
        if (possibleSteps > 0 && possibleSteps < 100000) {
          console.log(`🚶 [BLE] Possíveis passos: ${possibleSteps}`);
          this.lastSteps = possibleSteps;
          this.saveRealTimeData('steps', possibleSteps);
          
          if (this.dataCallbacks.steps) {
            this.dataCallbacks.steps(possibleSteps);
          }
        }
      }

    } catch (error) {
      console.error('❌ [BLE] Erro ao parsear dados Samsung:', error);
    }
  }

  /**
   * Save real-time data to database (explicit columns)
   */
  async saveRealTimeData(dataType, value) {
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
        source: 'bluetooth_wearable',
        device_name: this.connectedDevice?.name || 'Samsung Wearable',
        collected_at: now,
        [column]: value
      };

      const { error } = await supabase
        .from('smartwatch_data')
        .insert([record]);

      if (error) {
        console.error('❌ [BLE] Erro ao salvar dados:', error);
      } else {
        console.log(`✅ [BLE] Dados salvos: ${dataType} = ${value}`);
      }

    } catch (error) {
      console.error('❌ [BLE] Erro ao salvar dados BLE:', error);
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
   * Get connection status
   */
  getConnectionStatus() {
    return {
      state: this.connectionState,
      device: this.connectedDevice ? {
        id: this.connectedDevice.id,
        name: this.connectedDevice.name
      } : null,
      lastData: {
        heartRate: this.lastHeartRate,
        steps: this.lastSteps
      }
    };
  }

  /**
   * Disconnect from current device
   */
  async disconnect() {
    try {
      if (this.connectedDevice) {
        console.log(`🔌 [BLE] Desconectando de ${this.connectedDevice.name}...`);
        await this.connectedDevice.cancelConnection();
        this.connectedDevice = null;
        this.connectionState = 'disconnected';
        console.log('✅ [BLE] Desconectado com sucesso');
      }
      
      this.stopScan();
      
      return { success: true };

    } catch (error) {
      console.error('❌ [BLE] Erro ao desconectar:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get latest real-time data
   */
  getLatestData() {
    return {
      heartRate: this.lastHeartRate,
      steps: this.lastSteps,
      timestamp: new Date().toISOString(),
      connected: this.connectionState === 'connected',
      deviceName: this.connectedDevice?.name
    };
  }

  /**
   * Destroy BLE manager
   */
  destroy() {
    this.disconnect();
    if (this.manager) {
      this.manager.destroy();
    }
  }
}

export default new BluetoothWearableService(); 