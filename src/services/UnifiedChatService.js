import supabase from '../../supabase';

class UnifiedChatService {
  
  // Criar ou buscar conversa entre dois usuários
  static async getOrCreateConversation(userId1, userId2) {
    try {
      if (!userId1 || !userId2 || userId1 === userId2) {
        return { success: false, error: 'IDs de usuário inválidos' };
      }

      // Normalizar a ordem dos participantes (menor ID sempre primeiro)
      const [participant1, participant2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

      // Tentar buscar conversa existente
      const { data: existingConversation, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_1_id', participant1)
        .eq('participant_2_id', participant2)
        .eq('is_active', true)
        .single();

      if (existingConversation) {
        return { success: true, data: existingConversation };
      }

      // Se não existir, criar nova conversa
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          participant_1_id: participant1,
          participant_2_id: participant2,
          is_active: true
        })
        .select()
        .single();

      if (createError) throw createError;

      return { success: true, data: newConversation };
    } catch (error) {
      console.error('UnifiedChatService: Error creating/getting conversation:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar todas as conversas de um usuário
  static async getUserConversations(userId) {
    try {
      if (!userId) {
        return { success: false, error: 'ID do usuário é obrigatório' };
      }

      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:participant_1_id (
            id,
            fullname,
            pfpimg,
            role
          ),
          participant_2:participant_2_id (
            id,
            fullname,
            pfpimg,
            role
          )
        `)
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Processar conversas para identificar o outro participante
      const processedConversations = conversations.map(conv => {
        const isParticipant1 = conv.participant_1_id === userId;
        const otherParticipant = isParticipant1 ? conv.participant_2 : conv.participant_1;
        
        return {
          ...conv,
          otherParticipant,
          unreadCount: 0 // Will be calculated separately if needed
        };
      });

      return { success: true, data: processedConversations };
    } catch (error) {
      console.error('UnifiedChatService: Error fetching conversations:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar pessoas disponíveis para conversar
  static async getAvailableContacts(currentUserId, currentUserRole = null) {
    try {
      if (!currentUserRole) {
        // Se não passou o role, buscar do banco
        const { data: currentUser, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUserId)
          .single();
        
        if (userError) throw userError;
        currentUserRole = currentUser.role;
      }

      // Buscar conversas existentes para excluir usuários que já têm chat
      const { data: existingConversations, error: convError } = await supabase
        .from('conversations')
        .select('participant_1_id, participant_2_id')
        .or(`participant_1_id.eq.${currentUserId},participant_2_id.eq.${currentUserId}`)
        .eq('is_active', true);

      if (convError) throw convError;

      // Extrair IDs de usuários que já têm conversa
      const existingUserIds = new Set();
      existingConversations.forEach(conv => {
        if (conv.participant_1_id === currentUserId) {
          existingUserIds.add(conv.participant_2_id);
        } else {
          existingUserIds.add(conv.participant_1_id);
        }
      });

      let query = supabase
        .from('users')
        .select('id, fullname, pfpimg, role')
        .neq('id', currentUserId);

      // Aplicar filtros baseados no papel do usuário
      if (currentUserRole === 'patient' || currentUserRole === 'user') {
        // Pacientes/usuários só podem conversar com médicos
        query = query.in('role', ['doctor', 'medic']);
      } else if (currentUserRole === 'doctor' || currentUserRole === 'medic') {
        // Médicos podem conversar com todos - SEM FILTRO
      }

      query = query.order('fullname', { ascending: true });

      const { data: allContacts, error } = await query;

      if (error) throw error;

      // Filtrar usuários que já têm conversa ativa
      const availableContacts = (allContacts || []).filter(contact => 
        !existingUserIds.has(contact.id)
      );
      
      return { success: true, data: availableContacts };
    } catch (error) {
      console.error('UnifiedChatService: Error fetching contacts:', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar mensagem
  static async sendMessage(conversationId, senderId, content, messageType = 'text') {
    try {
      if (!conversationId || !senderId || !content?.trim()) {
        return { success: false, error: 'Dados da mensagem são obrigatórios' };
      }

      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: content.trim(),
          message_type: messageType,
          is_read: false
        })
        .select(`
          *,
          sender:sender_id (
            id,
            fullname,
            pfpimg,
            role
          )
        `)
        .single();

      if (error) throw error;

      return { success: true, data: newMessage };
    } catch (error) {
      console.error('UnifiedChatService: Error sending message:', error);
      return { success: false, error: error.message };
    }
  }

  // Buscar mensagens de uma conversa
  static async getConversationMessages(conversationId, limit = 50, offset = 0) {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            id,
            fullname,
            pfpimg,
            role
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return { success: true, data: messages.reverse() };
    } catch (error) {
      console.error('UnifiedChatService: Error fetching messages:', error);
      return { success: false, error: error.message };
    }
  }

  // Marcar mensagens como lidas
  static async markMessagesAsRead(conversationId, userId) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('UnifiedChatService: Error marking messages as read:', error);
      return { success: false, error: error.message };
    }
  }

  // Contar mensagens não lidas
  static async getUnreadMessagesCount(userId) {
    try {
      // Buscar todas as conversas do usuário
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
        .eq('is_active', true);

      if (!conversations || conversations.length === 0) {
        return { success: true, data: 0 };
      }

      const conversationIds = conversations.map(conv => conv.id);

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      return { success: true, data: count || 0 };
    } catch (error) {
      console.error('UnifiedChatService: Error counting unread messages:', error);
      return { success: false, error: error.message };
    }
  }

  // Subscrever para atualizações em tempo real de uma conversa
  static subscribeToConversation(conversationId, callback) {
    const subscription = supabase
      .channel(`conversation_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Buscar dados completos da mensagem
          const { data: fullMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:sender_id (
                id,
                fullname,
                pfpimg,
                role
              )
            `)
            .eq('id', payload.new.id)
            .single();

          callback(fullMessage);
        }
      )
      .subscribe();

    return subscription;
  }

  // Subscrever para atualizações das conversas
  static subscribeToUserConversations(userId, callback) {
    const subscription = supabase
      .channel(`user_conversations_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_1_id=eq.${userId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_2_id=eq.${userId}`
        },
        callback
      )
      .subscribe();

    return subscription;
  }

  // Cancelar subscrição
  static unsubscribe(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  // Buscar detalhes de uma conversa
  static async getConversationDetails(conversationId) {
    try {
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:participant_1_id (
            id,
            fullname,
            pfpimg,
            role
          ),
          participant_2:participant_2_id (
            id,
            fullname,
            pfpimg,
            role
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      return { success: true, data: conversation };
    } catch (error) {
      console.error('UnifiedChatService: Error fetching conversation details:', error);
      return { success: false, error: error.message };
    }
  }

  // Verificar se usuário pode conversar com outro
  static async canUserChatWith(userId, targetUserId) {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, role')
        .in('id', [userId, targetUserId]);

      if (error) throw error;

      const user = users.find(u => u.id === userId);
      const target = users.find(u => u.id === targetUserId);

      if (!user || !target) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // Pacientes só podem conversar com médicos
      if (user.role === 'patient' && !['doctor', 'medic'].includes(target.role)) {
        return { success: false, error: 'Pacientes só podem conversar com médicos' };
      }

      return { success: true };
    } catch (error) {
      console.error('UnifiedChatService: Error checking chat permission:', error);
      return { success: false, error: error.message };
    }
  }
}

export default UnifiedChatService; 