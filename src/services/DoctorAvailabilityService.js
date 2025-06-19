import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

export class DoctorAvailabilityService {
  // Get the doctor_id from the current app user context
  static getDoctorIdFromApp() {
    const userData = DataUser.getUserData();
    if (!userData || !userData.id) throw new Error('Usuário não logado.');
    return userData.id;
  }

  // Add a new availability slot
  static async addAvailability(availabilityData) {
    try {
      const doctorId = this.getDoctorIdFromApp();
      const { data, error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_id: doctorId,
          day_of_week: availabilityData.day_of_week,
          start_time: availabilityData.start_time,
          end_time: availabilityData.end_time,
          is_recurring: availabilityData.is_recurring,
          exception_date: availabilityData.exception_date || null,
          is_available: availabilityData.is_available ?? true,
        })
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao adicionar disponibilidade.' };
    }
  }

  // Update an existing slot
  static async updateAvailability(availabilityId, updates) {
    try {
      const doctorId = this.getDoctorIdFromApp();
      // Check ownership
      const { data: existing, error: fetchError } = await supabase
        .from('doctor_availability')
        .select('doctor_id')
        .eq('id', availabilityId)
        .single();
      if (fetchError) throw fetchError;
      if (!existing || existing.doctor_id !== doctorId) throw new Error('Unauthorized');
      const { data, error } = await supabase
        .from('doctor_availability')
        .update(updates)
        .eq('id', availabilityId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao atualizar disponibilidade.' };
    }
  }

  // Delete a slot
  static async deleteAvailability(availabilityId) {
    try {
      const doctorId = this.getDoctorIdFromApp();
      // Check ownership
      const { data: existing, error: fetchError } = await supabase
        .from('doctor_availability')
        .select('doctor_id')
        .eq('id', availabilityId)
        .single();
      if (fetchError) throw fetchError;
      if (!existing || existing.doctor_id !== doctorId) throw new Error('Unauthorized');
      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', availabilityId);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao deletar disponibilidade.' };
    }
  }

  // Fetch all availabilities for the current doctor
  static async getMyAvailability() {
    try {
      const doctorId = this.getDoctorIdFromApp();
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Erro ao buscar disponibilidade do médico.' };
    }
  }

  // Buscar disponibilidade de qualquer médico pelo ID
  static async getAvailabilityByDoctorId(doctorId) {
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: 'Erro ao buscar disponibilidade do médico.' };
    }
  }
} 