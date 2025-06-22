import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DataUser from '../../../navigation/DataUser';
import UnifiedChatService from '../../services/UnifiedChatService';
import supabase from '../../../supabase';

const ChatListScreen = ({ navigation }) => {
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const user = await DataUser.getUserData();
      
      if (user) {
        setCurrentUser(user);
        await loadConversations(user);
      } else {
        Alert.alert('Erro', 'Usuário não encontrado. Faça login novamente.');
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('Erro ao inicializar tela:', error);
      Alert.alert('Erro', 'Falha ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async (user = currentUser) => {
    try {
      const result = await UnifiedChatService.getUserConversations(user.id);
      if (result.success) {
        setConversations(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  const loadContacts = async (user = currentUser) => {
    setLoadingContacts(true);
    try {
      const result = await UnifiedChatService.getAvailableContacts(user.id, user.role);
      
      if (result.success) {
        setContacts(result.data);
      } else {
        Alert.alert('Erro', result.error || 'Não foi possível carregar os contatos');
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os contatos');
    } finally {
      setLoadingContacts(false);
    }
  };

  const startNewChat = async (contact) => {
    try {
      const result = await UnifiedChatService.getOrCreateConversation(currentUser.id, contact.id);
      if (result.success) {
        setShowModal(false);
        navigation.navigate('ChatScreen', {
          conversationId: result.data.id,
          otherUserId: contact.id,
          otherUserName: contact.fullname,
          otherUserImage: contact.pfpimg,
          otherUserRole: contact.role
        });
      } else {
        Alert.alert('Ops!', 'Não foi possível iniciar a conversa');
      }
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      Alert.alert('Erro', 'Algo deu errado. Tente novamente!');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleOpenModal = () => {
    setShowModal(true);
    loadContacts();
  };



  const filteredContacts = contacts.filter(contact => {
    if (!searchText || !searchText.trim()) {
      return true;
    }
    const search = searchText.toLowerCase();
    return (contact.fullname || '').toLowerCase().includes(search) ||
           (contact.role || '').toLowerCase().includes(search);
  });

  const renderConversationItem = ({ item }) => {
    const otherUser = item.otherParticipant;
    const isUnread = item.last_message_sender_id && item.last_message_sender_id !== currentUser?.id;

    return (
      <TouchableOpacity
        style={[styles.conversationItem, isUnread && styles.unreadItem]}
        onPress={() => navigation.navigate('ChatScreen', {
          conversationId: item.id,
          otherUserId: otherUser.id,
          otherUserName: otherUser.fullname || 'Usuário',
          otherUserImage: otherUser.pfpimg,
          otherUserRole: otherUser.role
        })}
      >
        <View style={styles.avatarContainer}>
          {otherUser?.pfpimg ? (
            <Image 
              source={{ uri: `data:image/png;base64,${otherUser.pfpimg}` }}
              style={styles.avatar}
            />
          ) : (
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=3' }}
              style={styles.avatar}
            />
          )}
          {(otherUser.role === 'doctor' || otherUser.role === 'medic') && (
            <View style={styles.doctorBadge}>
              <Text style={styles.doctorBadgeText}>Dr</Text>
            </View>
          )}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, isUnread && styles.unreadUserName]}>
              {otherUser.fullname || 'Usuário'}
            </Text>
            {item.last_message_at && (
              <Text style={styles.timeText}>
                {formatTime(item.last_message_at)}
              </Text>
            )}
          </View>

          {item.last_message && (
            <Text style={[styles.lastMessage, isUnread && styles.unreadMessage]} numberOfLines={2}>
              {item.last_message_sender_id === currentUser?.id ? 'Você: ' : ''}
              {item.last_message}
            </Text>
          )}

          <Text style={styles.roleText}>
            {otherUser.role === 'doctor' || otherUser.role === 'medic' ? 'Médico' : 'Paciente'}
          </Text>
        </View>

        {isUnread && <View style={styles.unreadIndicator} />}
      </TouchableOpacity>
    );
  };

  const renderContactItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={{
          padding: 16,
          backgroundColor: '#ffffff',
          marginVertical: 4,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}
        onPress={() => startNewChat(item)}
      >
        <View style={{
          position: 'relative',
          marginRight: 12
        }}>
          {item.pfpimg ? (
            <Image 
              source={{ uri: `data:image/png;base64,${item.pfpimg}` }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20
              }}
            />
          ) : (
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=3' }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20
              }}
            />
          )}
          {(item.role === 'doctor' || item.role === 'medic') && (
            <View style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              backgroundColor: '#FF6B6B',
              borderRadius: 6,
              paddingHorizontal: 3,
              paddingVertical: 1,
              borderWidth: 2,
              borderColor: '#fff'
            }}>
              <Text style={{
                color: '#fff',
                fontSize: 8,
                fontWeight: 'bold'
              }}>Dr</Text>
            </View>
          )}
        </View>

        <View style={{flex: 1}}>
          <Text style={{fontSize: 16, fontWeight: 'bold', color: '#333'}}>
            {item.fullname || 'Usuário'}
          </Text>
          <Text style={{fontSize: 14, color: '#666'}}>
            {item.role === 'doctor' || item.role === 'medic' ? 'Médico' : 'Usuário'}
          </Text>
        </View>

        <View style={{
          backgroundColor: '#6A8DFD',
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 20,
        }}>
          <Text style={{color: '#fff', fontSize: 12, fontWeight: '600'}}>
            Conversar
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
      <StatusBar barStyle="light-content" backgroundColor="#6A8DFD" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>💬 Conversas</Text>
          {conversations.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {conversations.length} {conversations.length === 1 ? 'conversa' : 'conversas'}
            </Text>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleOpenModal}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color="#6A8DFD" />
          </View>
          <Text style={styles.emptyTitle}>✨ Suas conversas aparecerão aqui</Text>
          <Text style={styles.emptySubtitle}>
            Comece uma nova conversa com médicos ou outros usuários
          </Text>
          <TouchableOpacity style={styles.startButton} onPress={handleOpenModal}>
            <Ionicons name="add-circle" size={20} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.startButtonText}>Nova Conversa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderConversationItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Encontrar Pessoas</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Pesquisar..."
                  placeholderTextColor="#999"
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>

              {loadingContacts ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color="#6A8DFD" />
                  <Text style={styles.modalLoadingText}>✨ Buscando contatos...</Text>
                </View>
              ) : (
                <View style={{flex: 1}}>
                  {filteredContacts.length > 0 ? (
                    <View style={{flex: 1}}>
                      <Text style={styles.contactsCounter}>
                        📋 {filteredContacts.length} {filteredContacts.length === 1 ? 'contato disponível' : 'contatos disponíveis'}
                      </Text>
                      <FlatList
                        data={filteredContacts}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderContactItem}
                        showsVerticalScrollIndicator={false}
                        style={{flex: 1}}
                        contentContainerStyle={{paddingBottom: 20}}
                      />
                    </View>
                  ) : (
                    <View style={styles.noContacts}>
                      <View style={styles.noContactsIcon}>
                        <Ionicons 
                          name={searchText ? "search-outline" : "people-outline"} 
                          size={50} 
                          color="#6A8DFD" 
                        />
                      </View>
                      <Text style={styles.noContactsTitle}>
                        {searchText ? '🔍 Nenhum resultado' : '👥 Todos já são seus contatos!'}
                      </Text>
                      <Text style={styles.noContactsText}>
                        {searchText 
                          ? 'Tente pesquisar com outros termos' 
                          : 'Você já tem conversas com todos os usuários disponíveis'
                        }
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
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
    backgroundColor: '#6A8DFD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(106, 141, 253, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#6A8DFD',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#6A8DFD',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactsCounter: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginBottom: 8,
  },
  listContainer: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  unreadItem: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#6A8DFD',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  doctorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  doctorBadgeText: {
    color: '#fff',
    fontSize: 8,
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
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  unreadUserName: {
    color: '#6A8DFD',
  },
  timeText: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  unreadMessage: {
    color: '#333',
    fontWeight: '500',
  },
  roleText: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6A8DFD',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    minHeight: 400,
  },
  modalHeader: {
    backgroundColor: '#6A8DFD',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  contactDoctorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  contactRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  noContacts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noContactsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(106, 141, 253, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noContactsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noContactsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ChatListScreen; 