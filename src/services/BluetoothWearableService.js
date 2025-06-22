import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import supabase from '../../supabase';

class BluetoothWearableService {
  constructor() {
    this.manager = new BleManager();
    this.connectedDevice = null;
    this.scanSubscription = null;
    this.monitoringSubscriptions = [];
    
    // Standard Bluetooth GATT service UUIDs for health data
    this.SERVICES = {
      HEART_RATE: '0000180d-0000-1000-8000-00805f9b34fb',
      BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
      DEVICE_INFORMATION: '0000180a-0000-1000-8000-00805f9b34fb',
      FITNESS_MACHINE: '00001826-0000-1000-8000-00805f9b34fb',
      HEALTH_THERMOMETER: '00001809-0000-1000-8000-00805f9b34fb',
      BLOOD_PRESSURE: '00001810-0000-1000-8000-00805f9b34fb',
      GLUCOSE: '00001808-0000-1000-8000-00805f9b34fb',
      PULSE_OXIMETER: '00001822-0000-1000-8000-00805f9b34fb',
      WEIGHT_SCALE: '0000181d-0000-1000-8000-00805f9b34fb'
    };
    
    // Standard characteristic UUIDs
    this.CHARACTERISTICS = {
      HEART_RATE_MEASUREMENT: '00002a37-0000-1000-8000-00805f9b34fb',
      BATTERY_LEVEL: '00002a19-0000-1000-8000-00805f9b34fb',
      DEVICE_NAME: '00002a00-0000-1000-8000-00805f9b34fb',
      MANUFACTURER_NAME: '00002a29-0000-1000-8000-00805f9b34fb',
      STEP_COUNT: '00002a55-0000-1000-8000-00805f9b34fb',
      TEMPERATURE_MEASUREMENT: '00002a1c-0000-1000-8000-00805f9b34fb',
      BLOOD_PRESSURE_MEASUREMENT: '00002a35-0000-1000-8000-00805f9b34fb',
      GLUCOSE_MEASUREMENT: '00002a18-0000-1000-8000-00805f9b34fb',
      PULSE_OXIMETRY_MEASUREMENT: '00002a5f-0000-1000-8000-00805f9b34fb',
      WEIGHT_MEASUREMENT: '00002a9d-0000-1000-8000-00805f9b34fb'
    };
  }

  // Request necessary permissions for Bluetooth
  async requestPermissions() {
    if (Platform.OS === 'android') {
      console.log('📱 Requesting Android Bluetooth permissions...');
      
      try {
        // Check Android version to determine which permissions to request
        const androidVersion = Platform.Version;
        console.log(`📱 Android version: ${androidVersion}`);
        
        let permissions = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ];

        // Add Bluetooth permissions for older Android versions
        if (androidVersion < 31) {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN
          );
        } else {
          // Android 12+ permissions (required for BLE operations)
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
          );
        }

        // Optional permissions (we'll request but won't fail if denied)
        const optionalPermissions = [];
        if (androidVersion >= 31) {
          optionalPermissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE);
        }

        console.log('📝 Requesting required permissions:', permissions);
        console.log('📝 Optional permissions:', optionalPermissions);

        // Request required permissions first
        const results = {};
        for (const permission of permissions) {
          try {
            const result = await PermissionsAndroid.request(permission, {
              title: 'Bluetooth Permission Required',
              message: 'This app needs Bluetooth permissions to connect to your wearable devices.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            });
            
            results[permission] = result;
            console.log(`✅ Required permission ${permission}: ${result}`);
          } catch (error) {
            console.error(`❌ Error requesting ${permission}:`, error);
            results[permission] = PermissionsAndroid.RESULTS.DENIED;
          }
        }

        // Request optional permissions (won't fail if denied)
        const optionalResults = {};
        for (const permission of optionalPermissions) {
          try {
            const result = await PermissionsAndroid.request(permission, {
              title: 'Optional Bluetooth Permission',
              message: 'This permission enhances Bluetooth functionality (optional).',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Skip',
              buttonPositive: 'OK',
            });
            
            optionalResults[permission] = result;
            console.log(`📋 Optional permission ${permission}: ${result}`);
          } catch (error) {
            console.log(`⚠️ Optional permission ${permission} failed:`, error.message);
            optionalResults[permission] = PermissionsAndroid.RESULTS.DENIED;
          }
        }

        // Check if all REQUIRED permissions are granted
        const requiredGranted = Object.entries(results).every(([permission, result]) => {
          const isGranted = result === PermissionsAndroid.RESULTS.GRANTED;
          if (!isGranted) {
            console.log(`❌ Required permission not granted: ${permission} (${result})`);
          }
          return isGranted;
        });

        // Log optional permissions status (but don't fail)
        Object.entries(optionalResults).forEach(([permission, result]) => {
          const isGranted = result === PermissionsAndroid.RESULTS.GRANTED;
          console.log(`📋 Optional permission ${permission}: ${isGranted ? 'Granted' : 'Denied (OK)'}`);
        });

        if (requiredGranted) {
          console.log('✅ All required Bluetooth permissions granted');
        } else {
          console.log('❌ Some required Bluetooth permissions were denied');
        }

        return requiredGranted;
      } catch (error) {
        console.error('❌ Error in permission request process:', error);
        return false;
      }
    }
    return true; // iOS
  }

  // Check current permission status
  async checkPermissionStatus() {
    if (Platform.OS === 'android') {
      const androidVersion = Platform.Version;
      let requiredPermissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      let optionalPermissions = [];

      if (androidVersion < 31) {
        requiredPermissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADMIN
        );
      } else {
        requiredPermissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
        );
        optionalPermissions.push(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        );
      }

      const status = {
        required: {},
        optional: {},
        allRequiredGranted: true
      };

      // Check required permissions
      for (const permission of requiredPermissions) {
        const granted = await PermissionsAndroid.check(permission);
        status.required[permission] = granted;
        if (!granted) {
          status.allRequiredGranted = false;
        }
      }

      // Check optional permissions
      for (const permission of optionalPermissions) {
        status.optional[permission] = await PermissionsAndroid.check(permission);
      }

      return status;
    }
    return { allRequiredGranted: true }; // iOS doesn't need runtime permissions for Bluetooth
  }

  // Initialize BLE manager and check permissions
  async initialize() {
    try {
      console.log('🔧 Initializing Bluetooth Manager...');
      
      // Check current permission status first
      const permissionStatus = await this.checkPermissionStatus();
      console.log('📋 Current permission status:', permissionStatus);
      
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        // Show detailed error about which required permissions are missing
        const missingPermissions = Object.entries(permissionStatus.required || {})
          .filter(([_, granted]) => !granted)
          .map(([permission, _]) => permission.split('.').pop()); // Get just the permission name
        
        throw new Error(`Required Bluetooth permissions not granted. Missing: ${missingPermissions.join(', ')}`);
      }

      console.log('🔍 Checking Bluetooth state...');
      const state = await this.manager.state();
      console.log(`📡 Bluetooth state: ${state}`);
      
      if (state !== 'PoweredOn') {
        if (state === 'PoweredOff') {
          throw new Error('Bluetooth is turned off. Please enable Bluetooth in your device settings.');
        } else if (state === 'Unauthorized') {
          throw new Error('Bluetooth access is not authorized. Please check app permissions.');
        } else if (state === 'Unsupported') {
          throw new Error('This device does not support Bluetooth Low Energy.');
        } else {
          throw new Error(`Bluetooth is not ready. Current state: ${state}. Please check your Bluetooth settings.`);
        }
      }

      console.log('✅ Bluetooth Manager initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Bluetooth Manager:', error);
      throw error;
    }
  }

  // Scan for nearby wearable devices
  async scanForWearableDevices() {
    try {
      await this.initialize();
      
      const discoveredDevices = new Map();
      const wearableDevices = [];

      console.log('🔍 Starting scan for wearable devices...');

      return new Promise((resolve, reject) => {
        // Set timeout for scan
        const scanTimeout = setTimeout(() => {
          this.stopScan();
          console.log(`🔍 Scan completed. Found ${wearableDevices.length} wearable devices`);
          resolve(wearableDevices);
        }, 15000); // 15 second scan

        this.scanSubscription = this.manager.startDeviceScan(
          null, // Scan for all devices
          { allowDuplicates: false },
          (error, device) => {
            if (error) {
              clearTimeout(scanTimeout);
              console.error('❌ Scan error:', error);
              reject(error);
              return;
            }

            if (device && device.name && !discoveredDevices.has(device.id)) {
              discoveredDevices.set(device.id, true);
              
              // Filter for potential wearable devices
              if (this.isWearableDevice(device)) {
                const wearableInfo = {
                  id: device.id,
                  name: device.name,
                  rssi: device.rssi,
                  serviceUUIDs: device.serviceUUIDs || [],
                  manufacturerData: device.manufacturerData,
                  isConnectable: device.isConnectable,
                  brand: this.identifyBrand(device)
                };
                
                wearableDevices.push(wearableInfo);
                console.log(`📱 Found wearable: ${device.name} (${wearableInfo.brand})`);
              }
            }
          }
        );
      });
    } catch (error) {
      console.error('❌ Error scanning for devices:', error);
      throw error;
    }
  }

  // Identify if device is likely a wearable (including incompatible ones)
  isWearableDevice(device) {
    if (!device.name) return false;
    
    const name = device.name.toLowerCase();
    const serviceUUIDs = device.serviceUUIDs || [];
    
    // Check for wearable keywords in device name (including Huawei specific)
    const wearableKeywords = [
      'watch', 'band', 'fit', 'health', 'heart', 'step', 'sport', 
      'track', 'wear', 'galaxy', 'apple', 'amazfit', 'garmin', 
      'fitbit', 'huawei', 'samsung', 'xiaomi', 'polar', 'suunto',
      'withings', 'fossil', 'ticwatch', 'versa', 'charge', 'ionic',
      'sense', 'inspire', 'alta', 'flex', 'surge', 'vivosmart',
      'forerunner', 'fenix', 'vivoactive', 'venu', 'approach',
      // Huawei specific keywords
      'gt 2', 'gt2', 'gt 3', 'gt3', 'watch gt', 'honor band'
    ];
    
    const hasWearableKeyword = wearableKeywords.some(keyword => 
      name.includes(keyword)
    );
    
    // Check for health-related BLE services
    const hasHealthService = serviceUUIDs.some(uuid => 
      Object.values(this.SERVICES).includes(uuid.toLowerCase())
    );
    
    // Always include Huawei devices even without standard services
    const isHuaweiWearable = this.identifyBrand(device) === 'Huawei';
    
    return hasWearableKeyword || hasHealthService || isHuaweiWearable;
  }

  // Identify device brand with enhanced Huawei detection
  identifyBrand(device) {
    if (!device.name) return 'Unknown';
    
    const name = device.name.toLowerCase();
    const manufacturerData = device.manufacturerData;
    
    // Enhanced Huawei detection
    if (name.includes('huawei') || 
        name.includes('watch gt') || 
        name.includes('gt 2') || 
        name.includes('gt2') ||
        name.includes('gt 3') ||
        name.includes('gt3') ||
        name.includes('honor') ||
        name.includes('band') && name.includes('huawei')) {
      return 'Huawei';
    }
    
    // Check manufacturer data for Huawei identifiers
    if (manufacturerData) {
      const hexData = manufacturerData.toLowerCase();
      // Huawei company identifier in manufacturer data
      if (hexData.includes('4c00') || hexData.includes('72000')) {
        return 'Huawei';
      }
    }
    
    if (name.includes('apple') || name.includes('watch')) return 'Apple';
    if (name.includes('galaxy') || name.includes('samsung')) return 'Samsung';
    if (name.includes('amazfit')) return 'Amazfit';
    if (name.includes('fitbit')) return 'Fitbit';
    if (name.includes('garmin')) return 'Garmin';
    if (name.includes('xiaomi') || name.includes('mi band')) return 'Xiaomi';
    if (name.includes('polar')) return 'Polar';
    if (name.includes('suunto')) return 'Suunto';
    if (name.includes('withings')) return 'Withings';
    if (name.includes('fossil')) return 'Fossil';
    if (name.includes('ticwatch')) return 'TicWatch';
    
    return 'Unknown';
  }

  // Connect to a specific wearable device
  async connectToDevice(deviceId, deviceName) {
    try {
      console.log(`🔗 Attempting to connect to: ${deviceName}`);
      
      // Check if this is a Huawei device and try Health Kit integration
      const brand = this.identifyBrand({ name: deviceName });
      if (brand === 'Huawei') {
        console.log('🔍 Dispositivo Huawei detectado, tentando Health Kit...');
        
        try {
          // Try to import and use Huawei Health Kit service
          const HuaweiHealthKitService = require('./HuaweiHealthKitService').default;
          const healthKitResult = await HuaweiHealthKitService.initialize();
          
          if (healthKitResult.success) {
            console.log('✅ Conectado via Huawei Health Kit');
            
            // Create a virtual device representing Health Kit connection
            this.connectedDevice = {
              device: null, // No BLE device
              id: 'huawei-health-kit',
              name: 'Huawei Health Kit',
              brand: 'Huawei',
              connectedAt: new Date().toISOString(),
              connectionType: 'HEALTH_KIT',
              realDeviceName: deviceName
            };
            
            return {
              success: true,
              device: this.connectedDevice,
              availableServices: ['HEALTH_KIT_API'],
              healthServices: ['HEALTH_KIT_API'],
              connectionType: 'HEALTH_KIT',
              message: 'Conectado via Huawei Health Kit'
            };
          } else {
            throw new Error(`HUAWEI_HEALTH_KIT_FAILED: ${healthKitResult.message}`);
          }
        } catch (healthKitError) {
          console.log('❌ Falha no Health Kit:', healthKitError.message);
          
          // Fallback to alternative data source guide
          throw new Error(`HUAWEI_DEVICE_DETECTED: ${deviceName} é um dispositivo Huawei que usa protocolos proprietários. A conexão direta via Bluetooth não é possível. Tente: 1) Instalar/atualizar o app Huawei Health, 2) Usar a opção "Alternativas" para exportar dados manualmente.`);
        }
      }
      
      // Stop scanning if still active
      this.stopScan();
      
      // Connect to device
      const device = await this.manager.connectToDevice(deviceId);
      
      // Discover services and characteristics
      const deviceWithServices = await device.discoverAllServicesAndCharacteristics();
      
      this.connectedDevice = {
        device: deviceWithServices,
        id: deviceId,
        name: deviceName,
        brand: brand,
        connectedAt: new Date().toISOString()
      };
      
      console.log(`✅ Successfully connected to: ${deviceName}`);
      
      // Get available services
      const services = await deviceWithServices.services();
      const availableServices = services.map(service => service.uuid);
      
      console.log(`📋 Available services: ${availableServices.join(', ')}`);
      
      // Check if device has standard health services
      const healthServices = availableServices.filter(uuid => 
        Object.values(this.SERVICES).includes(uuid.toLowerCase())
      );
      
      if (healthServices.length === 0) {
        console.log('⚠️ No standard health services found on this device');
        // Don't throw error, but log for debugging
      }
      
      return {
        success: true,
        device: this.connectedDevice,
        availableServices,
        healthServices
      };
      
    } catch (error) {
      console.error(`❌ Failed to connect to ${deviceName}:`, error);
      throw error;
    }
  }

  // Read health data from connected device
  async readHealthData() {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      const healthData = {
        deviceName: this.connectedDevice.name,
        deviceBrand: this.connectedDevice.brand,
        timestamp: new Date().toISOString(),
        dataSource: this.connectedDevice.connectionType === 'HEALTH_KIT' ? 'huawei_health_kit' : 'real_device'
      };

      console.log('📊 Reading health data from device...');
      
      // Special handling for Huawei Health Kit connections
      if (this.connectedDevice.connectionType === 'HEALTH_KIT') {
        console.log('📱 Using Huawei Health Kit for data collection...');
        
        try {
          const HuaweiHealthKitService = require('./HuaweiHealthKitService').default;
          const healthSummary = await HuaweiHealthKitService.getHealthSummary();
          
          if (healthSummary && healthSummary.data) {
            // Map Health Kit data to our format
            healthData.heartRate = healthSummary.data.heartRate;
            healthData.steps = healthSummary.data.steps;
            healthData.sleepData = healthSummary.data.sleep;
            healthData.battery = null; // Not available via Health Kit
            healthData.temperature = null; // Not available via Health Kit
            healthData.limitations = healthSummary.limitations;
            
            console.log('✅ Health data from Huawei Health Kit:', healthData);
            return healthData;
          } else {
            throw new Error('Nenhum dado de saúde disponível no Huawei Health');
          }
        } catch (healthKitError) {
          console.error('❌ Erro ao ler dados do Health Kit:', healthKitError);
          throw new Error(`Falha ao obter dados do Huawei Health: ${healthKitError.message}`);
        }
      }
      
      // Standard BLE device data reading
      const dataPromises = [
        this.readHeartRate(),
        this.readBatteryLevel(),
        this.readStepCount(),
        this.readTemperature(),
        this.readBloodPressure(),
        this.readBloodOxygen(),
        this.readWeight()
      ];

      const results = await Promise.allSettled(dataPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          Object.assign(healthData, result.value);
        }
      });

      // Check if we got any actual data
      const dataKeys = Object.keys(healthData).filter(key => 
        !['deviceName', 'deviceBrand', 'timestamp', 'dataSource'].includes(key)
      );

      if (dataKeys.length === 0) {
        throw new Error('No health data could be read from the device. The device may not support standard health services or may require pairing with its official app first.');
      }

      console.log('✅ Health data read successfully:', healthData);
      return healthData;

    } catch (error) {
      console.error('❌ Error reading health data:', error);
      throw error;
    }
  }

  // Read heart rate data
  async readHeartRate() {
    try {
      const characteristic = await this.findCharacteristic(
        this.SERVICES.HEART_RATE, 
        this.CHARACTERISTICS.HEART_RATE_MEASUREMENT
      );
      
      if (!characteristic) return null;
      
      const data = await characteristic.read();
      const heartRate = this.parseHeartRateData(data.value);
      
      if (heartRate) {
        console.log(`❤️ Heart Rate: ${heartRate} bpm`);
        return { heartRate };
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Could not read heart rate:', error.message);
      return null;
    }
  }

  // Read battery level
  async readBatteryLevel() {
    try {
      const characteristic = await this.findCharacteristic(
        this.SERVICES.BATTERY_SERVICE,
        this.CHARACTERISTICS.BATTERY_LEVEL
      );
      
      if (!characteristic) return null;
      
      const data = await characteristic.read();
      const batteryLevel = this.parseBatteryData(data.value);
      
      if (batteryLevel !== null) {
        console.log(`🔋 Battery Level: ${batteryLevel}%`);
        return { batteryLevel };
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Could not read battery level:', error.message);
      return null;
    }
  }

  // Read step count (if available)
  async readStepCount() {
    try {
      const characteristic = await this.findCharacteristic(
        this.SERVICES.FITNESS_MACHINE,
        this.CHARACTERISTICS.STEP_COUNT
      );
      
      if (!characteristic) return null;
      
      const data = await characteristic.read();
      const steps = this.parseStepData(data.value);
      
      if (steps !== null) {
        console.log(`👟 Steps: ${steps}`);
        return { steps };
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Could not read step count:', error.message);
      return null;
    }
  }

  // Read temperature
  async readTemperature() {
    try {
      const characteristic = await this.findCharacteristic(
        this.SERVICES.HEALTH_THERMOMETER,
        this.CHARACTERISTICS.TEMPERATURE_MEASUREMENT
      );
      
      if (!characteristic) return null;
      
      const data = await characteristic.read();
      const temperature = this.parseTemperatureData(data.value);
      
      if (temperature !== null) {
        console.log(`🌡️ Temperature: ${temperature}°C`);
        return { bodyTemperature: temperature };
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Could not read temperature:', error.message);
      return null;
    }
  }

  // Read blood pressure
  async readBloodPressure() {
    try {
      const characteristic = await this.findCharacteristic(
        this.SERVICES.BLOOD_PRESSURE,
        this.CHARACTERISTICS.BLOOD_PRESSURE_MEASUREMENT
      );
      
      if (!characteristic) return null;
      
      const data = await characteristic.read();
      const bloodPressure = this.parseBloodPressureData(data.value);
      
      if (bloodPressure) {
        console.log(`🩺 Blood Pressure: ${bloodPressure.systolic}/${bloodPressure.diastolic} mmHg`);
        return { bloodPressure };
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Could not read blood pressure:', error.message);
      return null;
    }
  }

  // Read blood oxygen
  async readBloodOxygen() {
    try {
      const characteristic = await this.findCharacteristic(
        this.SERVICES.PULSE_OXIMETER,
        this.CHARACTERISTICS.PULSE_OXIMETRY_MEASUREMENT
      );
      
      if (!characteristic) return null;
      
      const data = await characteristic.read();
      const bloodOxygen = this.parseBloodOxygenData(data.value);
      
      if (bloodOxygen !== null) {
        console.log(`🩸 Blood Oxygen: ${bloodOxygen}%`);
        return { bloodOxygen };
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Could not read blood oxygen:', error.message);
      return null;
    }
  }

  // Read weight
  async readWeight() {
    try {
      const characteristic = await this.findCharacteristic(
        this.SERVICES.WEIGHT_SCALE,
        this.CHARACTERISTICS.WEIGHT_MEASUREMENT
      );
      
      if (!characteristic) return null;
      
      const data = await characteristic.read();
      const weight = this.parseWeightData(data.value);
      
      if (weight !== null) {
        console.log(`⚖️ Weight: ${weight} kg`);
        return { weight };
      }
      
      return null;
    } catch (error) {
      console.log('⚠️ Could not read weight:', error.message);
      return null;
    }
  }

  // Helper function to find characteristic
  async findCharacteristic(serviceUUID, characteristicUUID) {
    try {
      const services = await this.connectedDevice.device.services();
      
      for (const service of services) {
        if (service.uuid.toLowerCase() === serviceUUID.toLowerCase()) {
          const characteristics = await service.characteristics();
          
          for (const characteristic of characteristics) {
            if (characteristic.uuid.toLowerCase() === characteristicUUID.toLowerCase()) {
              return characteristic;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.log(`⚠️ Could not find characteristic ${characteristicUUID}:`, error.message);
      return null;
    }
  }

  // Data parsing functions (simplified without Buffer dependency)
  parseHeartRateData(base64Data) {
    try {
      // Convert base64 to byte array
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length >= 2) {
        // Heart rate is typically at byte 1 for BLE heart rate service
        return bytes[1] || bytes[0];
      }
      return null;
    } catch (error) {
      console.log('Error parsing heart rate data:', error);
      return null;
    }
  }

  parseBatteryData(base64Data) {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length >= 1) {
        return bytes[0];
      }
      return null;
    } catch (error) {
      console.log('Error parsing battery data:', error);
      return null;
    }
  }

  parseStepData(base64Data) {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length >= 4) {
        // Simple 32-bit value (little endian)
        return bytes[0] + (bytes[1] << 8) + (bytes[2] << 16) + (bytes[3] << 24);
      }
      return null;
    } catch (error) {
      console.log('Error parsing step data:', error);
      return null;
    }
  }

  parseTemperatureData(base64Data) {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length >= 2) {
        // Temperature as 16-bit value, assume in 1/10th degrees
        const temp = (bytes[0] + (bytes[1] << 8)) / 10;
        return Math.round(temp * 10) / 10;
      }
      return null;
    } catch (error) {
      console.log('Error parsing temperature data:', error);
      return null;
    }
  }

  parseBloodPressureData(base64Data) {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length >= 4) {
        const systolic = bytes[0] + (bytes[1] << 8);
        const diastolic = bytes[2] + (bytes[3] << 8);
        return { systolic, diastolic };
      }
      return null;
    } catch (error) {
      console.log('Error parsing blood pressure data:', error);
      return null;
    }
  }

  parseBloodOxygenData(base64Data) {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length >= 1) {
        return bytes[0];
      }
      return null;
    } catch (error) {
      console.log('Error parsing blood oxygen data:', error);
      return null;
    }
  }

  parseWeightData(base64Data) {
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (bytes.length >= 2) {
        // Weight as 16-bit value in 1/10th kg
        const weight = (bytes[0] + (bytes[1] << 8)) / 10;
        return Math.round(weight * 10) / 10;
      }
      return null;
    } catch (error) {
      console.log('Error parsing weight data:', error);
      return null;
    }
  }

  // Save health data to Supabase
  async saveHealthDataToSupabase(userId, healthData) {
    try {
      const dataToSave = {
        user_id: userId,
        device_name: healthData.deviceName,
        device_brand: healthData.deviceBrand,
        heart_rate: healthData.heartRate || null,
        steps: healthData.steps || null,
        calories: healthData.calories || null,
        distance: healthData.distance || null,
        blood_oxygen: healthData.bloodOxygen || null,
        body_temperature: healthData.bodyTemperature || null,
        battery_level: healthData.batteryLevel || null,
        weight: healthData.weight || null,
        blood_pressure_systolic: healthData.bloodPressure?.systolic || null,
        blood_pressure_diastolic: healthData.bloodPressure?.diastolic || null,
        data_source: 'real_device',
        collected_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('smartwatch_data')
        .insert([dataToSave])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Health data saved to Supabase:', data);
      return { success: true, data };

    } catch (error) {
      console.error('❌ Error saving health data to Supabase:', error);
      throw error;
    }
  }

  // Start monitoring device for real-time data
  async startRealTimeMonitoring(callback) {
    if (!this.connectedDevice) {
      throw new Error('No device connected');
    }

    try {
      console.log('🔄 Starting real-time monitoring...');
      
      // Monitor heart rate if available
      const heartRateChar = await this.findCharacteristic(
        this.SERVICES.HEART_RATE,
        this.CHARACTERISTICS.HEART_RATE_MEASUREMENT
      );

      if (heartRateChar) {
        const subscription = heartRateChar.monitor((error, characteristic) => {
          if (error) {
            console.error('❌ Heart rate monitoring error:', error);
            return;
          }

          const heartRate = this.parseHeartRateData(characteristic.value);
          if (heartRate && callback) {
            callback({ heartRate, timestamp: new Date().toISOString() });
          }
        });

        this.monitoringSubscriptions.push(subscription);
      }

      return true;
    } catch (error) {
      console.error('❌ Error starting real-time monitoring:', error);
      throw error;
    }
  }

  // Stop real-time monitoring
  stopRealTimeMonitoring() {
    this.monitoringSubscriptions.forEach(subscription => {
      subscription.remove();
    });
    this.monitoringSubscriptions = [];
    console.log('⏹️ Real-time monitoring stopped');
  }

  // Stop scanning
  stopScan() {
    if (this.scanSubscription) {
      this.manager.stopDeviceScan();
      this.scanSubscription = null;
      console.log('⏹️ Device scan stopped');
    }
  }

  // Disconnect from device
  async disconnect() {
    try {
      this.stopRealTimeMonitoring();
      
      if (this.connectedDevice) {
        await this.connectedDevice.device.cancelConnection();
        console.log(`🔌 Disconnected from ${this.connectedDevice.name}`);
        this.connectedDevice = null;
      }
      
      this.stopScan();
      return true;
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
      throw error;
    }
  }

  // Get connected device info
  getConnectedDevice() {
    return this.connectedDevice;
  }

  // Check if device is connected
  isConnected() {
    return this.connectedDevice !== null;
  }

  // Cleanup
  async cleanup() {
    await this.disconnect();
    this.manager.destroy();
  }
}

export default new BluetoothWearableService(); 