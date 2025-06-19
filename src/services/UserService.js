import supabase from '../../supabase';

class UserService {
  static async getUserById(userId) {
    try {
      if (!userId) {
        console.warn(`UserService: ID de usuário inválido fornecido: ${userId}`);
        return { success: false, error: 'ID de usuário inválido.' };
      }
      const { data, error } = await supabase
        .from('users')
        .select('fullname, pfpimg')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn(`UserService: Erro ao buscar usuário ID ${userId}:`, error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      console.error('UserService: Erro geral ao buscar usuário:', error);
      return { success: false, error: error.message };
    }
  }

  static async getAllUsers() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, fullname, pfpimg, email, phone, role')
        .not('role', 'eq', 'doctor'); // Exclude doctors

      if (error) {
        console.warn('UserService: Erro ao buscar todos os usuários:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    } catch (error) {
      console.error('UserService: Erro geral ao buscar todos os usuários:', error);
      return { success: false, error: error.message };
    }
  }
}

export default UserService; 