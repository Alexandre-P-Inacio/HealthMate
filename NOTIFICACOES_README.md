# 🔔 Sistema de Notificações HealthMate

## Visão Geral

O sistema de notificações foi completamente implementado e reformulado para fornecer lembretes precisos e confiáveis para medicamentos e consultas médicas.

## ✅ Funcionalidades Implementadas

### 📱 Notificações de Medicamentos
- **Lembretes no horário exato** - Notificação principal quando chega a hora de tomar o medicamento
- **Lembrete de confirmação** - Notificação 5 minutos após a principal caso não seja confirmada
- **Cancelamento automático** - Notificações são canceladas quando o medicamento é confirmado como tomado
- **Reagendamento dinâmico** - Sistema atualiza automaticamente quando novos medicamentos são adicionados

### 🏥 Notificações de Consultas
- **Lembrete de 1 dia antes** - Notificação 24 horas antes da consulta
- **Lembrete de 2 horas antes** - Notificação de preparação
- **Lembrete urgente de 30 minutos** - Notificação final antes da consulta
- **Suporte a consultas personalizadas** - Funciona tanto para consultas com médicos cadastrados quanto personalizadas

### ⚙️ Configurações Avançadas
- **Tela de configurações completa** - Interface para personalizar preferências
- **Estatísticas em tempo real** - Visualização de quantas notificações estão agendadas
- **Teste de notificações** - Função para testar se as notificações estão funcionando
- **Horas de silêncio** - Configuração de períodos sem notificações
- **Controles individuais** - Liga/desliga notificações por tipo (medicamentos, consultas)

## 🏗️ Arquitetura Técnica

### Componentes Principais

#### 1. `NotificationService.js` - Serviço Principal
```javascript
// Exemplo de uso
await NotificationService.scheduleMedicationNotification({
  id: medicationId,
  title: 'Vitamina D',
  scheduled_date: '2024-01-15',
  scheduled_time: '08:00:00',
  dosage: '1'
});
```

**Métodos principais:**
- `scheduleAllMedicationNotifications()` - Agenda todos os medicamentos do usuário
- `scheduleAllAppointmentNotifications()` - Agenda todas as consultas do usuário
- `cancelMedicationNotification(id)` - Cancela notificação específica
- `rescheduleAllNotifications()` - Reagenda todas as notificações

#### 2. `useNotifications.js` - Hook React
```javascript
const { 
  isInitialized, 
  notificationStats, 
  rescheduleAll 
} = useNotifications();
```

**Funcionalidades:**
- Inicialização automática ao fazer login
- Limpeza automática ao fazer logout
- Gestão de listeners de notificações
- Estatísticas em tempo real

#### 3. `NotificationSettingsScreen.js` - Interface de Configuração
- Controles visuais para todas as configurações
- Estatísticas de notificações agendadas
- Funções de teste e manutenção
- Modal para configurar horas de silêncio

### Integração com Serviços Existentes

#### MedicationService
```javascript
// Após criar medicamento, reagenda notificações automaticamente
await NotificationService.scheduleAllMedicationNotifications();
```

#### AppointmentService
```javascript
// Agenda notificações automaticamente ao criar consulta
await NotificationService.scheduleAppointmentNotification(appointmentData);
```

#### MedicationTracker
```javascript
// Cancela notificações quando medicamento é confirmado
await NotificationService.cancelMedicationNotification(medicationId);
```

## 📋 Como Usar

### Para Desenvolvedores

1. **Inicialização Automática**
   - O sistema inicializa automaticamente no `HomeScreen` usando o hook `useNotifications`
   - Não é necessário configuração manual

2. **Adicionar Novo Tipo de Notificação**
   ```javascript
   // Exemplo para notificação de exercício
   static async scheduleExerciseNotification(exerciseData) {
     const notificationId = await Notifications.scheduleNotificationAsync({
       content: {
         title: '🏃‍♀️ Hora do Exercício',
         body: `${exerciseData.title} - ${exerciseData.duration} minutos`,
         data: { 
           type: 'exercise',
           exerciseId: exerciseData.id
         }
       },
       trigger: {
         date: new Date(exerciseData.scheduledDateTime)
       }
     });
     return notificationId;
   }
   ```

3. **Personalizar Manipulação de Notificações**
   ```javascript
   // No useNotifications.js
   const handleNotificationResponse = async (response) => {
     const { type, medicationId, appointmentId } = response.notification.request.content.data || {};
     
     if (type === 'medication') {
       // Navegar para confirmação de medicamento
       navigation.navigate('MedicationTracker');
     } else if (type === 'appointment_reminder') {
       // Navegar para detalhes da consulta
       navigation.navigate('AppointmentsScreen');
     }
   };
   ```

### Para Usuários

1. **Configurar Notificações**
   - Acesse: Menu → Configurações → Notificações
   - Ative/desative tipos de notificação
   - Configure horas de silêncio
   - Teste se as notificações estão funcionando

2. **Gerenciar Medicamentos**
   - Adicione medicamentos no CalendarScreen ou MedicationScheduleScreen
   - As notificações são agendadas automaticamente
   - Confirme quando tomar para cancelar a notificação

3. **Gerenciar Consultas**
   - Agende consultas no AppointmentsScreen
   - Receba lembretes automáticos 1 dia, 2 horas e 30 minutos antes
   - Cancele a consulta para cancelar os lembretes

## 🛠️ Manutenção e Debugging

### Logs e Debugging
O sistema gera logs detalhados para debugging:
```
✅ Notificações agendadas para medicamento Vitamina D: { main: 'notif_123', reminder: 'notif_124' }
✅ 5 notificações de medicamentos agendadas
✅ 2 notificações de consultas agendadas
```

### Ferramentas de Manutenção
1. **Reagendar Todas** - Cancela e recria todas as notificações
2. **Cancelar Todas** - Remove todas as notificações agendadas
3. **Teste de Notificação** - Envia notificação de teste em 5 segundos
4. **Estatísticas** - Mostra quantas notificações estão agendadas

### Resolução de Problemas Comuns

#### Notificações não aparecem
1. Verificar permissões: Configurações → Notificações → Testar
2. Verificar se há notificações agendadas nas estatísticas
3. Reagendar todas as notificações

#### Notificações duplicadas
1. Use "Cancelar Todas" seguido de "Reagendar Todas"
2. Verifique se não há múltiplas instâncias do app rodando

#### Performance
- O sistema agenda apenas notificações dos próximos 7 dias para medicamentos
- Notificações de consultas são agendadas para os próximos 30 dias
- Limpeza automática ao fazer logout

## 🔄 Atualizações Futuras

### Funcionalidades Planejadas
1. **Notificações inteligentes** - Baseadas em padrões de uso
2. **Integração com wearables** - Notificações no smartwatch
3. **Notificações de voz** - Para acessibilidade
4. **Estatísticas de aderência** - Relatórios de compliance

### Melhorias de UX
1. **Actions nas notificações** - Botões "Tomei" / "Lembrar depois"
2. **Notificações rich** - Com imagens e mais informações
3. **Personalização avançada** - Sons personalizados por medicamento
4. **Geofencing** - Lembretes baseados em localização

## 📞 Suporte

Para problemas ou dúvidas sobre o sistema de notificações:
1. Verifique os logs no console
2. Use as ferramentas de teste na tela de configurações
3. Consulte este README para implementação de novas funcionalidades

---

**Status:** ✅ Implementado e Funcional  
**Versão:** 1.0.0  
**Última atualização:** Janeiro 2024 