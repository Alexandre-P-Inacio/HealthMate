import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView
} from 'react-native';
import UnifiedChatService from '../../services/UnifiedChatService';
import DataUser from '../../../navigation/DataUser';
import { Ionicons } from '@expo/vector-icons';

const ConversationsScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Carregar usuário atual
  const loadUser = async () => {
    try {
      const userData = DataUser.getUserData();
      if (userData?.id) {
        setCurrentUser(userData);
        return userData;
      } else {
        navigation.navigate('Login');
        return null;
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      navigation.navigate('Login');
      return null;
    }
  };

  // Carregar conversas
  const loadConversations = async (user = currentUser) => {
    if (!user) return;

    try {
      const result = await UnifiedChatService.getUserConversations(user.id);
      if (result.success) {
        setConversations(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar contatos disponíveis
  const loadContacts = async (user = currentUser) => {
    if (!user) return;

    setLoadingContacts(true);
    try {
      const result = await UnifiedChatService.getAvailableContacts(user.id);
      if (result.success) {
        console.log('Contatos carregados:', result.data?.length || 0);
        setContacts(result.data || []);
      } else {
        console.error('Erro ao carregar contatos:', result.error);
        Alert.alert('Erro', 'Não foi possível carregar os contatos');
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      Alert.alert('Erro', 'Erro ao carregar contatos');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Inicialização
  useEffect(() => {
    const initialize = async () => {
      const user = await loadUser();
      if (user) {
        await loadConversations(user);
        await loadContacts(user);
      }
    };
    initialize();
  }, []);

  // Refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, [currentUser]);

  // Iniciar nova conversa
  const startChat = async (contactId, contactName, contactImage, contactRole) => {
    try {
      const result = await UnifiedChatService.getOrCreateConversation(currentUser.id, contactId);
      if (result.success) {
        setShowModal(false);
        navigation.navigate('UnifiedChatScreen', {
          conversationId: result.data.id,
          otherUserId: contactId,
          otherUserName: contactName,
          otherUserImage: contactImage,
          otherUserRole: contactRole
        });
      } else {
        Alert.alert('Erro', 'Não foi possível iniciar a conversa');
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      Alert.alert('Erro', 'Erro ao iniciar conversa');
    }
  };

  // Abrir modal e carregar contatos
  const openModal = () => {
    setShowModal(true);
    loadContacts();
  };

  // Filtrar contatos
  const filteredContacts = contacts.filter(contact => {
    if (!searchText.trim()) return true;
    
    const search = searchText.toLowerCase();
    const name = (contact.fullname || '').toLowerCase();
    const role = (contact.role || '').toLowerCase();
    
    return name.includes(search) || role.includes(search);
  });

  // Formatação de horário
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return `${days} dias`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  // Cor da role
  const getRoleColor = (role) => {
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

  // Texto da role
  const getRoleText = (role) => {
    switch (role) {
      case 'doctor':
      case 'medic':
        return 'Médico';
      case 'patient':
        return 'Paciente';
      case 'admin':
        return 'Administrador';
      case 'nurse':
        return 'Enfermeiro(a)';
      default:
        return 'Usuário';
    }
  };

  // Renderizar conversa
  const renderConversation = ({ item }) => {
    const otherUser = item.otherParticipant;
    const isUnread = item.last_message_sender_id && item.last_message_sender_id !== currentUser?.id;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, isUnread && styles.unreadItem]}
        onPress={() => navigation.navigate('UnifiedChatScreen', {
          conversationId: item.id,
          otherUserId: otherUser.id,
          otherUserName: otherUser.fullname || 'Usuário',
          otherUserImage: otherUser.pfpimg,
          otherUserRole: otherUser.role
        })}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={
              otherUser?.pfpimg 
                ? { uri: `data:image/png;base64,${otherUser.pfpimg}` }
                : { uri: 'https://i.pravatar.cc/150?img=3' }
            }
            style={styles.avatar}
          />
          <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(otherUser.role) }]}>
            <Text style={styles.roleIndicatorText}>
              {otherUser.role === 'doctor' || otherUser.role === 'medic' ? 'Dr' : 'P'}
            </Text>
          </View>
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, isUnread && styles.unreadText]}>
              {otherUser.fullname || 'Usuário'}
            </Text>
            {item.last_message_at && (
              <Text style={styles.timeText}>{formatTime(item.last_message_at)}</Text>
            )}
          </View>
          
          {item.last_message && (
            <Text style={[styles.lastMessage, isUnread && styles.unreadMessage]} numberOfLines={1}>
              {item.last_message_sender_id === currentUser?.id ? 'Você: ' : ''}
              {item.last_message}
            </Text>
          )}
        </View>

        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  // Renderizar contato
  const renderContact = ({ item }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => startChat(item.id, item.fullname, item.pfpimg, item.role)}
    >
      <View style={styles.avatarContainer}>
        <Image 
          source={
            item.pfpimg 
              ? { uri: `data:image/png;base64,${item.pfpimg}` }
              : { uri: 'https://i.pravatar.cc/150?img=3' }
          }
          style={styles.avatar}
        />
        <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.roleIndicatorText}>
            {item.role === 'doctor' || item.role === 'medic' ? 'Dr' : 'P'}
          </Text>
        </View>
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.fullname || 'Usuário'}</Text>
        <Text style={styles.contactRole}>{getRoleText(item.role)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Loading inicial
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6A8DFD" />
        <Text style={styles.loadingText}>Carregando conversas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Conversas</Text>
        
        <TouchableOpacity style={styles.addButton} onPress={openModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Lista de conversas */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderConversation}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhuma conversa ainda</Text>
            <Text style={styles.emptyText}>Toque no botão + para iniciar uma nova conversa</Text>
          </View>
        )}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : null}
      />

      {/* Modal Nova Conversa */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Conversa</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Busca */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar contatos..."
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>

            {/* Lista de contatos */}
            {loadingContacts ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#6A8DFD" />
                <Text style={styles.modalLoadingText}>Carregando contatos...</Text>
              </View>
            ) : filteredContacts.length > 0 ? (
              <FlatList
                data={filteredContacts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderContact}
                style={styles.contactsList}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.emptyContacts}>
                <Ionicons name="people-outline" size={60} color="#ccc" />
                <Text style={styles.emptyContactsTitle}>
                  {searchText ? 'Nenhum contato encontrado' : 'Nenhum contato disponível'}
                </Text>
                <Text style={styles.emptyContactsText}>
                  {searchText 
                    ? 'Tente pesquisar por outro nome'
                    : 'Não há outros usuários no momento'
                  }
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#6A8DFD',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  addButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    alignItems: 'center',
  },
  unreadItem: {
    backgroundColor: '#f8f9ff',
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  roleIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  roleIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 12,
    color: '#6c757d',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6c757d',
  },
  unreadMessage: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6A8DFD',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 10,
  },
  modalLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 14,
    color: '#6c757d',
  },
  emptyContacts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyContactsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyContactsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ConversationsScreen; 