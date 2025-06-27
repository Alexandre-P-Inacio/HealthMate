import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import UnifiedChatService from '../../services/UnifiedChatService';
import DataUser from '../../../navigation/DataUser';
import { Ionicons } from '@expo/vector-icons';

const UnifiedChatScreen = ({ route, navigation }) => {
  const { conversationId, otherUserId, otherUserName, otherUserImage, otherUserRole } = route.params;
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const flatListRef = useRef(null);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser && conversationId) {
      loadMessages();
      // Marcar mensagens como lidas
      UnifiedChatService.markMessagesAsRead(conversationId, currentUser.id);
      
      // Subscrever para atualizações em tempo real
      const subscription = UnifiedChatService.subscribeToConversation(conversationId, (newMessage) => {
        if (newMessage) {
          setMessages(prevMessages => {
            // Verificar se a mensagem já existe (evitar duplicatas)
            const messageExists = prevMessages.some(msg => 
              msg.id === newMessage.id || 
              (msg.content === newMessage.content && 
               msg.sender_id === newMessage.sender_id && 
               Math.abs(new Date(msg.created_at) - new Date(newMessage.created_at)) < 5000)
            );
            
            if (messageExists) {
              // Substituir mensagem temporária pela real
              return prevMessages.map(msg => 
                (typeof msg.id === 'number' && msg.content === newMessage.content && msg.sender_id === newMessage.sender_id) 
                  ? newMessage 
                  : msg
              );
            }
            
            return [...prevMessages, newMessage];
          });
          
          // Marcar como lida se não for do usuário atual
          if (newMessage.sender_id !== currentUser.id) {
            UnifiedChatService.markMessagesAsRead(conversationId, currentUser.id);
          }
        }
      });

      return () => {
        UnifiedChatService.unsubscribe(subscription);
      };
    }
  }, [currentUser, conversationId]);

  const loadCurrentUser = async () => {
    try {
      const userData = DataUser.getUserData();
      if (userData && userData.id) {
        setCurrentUser(userData);
      } else {
        navigation.navigate('LoginScreen');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      navigation.navigate('LoginScreen');
    }
  };

  const loadMessages = async () => {
    try {
      const result = await UnifiedChatService.getConversationMessages(conversationId);
      if (result.success) {
        setMessages(result.data);
        scrollToBottom();
      } else {
        Alert.alert('Erro', 'Não foi possível carregar as mensagens');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Erro', 'Erro ao carregar mensagens');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMessages();
  }, [conversationId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const sendMessage = async (messageText = newMessage) => {
    const trimmedMessage = messageText.trim();
    if (!trimmedMessage || !currentUser || sending) return;

    setSending(true);
    const originalMessage = newMessage;
    setNewMessage('');

    // Criar mensagem temporária para exibição imediata
    const tempMessage = {
      id: Date.now(), // ID temporário
      content: trimmedMessage,
      sender_id: currentUser.id,
      created_at: new Date().toISOString(),
      sender: currentUser,
      conversation_id: conversationId
    };

    // Adicionar mensagem temporariamente na lista
    setMessages(prevMessages => [...prevMessages, tempMessage]);
    scrollToBottom();

    try {
      const result = await UnifiedChatService.sendMessage(
        conversationId,
        currentUser.id,
        trimmedMessage
      );

      if (!result.success) {
        // Remover mensagem temporária em caso de erro
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMessage.id));
        Alert.alert('Erro', 'Não foi possível enviar a mensagem');
        setNewMessage(originalMessage); // Restaurar mensagem
      }
      // Se sucesso, a mensagem real virá pela subscription
    } catch (error) {
      console.error('Error sending message:', error);
      // Remover mensagem temporária em caso de erro
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== tempMessage.id));
      Alert.alert('Erro', 'Erro ao enviar mensagem');
      setNewMessage(originalMessage); // Restaurar mensagem
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getUserRoleColor = (role) => {
    switch (role) {
      case 'doctor':
      case 'medic':
        return '#28a745';
      case 'patient':
        return '#6A8DFD';
      default:
        return '#6c757d';
    }
  };

  const renderQuickReplies = () => {
    if (!currentUser || currentUser.role !== 'doctor' && currentUser.role !== 'medic') {
      return null;
    }

    const quickReplies = [
      'Olá! Como posso ajudá-lo hoje?',
      'Vamos agendar uma consulta?',
      'Por favor, descreva seus sintomas.',
      'Recomendo que faça este exame.',
      'Continue tomando a medicação conforme orientado.'
    ];

    return (
      <View style={styles.quickRepliesContainer}>
        <Text style={styles.quickRepliesTitle}>Respostas rápidas:</Text>
        <FlatList
          horizontal
          data={quickReplies}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.quickReplyButton}
              onPress={() => sendMessage(item)}
              disabled={sending}
            >
              <Text style={styles.quickReplyText}>{item}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRepliesList}
        />
      </View>
    );
  };

  const renderMessage = ({ item, index }) => {
    const isMyMessage = item.sender_id === currentUser?.id;
    const showTime = index === 0 || 
      new Date(messages[index - 1].created_at).getTime() - new Date(item.created_at).getTime() > 300000;

    return (
      <View style={styles.messageContainer}>
        {showTime && (
          <Text style={styles.messageTime}>
            {formatTime(item.created_at)}
          </Text>
        )}
        
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble
        ]}>
          {!isMyMessage && (
            <Text style={styles.senderName}>
              {item.sender?.fullname || 'Usuário'}
            </Text>
          )}
          
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          
          <Text style={[
            styles.messageTimestamp,
            isMyMessage ? styles.myMessageTimestamp : styles.otherMessageTimestamp
          ]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="chatbubble-outline" size={60} color="#ccc" />
      <Text style={styles.emptyStateText}>
        Inicie a conversa enviando uma mensagem
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A8DFD" />
        <Text style={styles.loadingText}>Carregando conversa...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
              {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          {otherUserImage ? (
            <Image 
              source={{ uri: `data:image/png;base64,${otherUserImage}` }} 
              style={styles.headerAvatar}
            />
          ) : (
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=3' }} 
              style={styles.headerAvatar}
            />
          )}
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUserName}
            </Text>
            <Text style={styles.headerRole}>
              {otherUserRole === 'doctor' || otherUserRole === 'medic' ? 'Médico' : 'Paciente'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="information-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          styles.messagesContainer,
          messages.length === 0 && styles.emptyMessagesContainer
        ]}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
      />

      {/* Quick Replies for Doctors */}
      {renderQuickReplies()}

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Digite uma mensagem..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
            editable={!sending}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={() => sendMessage()}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#6A8DFD',
    paddingTop: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messagesContainer: {
    padding: 16,
    flexGrow: 1,
  },
  emptyMessagesContainer: {
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  messageContainer: {
    marginVertical: 2,
  },
  messageTime: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginVertical: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
    marginVertical: 2,
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6A8DFD',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6A8DFD',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#333',
  },
  messageTimestamp: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherMessageTimestamp: {
    color: '#666',
  },
  quickRepliesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  quickRepliesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginBottom: 8,
  },
  quickRepliesList: {
    paddingHorizontal: 16,
  },
  quickReplyButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  quickReplyText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6A8DFD',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
});

export default UnifiedChatScreen; 