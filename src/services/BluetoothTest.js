// Test file for Bluetooth Wearable functionality
// This file demonstrates how to test the Bluetooth integration
import BluetoothWearableService from './BluetoothWearableService';

class BluetoothTest {
  static async testBluetoothPermissions() {
    console.log('🔍 Testing Bluetooth permissions...');
    try {
      await BluetoothWearableService.initialize();
      console.log('✅ Bluetooth permissions OK');
      return true;
    } catch (error) {
      console.error('❌ Bluetooth permissions failed:', error.message);
      return false;
    }
  }

  static async testWearableScan() {
    console.log('🔍 Testing wearable device scan...');
    try {
      const devices = await BluetoothWearableService.scanForWearableDevices();
      console.log(`✅ Found ${devices.length} wearable devices:`);
      
      devices.forEach((device, index) => {
        console.log(`${index + 1}. ${device.name}`);
        console.log(`   Brand: ${device.brand}`);
        console.log(`   RSSI: ${device.rssi}dBm`);
        console.log(`   Services: ${device.serviceUUIDs?.length || 0}`);
        console.log(`   Connectable: ${device.isConnectable ? 'Yes' : 'No'}`);
        console.log('---');
      });
      
      return devices;
    } catch (error) {
      console.error('❌ Wearable scan failed:', error.message);
      return [];
    }
  }

  static async testConnection(deviceId, deviceName) {
    console.log(`🔗 Testing connection to: ${deviceName}`);
    try {
      const result = await BluetoothWearableService.connectToDevice(deviceId, deviceName);
      
      if (result.success) {
        console.log('✅ Connection successful!');
        console.log(`   Device: ${result.device.name}`);
        console.log(`   Brand: ${result.device.brand}`);
        console.log(`   Services: ${result.availableServices?.length || 0}`);
        
        // List available services
        if (result.availableServices) {
          console.log('   Available services:');
          result.availableServices.forEach(service => {
            console.log(`     - ${service}`);
          });
        }
        
        return result.device;
      }
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      return null;
    }
  }

  static async testDataCollection() {
    console.log('📊 Testing health data collection...');
    try {
      const healthData = await BluetoothWearableService.readHealthData();
      
      if (healthData) {
        console.log('✅ Health data collected successfully!');
        console.log(`   Device: ${healthData.deviceName}`);
        console.log(`   Brand: ${healthData.deviceBrand}`);
        console.log(`   Timestamp: ${healthData.timestamp}`);
        
        // List collected data
        const dataKeys = Object.keys(healthData).filter(key => 
          !['deviceName', 'deviceBrand', 'timestamp', 'dataSource'].includes(key)
        );
        
        console.log(`   Data types: ${dataKeys.length}`);
        dataKeys.forEach(key => {
          console.log(`     ${key}: ${healthData[key]}`);
        });
        
        return healthData;
      } else {
        console.log('⚠️ No health data available');
        return null;
      }
    } catch (error) {
      console.error('❌ Data collection failed:', error.message);
      return null;
    }
  }

  static async testRealTimeMonitoring() {
    console.log('🔄 Testing real-time monitoring...');
    try {
      let updateCount = 0;
      const maxUpdates = 5; // Test for 5 updates
      
      const callback = (realtimeData) => {
        updateCount++;
        console.log(`📊 Real-time update #${updateCount}:`);
        console.log(`   Timestamp: ${realtimeData.timestamp}`);
        
        Object.keys(realtimeData).forEach(key => {
          if (key !== 'timestamp') {
            console.log(`   ${key}: ${realtimeData[key]}`);
          }
        });
        
        if (updateCount >= maxUpdates) {
          console.log('✅ Real-time monitoring test completed');
          BluetoothWearableService.stopRealTimeMonitoring();
        }
      };
      
      await BluetoothWearableService.startRealTimeMonitoring(callback);
      console.log('🔄 Real-time monitoring started. Waiting for updates...');
      
      // Wait for updates or timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          if (updateCount === 0) {
            console.log('⚠️ No real-time updates received. Device may not support real-time monitoring.');
          }
          BluetoothWearableService.stopRealTimeMonitoring();
          resolve(updateCount);
        }, 30000); // 30 second timeout
      });
      
    } catch (error) {
      console.error('❌ Real-time monitoring failed:', error.message);
      return 0;
    }
  }

  static async testDisconnection() {
    console.log('🔌 Testing disconnection...');
    try {
      await BluetoothWearableService.disconnect();
      console.log('✅ Disconnection successful');
      return true;
    } catch (error) {
      console.error('❌ Disconnection failed:', error.message);
      return false;
    }
  }

  // Complete test suite
  static async runCompleteTest() {
    console.log('🚀 Starting complete Bluetooth test suite...');
    console.log('=====================================');
    
    const results = {
      permissions: false,
      scan: false,
      connection: false,
      dataCollection: false,
      realTimeMonitoring: false,
      disconnection: false
    };
    
    // Test 1: Permissions
    results.permissions = await this.testBluetoothPermissions();
    if (!results.permissions) {
      console.log('❌ Cannot continue without Bluetooth permissions');
      return results;
    }
    
    // Test 2: Scan for devices
    const devices = await this.testWearableScan();
    results.scan = devices.length > 0;
    
    if (!results.scan) {
      console.log('❌ No wearable devices found. Cannot continue with connection tests.');
      return results;
    }
    
    // Test 3: Connect to first device
    const firstDevice = devices[0];
    const connectedDevice = await this.testConnection(firstDevice.id, firstDevice.name);
    results.connection = connectedDevice !== null;
    
    if (!results.connection) {
      console.log('❌ Connection failed. Cannot continue with data tests.');
      return results;
    }
    
    // Test 4: Data collection
    const healthData = await this.testDataCollection();
    results.dataCollection = healthData !== null;
    
    // Test 5: Real-time monitoring (optional)
    const realtimeUpdates = await this.testRealTimeMonitoring();
    results.realTimeMonitoring = realtimeUpdates > 0;
    
    // Test 6: Disconnection
    results.disconnection = await this.testDisconnection();
    
    // Print results summary
    console.log('=====================================');
    console.log('📊 Test Results Summary:');
    console.log(`   Permissions: ${results.permissions ? '✅' : '❌'}`);
    console.log(`   Device Scan: ${results.scan ? '✅' : '❌'}`);
    console.log(`   Connection: ${results.connection ? '✅' : '❌'}`);
    console.log(`   Data Collection: ${results.dataCollection ? '✅' : '❌'}`);
    console.log(`   Real-time Monitoring: ${results.realTimeMonitoring ? '✅' : '⚠️'}`);
    console.log(`   Disconnection: ${results.disconnection ? '✅' : '❌'}`);
    
    const passedTests = Object.values(results).filter(result => result === true).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`📈 Overall: ${passedTests}/${totalTests} tests passed`);
    
    return results;
  }
}

export default BluetoothTest;

// Usage example:
// import BluetoothTest from './BluetoothTest';
// BluetoothTest.runCompleteTest().then(results => {
//   console.log('Test completed:', results);
// }); 