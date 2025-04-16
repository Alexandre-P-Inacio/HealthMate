import supabase from '../../supabase';
import DataUser from '../../navigation/DataUser';

class MedicationService {
  // Adicionar novo medicamento à agenda
  static async addMedication(medicationData) {
    try {
      const userData = DataUser.getUserData();
      
      if (!userData?.id) {
        throw new Error('User ID not found');
      }

      const { 
        medication_name, 
        dosage, 
        schedule_time,
        schedule_date,
        recurrence,
        days_of_week 
      } = medicationData;

      // Inserir na tabela medication_schedule
      const { data, error } = await supabase
        .from('medication_schedule')
        .insert({
          uuid_user_id: userData.id,
          medication_name,
          dosage,
          schedule_time,
          schedule_date,
          recurrence,
          days_of_week,
          created_at: new Date().toISOString(),
          is_active: true
        })
        .select();

      if (error) throw error;
      
      // Também inserir na tabela pills_warning para compatibilidade
      const pillsData = await this.createPillsWarning(data[0]);
      
      // Após criar o medicamento, calcular e registrar todos os horários
      if (pillsData && pillsData.id) {
        await this.calculateAndRegisterAllSchedules(pillsData, userData.id);
        console.log('Todos os horários do medicamento foram registrados com sucesso');
      }
      
      return data[0];
    } catch (error) {
      console.error('Error adding medication:', error);
      throw error;
    }
  }

  // Novo método para calcular e registrar todos os horários de um medicamento
  static async calculateAndRegisterAllSchedules(medicationData, userId) {
    try {
      if (!medicationData.id || !userId) {
        console.error('ID do medicamento ou ID do usuário não fornecido');
        return { error: 'Dados incompletos' };
      }

      console.log(`Calculando horários para medicamento ID: ${medicationData.id}`);
      
      // Array para armazenar todas as datas/horas calculadas
      const scheduledTimes = [];
      
      // Data atual como referência
      const now = new Date();
      let startDate = medicationData.data_inicio ? new Date(medicationData.data_inicio) : now;
      
      // Garantir que a data de início não seja anterior à data atual
      if (startDate < now) {
        startDate = now;
      }
      
      // Data de término (se existir)
      const endDate = medicationData.data_fim ? new Date(medicationData.data_fim) : null;
      
      // Se medicamento for de dose única
      if (medicationData.recurrence === 'once' || !medicationData.recurrence) {
        const datetime = new Date(startDate);
        
        if (datetime > now) {
          scheduledTimes.push(datetime.toISOString());
        }
      }
      // Se medicamento for diário 
      else if (medicationData.recurrence === 'daily') {
        // Medicamento diário (30 dias por padrão)
        const daysToCalculate = endDate ? 
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) : 
          30;
        
        // Para cada dia no período
        for (let day = 0; day < daysToCalculate; day++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + day);
          
          const datetime = new Date(currentDate);
          // Usar horário original definido
          const timeStr = medicationData.schedule_time || "08:00";
          const [hours, minutes] = timeStr.split(':').map(Number);
          datetime.setHours(hours || 8, minutes || 0, 0, 0);
          
          if (datetime > now) {
            scheduledTimes.push(datetime.toISOString());
          }
        }
      }
      // Se medicamento for semanal
      else if (medicationData.recurrence === 'weekly') {
        // Medicamento semanal (4 semanas por padrão)
        const weeksToCalculate = endDate ? 
          Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24 * 7)) : 
          4;
        
        // Dias da semana selecionados (array de strings ou valor padrão)
        const selectedDays = medicationData.days_of_week || ['monday', 'wednesday', 'friday'];
        
        // Mapeamento dos dias da semana
        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        
        // Para cada semana no período
        for (let week = 0; week < weeksToCalculate; week++) {
          const weekStart = new Date(startDate);
          weekStart.setDate(weekStart.getDate() + (week * 7));
          
          // Para cada dia da semana selecionado
          for (const dayName of selectedDays) {
            const dayOfWeek = dayMap[dayName.toLowerCase()];
            
            if (dayOfWeek !== undefined) {
              const currentDate = new Date(weekStart);
              const currentDayOfWeek = currentDate.getDay();
              const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
              
              currentDate.setDate(currentDate.getDate() + daysToAdd);
              
              // Aplicar horário
              const timeStr = medicationData.schedule_time || "08:00";
              const [hours, minutes] = timeStr.split(':').map(Number);
              currentDate.setHours(hours || 8, minutes || 0, 0, 0);
              
              if (currentDate > now) {
                scheduledTimes.push(currentDate.toISOString());
              }
            }
          }
        }
      }
      
      console.log(`Calculados ${scheduledTimes.length} horários para tomar o medicamento`);
      
      // Salvar cada horário calculado na tabela
      const results = [];
      for (const scheduledTime of scheduledTimes) {
        // Verificar se já existe um registro
        const { data: existing, error: checkError } = await supabase
          .from('medication_confirmations')
          .select('id')
          .eq('scheduled_time', scheduledTime)
          .maybeSingle();
        
        if (checkError) {
          console.error('Erro ao verificar registro existente:', checkError);
          continue;
        }
        
        // Se não existir, criar o novo registro
        if (!existing) {
          const confirmationData = {
            scheduled_time: scheduledTime,
            user_id: userId,
            taken: null, // Inicialmente null até ser confirmado
            notes: 'Agendado automaticamente',
            created_at: new Date().toISOString()
          };
          
          const { data, error } = await supabase
            .from('medication_confirmations')
            .insert(confirmationData)
            .select('id');
          
          if (error) {
            console.error('Erro ao criar registro de confirmação:', error);
          } else if (data) {
            results.push(data[0]);
          }
        } else {
          results.push(existing);
        }
      }
      
      console.log(`Salvos ${results.length} registros na tabela medication_confirmations`);
      return { data: results };
    } catch (error) {
      console.error('Erro ao calcular e salvar horários de medicação:', error);
      return { error };
    }
  }
  
  // Atualizar método para criar pills_warning
  static async createPillsWarning(medicationData) {
    try {
      // Criar entrada na pills_warning para compatibilidade com código existente
      const { data, error } = await supabase
        .from('pills_warning')
        .insert({
          nome_medicamento: medicationData.medication_name,
          dosage: medicationData.dosage,
          data_inicio: new Date(`${medicationData.schedule_date}T${medicationData.schedule_time}`).toISOString(),
          status: 'pending',
          uuid_user_id: medicationData.uuid_user_id,
          recurrence: medicationData.recurrence,
          schedule_time: medicationData.schedule_time,
          days_of_week: medicationData.days_of_week
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating pills_warning:', error);
      return null;
    }
  }

  // Atualizar medicamento (apagar antigo e criar novo)
  static async updateMedication(medicationId, medicationData) {
    try {
      const userData = DataUser.getUserData();
      
      if (!userData?.id) {
        throw new Error('User ID not found');
      }

      // 1. Marcar o medicamento antigo como inativo
      const { error: deactivateError } = await supabase
        .from('medication_schedule')
        .update({ is_active: false })
        .eq('id', medicationId)
        .eq('uuid_user_id', userData.id);

      if (deactivateError) throw deactivateError;

      // 2. Criar um novo registro com os dados atualizados
      const { 
        medication_name, 
        dosage, 
        schedule_time,
        schedule_date,
        recurrence,
        days_of_week 
      } = medicationData;

      const { data, error } = await supabase
        .from('medication_schedule')
        .insert({
          uuid_user_id: userData.id,
          medication_name,
          dosage,
          schedule_time,
          schedule_date,
          recurrence,
          days_of_week,
          created_at: new Date().toISOString(),
          is_active: true
        })
        .select();

      if (error) throw error;
      
      // 3. Atualizar a tabela pills_warning para compatibilidade
      const pillsData = await this.updatePillsWarning(medicationId, data[0]);
      
      // 4. Recalcular e atualizar todos os horários de tomada
      if (pillsData && pillsData.id) {
        // Primeiro, marcar os horários antigos como cancelados
        await this.cancelOldSchedules(medicationId);
        
        // Depois, calcular e salvar os novos horários
        await this.calculateAndRegisterAllSchedules(pillsData, userData.id);
        console.log('Horários do medicamento atualizados com sucesso');
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  }
  
  // Método auxiliar para cancelar horários antigos
  static async cancelOldSchedules(medicationId) {
    try {
      // Marcar confirmações existentes como canceladas em vez de deletar
      const { error } = await supabase
        .from('medication_confirmations')
        .update({ 
          notes: 'Cancelado - medicamento atualizado',
          taken: false
        })
        .is('confirmation_time', null);
      
      if (error) {
        console.error('Erro ao cancelar horários antigos:', error);
      } else {
        console.log(`Horários antigos do medicamento ID ${medicationId} cancelados com sucesso`);
      }
    } catch (error) {
      console.error('Exceção ao cancelar horários antigos:', error);
    }
  }

  // Método auxiliar para manter compatibilidade com pills_warning ao atualizar
  static async updatePillsWarning(oldId, medicationData) {
    try {
      // Desativar o registro antigo
      await supabase
        .from('pills_warning')
        .update({ status: 'cancelled' })
        .eq('id', oldId);

      // Criar um novo registro
      const { data, error } = await supabase
        .from('pills_warning')
        .insert({
          nome_medicamento: medicationData.medication_name,
          dosage: medicationData.dosage,
          data_inicio: new Date(`${medicationData.schedule_date}T${medicationData.schedule_time}`).toISOString(),
          status: 'pending',
          uuid_user_id: medicationData.uuid_user_id,
          recurrence: medicationData.recurrence,
          schedule_time: medicationData.schedule_time,
          days_of_week: medicationData.days_of_week
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating pills_warning:', error);
      return null;
    }
  }

  // Obter medicamentos ativos do usuário
  static async getUserMedications() {
    try {
      const userData = DataUser.getUserData();
      
      if (!userData?.id) {
        throw new Error('User ID not found');
      }

      const { data, error } = await supabase
        .from('medication_schedule')
        .select('*')
        .eq('uuid_user_id', userData.id)
        .eq('is_active', true)
        .order('schedule_date', { ascending: true })
        .order('schedule_time', { ascending: true });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching user medications:', error);
      throw error;
    }
  }

  // Obter medicamentos para um dia específico
  static async getMedicationsForDate(date) {
    try {
      const userData = DataUser.getUserData();
      
      if (!userData?.id) {
        throw new Error('User ID not found');
      }

      const formattedDate = date.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('medication_schedule')
        .select('*')
        .eq('uuid_user_id', userData.id)
        .eq('is_active', true)
        .eq('schedule_date', formattedDate)
        .order('schedule_time', { ascending: true });

      if (error) throw error;
      
      // Para medicamentos recorrentes, precisamos verificar dias da semana
      const allMeds = await this.getUserMedications();
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
      
      const recurrentMeds = allMeds.filter(med => 
        med.recurrence && 
        med.recurrence !== 'once' && 
        med.days_of_week && 
        med.days_of_week.includes(dayOfWeek)
      );
      
      // Combinar medicamentos específicos do dia com recorrentes
      return [...data, ...recurrentMeds];
    } catch (error) {
      console.error('Error fetching medications for date:', error);
      throw error;
    }
  }

  // Confirmar tomada de medicamento
  static async confirmMedication(medicationId, taken = true) {
    try {
      const userData = DataUser.getUserData();
      
      if (!userData?.id) {
        throw new Error('User ID not found');
      }

      const now = new Date();
      
      const { error } = await supabase
        .from('medication_confirmations')
        .insert({
          uuid_user_id: userData.id,
          taken: taken,
          confirmation_date: now.toISOString().split('T')[0],
          confirmation_time: now.toISOString(),
          notes: taken ? 'Medication taken' : 'Medication not taken'
        });

      if (error) throw error;
      
      // Atualizar também a tabela pills_warning para compatibilidade
      if (taken) {
        await supabase
          .from('pills_warning')
          .update({ 
            status: 'taken',
            last_taken: now.toISOString(),
            uuid_user_id: userData.id
          })
          .eq('id', medicationId);
      }
      
      return true;
    } catch (error) {
      console.error('Error confirming medication:', error);
      throw error;
    }
  }

  // Verificar se um medicamento já foi confirmado
  static async checkMedicationConfirmation(medicationId, date) {
    try {
      const userData = DataUser.getUserData();
      
      if (!userData?.id) {
        throw new Error('User ID not found');
      }

      const formattedDate = date || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('medication_confirmations')
        .select('*')
        .eq('uuid_user_id', userData.id)
        .eq('confirmation_date', formattedDate)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 é o erro quando não encontra resultados
        throw error;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error checking medication confirmation:', error);
      return false;
    }
  }

  // Função para criar registro na tabela de confirmações
  static async createMedicationConfirmation(medicationId, scheduledTime, userId) {
    try {
      if (!medicationId || !scheduledTime || !userId) {
        console.error('Missing required fields for medication confirmation');
        return { error: 'Missing required fields' };
      }

      const newConfirmation = {
        scheduled_time: scheduledTime,
        user_id: userId,
        taken: false,
        notes: 'Automatically scheduled',
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('medication_confirmations')
        .insert(newConfirmation)
        .select('id');
      
      if (error) {
        console.error('Error creating medication confirmation:', error);
        return { error };
      }
      
      return { data };
    } catch (error) {
      console.error('Exception creating medication confirmation:', error);
      return { error };
    }
  }

  // Adicione essa função ao arquivo existente
  static async registerMedicationSchedule(medicationData) {
    try {
      // First ensure the medication exists in pills_warning
      const { data: medication, error: medicationError } = await supabase
        .from('pills_warning')
        .select('id')
        .eq('id', medicationData.id)
        .single();
      
      if (medicationError) {
        console.error('Error finding medication:', medicationError);
        return { error: medicationError };
      }
      
      // Then create entry in medication_confirmations
      const confirmationData = {
        scheduled_time: medicationData.scheduled_time,
        user_id: medicationData.user_id,
        taken: null, // Initially null until confirmed
        notes: 'Scheduled automatically via MedicationService',
        created_at: new Date().toISOString()
      };
      
      // Check if entry already exists
      const { data: existing, error: checkError } = await supabase
        .from('medication_confirmations')
        .select('id')
        .eq('scheduled_time', medicationData.scheduled_time)
        .maybeSingle();
      
      if (checkError) {
        console.error('Error checking for existing confirmation:', checkError);
        return { error: checkError };
      }
      
      // If entry doesn't exist, create it
      if (!existing) {
        const { data, error } = await supabase
          .from('medication_confirmations')
          .insert(confirmationData)
          .select('id');
        
        if (error) {
          console.error('Error creating medication confirmation:', error);
          return { error };
        }
        
        return { data };
      } else {
        console.log('Confirmation entry already exists');
        return { data: existing };
      }
    } catch (error) {
      console.error('Exception in registerMedicationSchedule:', error);
      return { error };
    }
  }
}

export default MedicationService; 