import supabase from '../../supabase';

class DoctorService {
  static async getDoctorById(doctorId) {
    try {
      if (!doctorId) {
        console.warn(`DoctorService: ID de médico inválido fornecido: ${doctorId}`);
        return { success: false, error: 'ID de médico inválido.' };
      }
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select(`*
        `)
        .eq('id', doctorId)
        .single();

      if (doctorError) throw doctorError;

      if (doctor) {
        // Buscar informações do usuário associado
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('fullname, pfpimg')
          .eq('id', doctor.id) // Assumindo que doctor.id é o mesmo que user.id
          .single();

        if (userError) {
          console.warn(`DoctorService: Erro ao buscar usuário para o médico ID ${doctor.id}: ${userError.message}`);
          return { success: true, data: { ...doctor, user: { fullname: doctor.name, pfpimg: null } } };
        } else {
          return { success: true, data: { ...doctor, user: { fullname: user.fullname, pfpimg: user.pfpimg } } };
        }
      }
      return { success: false, error: 'Médico não encontrado.' };
    } catch (error) {
      console.error('DoctorService: Erro ao buscar médico por ID:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDoctorByUserId(userId) {
    try {
      if (!userId) {
        console.warn(`DoctorService: ID de usuário inválido para médico fornecido: ${userId}`);
        return { success: false, error: 'ID de usuário inválido para médico.' };
      }
      const { data: doctor, error: doctorError } = await supabase
        .from('doctors')
        .select(`*
        `)
        .eq('id', userId) // Assumindo que o user_id do doctor é o próprio id do usuário
        .single();

      if (doctorError) throw doctorError;

      if (doctor) {
        // Buscar informações do usuário associado
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('fullname, pfpimg')
          .eq('id', doctor.id) // Assumindo que doctor.id é o mesmo que user.id
          .single();

        if (userError) {
          console.warn(`DoctorService: Erro ao buscar usuário (por user ID) para o médico ID ${doctor.id}: ${userError.message}`);
          return { success: true, data: { ...doctor, user: { fullname: doctor.name, pfpimg: null } } };
        } else {
          return { success: true, data: { ...doctor, user: { fullname: user.fullname, pfpimg: user.pfpimg } } };
        }
      }
      return { success: false, error: 'Médico não encontrado pelo ID de usuário.' };
    } catch (error) {
      console.error('DoctorService: Erro ao buscar médico por ID de usuário:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllDoctors() {
    try {
      const { data: doctors, error: doctorsError } = await supabase
        .from('doctors')
        .select(`*
        `);

      if (doctorsError) throw doctorsError;

      const doctorsWithUserDetails = await Promise.all(doctors.map(async (doctor) => {
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('fullname, pfpimg')
          .eq('id', doctor.id) // Assumindo que doctor.id é o mesmo que user.id
          .single();

        if (userError) {
          console.warn(`DoctorService: Erro ao buscar usuário para o médico ID ${doctor.id} em getAllDoctors: ${userError.message}`);
          return { ...doctor, user: { fullname: doctor.name, pfpimg: null } };
        } else {
          return { ...doctor, user: { fullname: user.fullname, pfpimg: user.pfpimg } };
        }
      }));

      return { success: true, data: doctorsWithUserDetails };
    } catch (error) {
      console.error('DoctorService: Erro ao buscar todos os médicos:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDoctorAvailability(doctorId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('doctor_availability')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('start_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString());

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
      return { success: false, error: error.message };
    }
  }

  static async getDoctorAppointments(doctorId, startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .gte('appointment_datetime', startDate.toISOString())
        .lte('appointment_datetime', endDate.toISOString());

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching doctor appointments:', error);
      return { success: false, error: error.message };
    }
  }
}

export default DoctorService; 