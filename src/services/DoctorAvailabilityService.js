import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser'; // Supondo que DataUser tem o userId logado

export class DoctorAvailabilityService {
  /**
   * Adiciona um novo slot de disponibilidade para um médico.
   * @param {object} availabilityData - Dados da disponibilidade (day_of_week, start_time, end_time, is_recurring, exception_date, is_available).
   * @returns {Promise<object>} Objeto com sucesso/erro e dados.
   */
  static async addAvailability(availabilityData) {
    try {
      const userData = DataUser.getUserData();
      if (!userData || !userData.id) {
        throw new Error('User not logged in or user ID not found.');
      }

      // Buscar o doctor_id associado ao user_id logado
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (doctorError) throw doctorError;
      if (!doctor) throw new Error('Doctor profile not found for the logged in user.');

      const { data, error } = await supabase
        .from('doctor_availability')
        .insert({
          doctor_id: doctor.id, // Usar o doctor_id encontrado
          day_of_week: availabilityData.day_of_week,
          start_time: availabilityData.start_time,
          end_time: availabilityData.end_time,
          is_recurring: availabilityData.is_recurring,
          exception_date: availabilityData.exception_date || null,
          is_available: availabilityData.is_available || true,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error adding doctor availability:', error);
      return { success: false, error: error.message || 'Erro ao adicionar disponibilidade.' };
    }
  }

  /**
   * Busca a disponibilidade de um médico específico.
   * @param {number} doctorId - O ID do médico.
   * @returns {Promise<object>} Objeto com sucesso/erro e dados.
   */
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
      console.error('Error fetching doctor availability:', error);
      return { success: false, error: 'Erro ao buscar disponibilidade do médico.' };
    }
  }

  /**
   * Atualiza um slot de disponibilidade.
   * @param {string} availabilityId - O ID do slot de disponibilidade.
   * @param {object} updates - Os campos a serem atualizados.
   * @returns {Promise<object>} Objeto com sucesso/erro e dados.
   */
  static async updateAvailability(availabilityId, updates) {
    try {
      const userData = DataUser.getUserData();
      if (!userData || !userData.id) {
        throw new Error('User not logged in or user ID not found.');
      }

      // Buscar o doctor_id associado ao user_id logado
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (doctorError) throw doctorError;
      if (!doctor) throw new Error('Doctor profile not found for the logged in user.');

      // Verificar se o slot de disponibilidade pertence ao médico logado
      const { data: existingAvailability, error: fetchError } = await supabase
        .from('doctor_availability')
        .select('doctor_id')
        .eq('id', availabilityId)
        .single();

      if (fetchError) throw fetchError;
      if (!existingAvailability || existingAvailability.doctor_id !== doctor.id) {
        throw new Error('Unauthorized: You can only update your own availability.');
      }

      const { data, error } = await supabase
        .from('doctor_availability')
        .update(updates)
        .eq('id', availabilityId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating doctor availability:', error);
      return { success: false, error: error.message || 'Erro ao atualizar disponibilidade.' };
    }
  }

  /**
   * Deleta um slot de disponibilidade.
   * @param {string} availabilityId - O ID do slot de disponibilidade.
   * @returns {Promise<object>} Objeto com sucesso/erro.
   */
  static async deleteAvailability(availabilityId) {
    try {
      const userData = DataUser.getUserData();
      if (!userData || !userData.id) {
        throw new Error('User not logged in or user ID not found.');
      }

      // Buscar o doctor_id associado ao user_id logado
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      if (doctorError) throw doctorError;
      if (!doctor) throw new Error('Doctor profile not found for the logged in user.');

      // Verificar se o slot de disponibilidade pertence ao médico logado
      const { data: existingAvailability, error: fetchError } = await supabase
        .from('doctor_availability')
        .select('doctor_id')
        .eq('id', availabilityId)
        .single();

      if (fetchError) throw fetchError;
      if (!existingAvailability || existingAvailability.doctor_id !== doctor.id) {
        throw new Error('Unauthorized: You can only delete your own availability.');
      }

      const { error } = await supabase
        .from('doctor_availability')
        .delete()
        .eq('id', availabilityId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting doctor availability:', error);
      return { success: false, error: error.message || 'Erro ao deletar disponibilidade.' };
    }
  }
} 