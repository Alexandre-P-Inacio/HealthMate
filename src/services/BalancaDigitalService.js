import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

class BalancaDigitalService {
  constructor() {
    this.tableName = 'balanca_digital_data';
  }

  // Save body composition data
  async saveBodyCompositionData(data) {
    try {
      const userData = DataUser.getUserData();
      const userId = userData?.id;
      
      if (!userId) {
        throw new Error('User not logged in');
      }

      const newEntry = {
        user_id: userId,
        date: new Date().toISOString().split('T')[0], // Add current date
        weight: data.weight || null,
        body_fat: data.bodyFat || null,
        bone_mass: data.boneMass || null,
        bmr: data.bmr || null,
        lean_body_mass: data.leanBodyMass || null,
        body_water_mass: data.bodyWaterMass || null,
        source: data.source || 'Health Connect'
      };

      const { data: savedData, error } = await supabase
        .from(this.tableName)
        .insert([newEntry])
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Body composition data saved to Supabase:', savedData);
      return savedData;
    } catch (error) {
      console.error('❌ Error saving body composition data:', error);
      throw error;
    }
  }

  // Get all body composition data for current user
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
          console.log('⚠️ Table balanca_digital_data does not exist yet - returning empty data');
          return [];
        }
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error('❌ Error getting body composition data:', error);
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
          console.log('⚠️ Table balanca_digital_data does not exist yet - returning empty data');
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
          console.log('⚠️ Table balanca_digital_data does not exist yet - returning empty data');
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
          console.log('⚠️ Table balanca_digital_data does not exist yet or no data - returning null');
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

  // Get statistics for weight
  async getWeightStats() {
    try {
      const allData = await this.getAllData();
      const weights = allData.filter(entry => entry.weight).map(entry => entry.weight);
      
      if (weights.length === 0) return null;

      return {
        current: weights[0],
        min: Math.min(...weights),
        max: Math.max(...weights),
        average: (weights.reduce((sum, weight) => sum + weight, 0) / weights.length).toFixed(1),
        totalEntries: weights.length,
        trend: this.calculateTrend(weights.slice(0, 7))
      };
    } catch (error) {
      console.error('❌ Error getting weight stats:', error);
      return null;
    }
  }

  // Get statistics for body fat
  async getBodyFatStats() {
    try {
      const allData = await this.getAllData();
      const bodyFats = allData.filter(entry => entry.body_fat).map(entry => entry.body_fat);
      
      if (bodyFats.length === 0) return null;

      return {
        current: bodyFats[0],
        min: Math.min(...bodyFats),
        max: Math.max(...bodyFats),
        average: (bodyFats.reduce((sum, bf) => sum + bf, 0) / bodyFats.length).toFixed(1),
        totalEntries: bodyFats.length,
        trend: this.calculateTrend(bodyFats.slice(0, 7))
      };
    } catch (error) {
      console.error('❌ Error getting body fat stats:', error);
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
    const threshold = olderAvg * 0.02; // 2% threshold
    
    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  // Get chart data for weight over time
  async getWeightChartData(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const data = await this.getDataByDateRange(
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0]
      );
      
      return data
        .filter(entry => entry.weight)
        .map(entry => ({
          date: entry.date,
          value: entry.weight,
          timestamp: entry.timestamp
        }))
        .reverse(); // Oldest first for charts
    } catch (error) {
      console.error('❌ Error getting weight chart data:', error);
      return [];
    }
  }

  // Get chart data for body fat over time
  async getBodyFatChartData(days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const data = await this.getDataByDateRange(
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0]
      );
      
      return data
        .filter(entry => entry.body_fat)
        .map(entry => ({
          date: entry.date,
          value: entry.body_fat,
          timestamp: entry.timestamp
        }))
        .reverse();
    } catch (error) {
      console.error('❌ Error getting body fat chart data:', error);
      return [];
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

export default new BalancaDigitalService(); 