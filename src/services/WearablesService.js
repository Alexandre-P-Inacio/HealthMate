import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

class WearablesService {
  constructor() {
    this.tableName = 'wearables_data';
  }

  // Save wearables/vitals data
  async saveVitalsData(data) {
    try {
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) {
        throw new Error('User not logged in');
      }

      const newEntry = {
        user_id: userId,
        date: new Date().toISOString().split('T')[0], // Add current date
        heart_rate: data.heartRate || null,
        steps: data.steps || null,
        calories: data.calories || null,
        distance: data.distance || null,
        blood_oxygen: data.bloodOxygen || null,
        body_temperature: data.bodyTemperature || null,
        blood_pressure_systolic: data.bloodPressure?.systolic || null,
        blood_pressure_diastolic: data.bloodPressure?.diastolic || null,
        sleep_duration: data.sleepData?.duration || null,
        stress_level: data.stressLevel || null,
        source: data.source || 'Health Connect'
      };

      const { data: savedData, error } = await supabase
        .from(this.tableName)
        .insert([newEntry])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Wearables data saved to Supabase:', savedData);
      return savedData;
    } catch (error) {
      console.error('❌ Error saving wearables data:', error);
      throw error;
    }
  }

  // Get all wearables data for current user
  async getAllData() {
    try {
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) return [];

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.log('⚠️ Table wearables_data does not exist yet - returning empty data');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Error getting wearables data:', error);
      return [];
    }
  }

  // Get data for a specific date
  async getDataByDate(date) {
    try {
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) return [];

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('timestamp', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.log('⚠️ Table wearables_data does not exist yet - returning empty data');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Error getting data by date:', error);
      return [];
    }
  }

  // Get data for date range
  async getDataByDateRange(startDate, endDate) {
    try {
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) return [];

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('timestamp', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.log('⚠️ Table wearables_data does not exist yet - returning empty data');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Error getting data by date range:', error);
      return [];
    }
  }

  // Get latest entry
  async getLatestEntry() {
    try {
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) return null;

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116') {
          console.log('⚠️ Table wearables_data does not exist yet or no data - returning null');
          return null;
        }
        throw error;
      }
      return data || null;
    } catch (error) {
      console.error('❌ Error getting latest entry:', error);
      return null;
    }
  }

  // Delete entry by ID
  async deleteEntry(id) {
    try {
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) return false;

      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error deleting entry:', error);
      return false;
    }
  }

  // Get heart rate statistics
  async getHeartRateStats() {
    try {
      const allData = await this.getAllData();
      const heartRates = allData.filter(entry => entry.heart_rate).map(entry => entry.heart_rate);
      
      if (heartRates.length === 0) return null;

      return {
        current: heartRates[0],
        min: Math.min(...heartRates),
        max: Math.max(...heartRates),
        average: Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length),
        totalEntries: heartRates.length,
        trend: this.calculateTrend(heartRates.slice(0, 7))
      };
    } catch (error) {
      console.error('❌ Error getting heart rate stats:', error);
      return null;
    }
  }

  // Get steps statistics
  async getStepsStats() {
    try {
      const allData = await this.getAllData();
      const steps = allData.filter(entry => entry.steps).map(entry => entry.steps);
      
      if (steps.length === 0) return null;

      return {
        current: steps[0],
        min: Math.min(...steps),
        max: Math.max(...steps),
        average: Math.round(steps.reduce((sum, s) => sum + s, 0) / steps.length),
        totalEntries: steps.length,
        total: steps.reduce((sum, s) => sum + s, 0),
        trend: this.calculateTrend(steps.slice(0, 7))
      };
    } catch (error) {
      console.error('❌ Error getting steps stats:', error);
      return null;
    }
  }

  // Get blood oxygen statistics
  async getBloodOxygenStats() {
    try {
      const allData = await this.getAllData();
      const bloodOxygen = allData.filter(entry => entry.blood_oxygen).map(entry => entry.blood_oxygen);
      
      if (bloodOxygen.length === 0) return null;

      return {
        current: bloodOxygen[0],
        min: Math.min(...bloodOxygen),
        max: Math.max(...bloodOxygen),
        average: (bloodOxygen.reduce((sum, bo) => sum + bo, 0) / bloodOxygen.length).toFixed(1),
        totalEntries: bloodOxygen.length,
        trend: this.calculateTrend(bloodOxygen.slice(0, 7))
      };
    } catch (error) {
      console.error('❌ Error getting blood oxygen stats:', error);
      return null;
    }
  }

  // Calculate trend (increasing, decreasing, stable)
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const recent = values.slice(0, Math.min(3, values.length));
    const older = values.slice(Math.min(3, values.length));
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    const threshold = olderAvg * 0.05; // 5% threshold
    
    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  // Get chart data for heart rate over time
  async getHeartRateChartData(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const data = await this.getDataByDateRange(
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0]
      );
      
      return data
        .filter(entry => entry.heart_rate)
        .map(entry => ({
          date: entry.date,
          value: entry.heart_rate,
          timestamp: entry.timestamp
        }))
        .reverse(); // Oldest first for charts
    } catch (error) {
      console.error('❌ Error getting heart rate chart data:', error);
      return [];
    }
  }

  // Get chart data for steps over time
  async getStepsChartData(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const data = await this.getDataByDateRange(
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0]
      );
      
      return data
        .filter(entry => entry.steps)
        .map(entry => ({
          date: entry.date,
          value: entry.steps,
          timestamp: entry.timestamp
        }))
        .reverse();
    } catch (error) {
      console.error('❌ Error getting steps chart data:', error);
      return [];
    }
  }

  // Get chart data for blood oxygen over time
  async getBloodOxygenChartData(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const data = await this.getDataByDateRange(
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0]
      );
      
      return data
        .filter(entry => entry.blood_oxygen)
        .map(entry => ({
          date: entry.date,
          value: entry.blood_oxygen,
          timestamp: entry.timestamp
        }))
        .reverse();
    } catch (error) {
      console.error('❌ Error getting blood oxygen chart data:', error);
      return [];
    }
  }

  // Get comprehensive vitals summary
  async getVitalsSummary() {
    try {
      const [heartRateStats, stepsStats, bloodOxygenStats] = await Promise.all([
        this.getHeartRateStats(),
        this.getStepsStats(),
        this.getBloodOxygenStats()
      ]);

      return {
        heartRate: heartRateStats,
        steps: stepsStats,
        bloodOxygen: bloodOxygenStats,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting vitals summary:', error);
      return null;
    }
  }

  // Clear all data for current user
  async clearAllData() {
    try {
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) return false;

      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      return false;
    }
  }
}

export default new WearablesService(); 