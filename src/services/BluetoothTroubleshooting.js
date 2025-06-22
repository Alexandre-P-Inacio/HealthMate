import { Alert, Platform } from 'react-native';

class BluetoothTroubleshooting {
  static showPermissionGuide() {
    const message = Platform.OS === 'android' 
      ? `**PERMISSÕES ANDROID NECESSÁRIAS:**

📍 **Localização (ACCESS_FINE_LOCATION)**
   • Necessária para escanear dispositivos Bluetooth LE
   • Android requer esta permissão por motivos de privacidade

📡 **Bluetooth (BLUETOOTH_SCAN/CONNECT)** - OBRIGATÓRIAS
   • BLUETOOTH_SCAN: Para descobrir wearables próximos
   • BLUETOOTH_CONNECT: Para conectar com dispositivos
   • Varia entre versões do Android

📡 **Bluetooth (BLUETOOTH_ADVERTISE)** - OPCIONAL
   • Para fazer o telefone anunciar-se via Bluetooth
   • NÃO é necessária para conectar com wearables
   • Pode ser negada sem problemas

**COMO CONCEDER PERMISSÕES:**

1. 📱 Vá em Configurações > Apps > HealthMate > Permissões
2. ✅ Ative "Localização" e "Bluetooth"
3. 🔄 Se perguntado, escolha "Permitir sempre" para localização
4. 🔄 Reinicie o app e tente novamente

**TROUBLESHOOTING:**
• Se as permissões não aparecem, reinstale o app
• Alguns Android podem pedir permissões durante o uso
• Certifique-se que o GPS/localização está ativo`

      : `**PERMISSÕES iOS:**

📍 **Localização**
   • Pode ser solicitada para alguns wearables
   
📡 **Bluetooth**
   • Geralmente é automática no iOS
   • Verifique em Configurações > Privacidade > Bluetooth`;

    Alert.alert('🔧 Guia de Permissões', message, [{ text: 'Entendi' }]);
  }

  static showConnectionGuide() {
    Alert.alert(
      '🔗 Guia de Conexão com Wearables',
      `**PREPARAÇÃO DO DISPOSITIVO:**

⌚ **Smartwatch/Wearable:**
   • Ligue o dispositivo
   • Certifique-se que a bateria não está baixa
   • Ative o Bluetooth no wearable
   • Mantenha próximo ao telefone (< 10 metros)

📱 **Smartphone:**
   • Ative o Bluetooth
   • Conceda todas as permissões
   • Certifique-se que não há outros apps conectados ao wearable

**MARCAS TESTADAS:**
✅ Apple Watch (limitado)
✅ Samsung Galaxy Watch  
✅ Amazfit
✅ Garmin (alguns modelos)
✅ Fitbit (alguns modelos)
✅ Xiaomi Mi Band

**LIMITAÇÕES:**
⚠️ Nem todos wearables usam protocolos BLE padrão
⚠️ Alguns requerem o app oficial da marca
⚠️ Apple Watch tem limitações no Android`,
      [{ text: 'Entendi' }]
    );
  }

  static showDataCollectionGuide() {
    Alert.alert(
      '📊 Guia de Coleta de Dados',
      `**DADOS SUPORTADOS:**

❤️ **Frequência Cardíaca** (mais comum)
🔋 **Nível da Bateria** (maioria dos dispositivos)
👟 **Passos** (fitness trackers)
🌡️ **Temperatura** (dispositivos médicos)
🩺 **Pressão Arterial** (monitores específicos)
🩸 **SpO2** (oxímetros)
⚖️ **Peso** (balanças inteligentes)

**POR QUE ALGUNS DADOS NÃO APARECEM:**

🔒 **Protocolos Proprietários:**
   • Marcas como Garmin usam protocolos próprios
   • Apple Watch só funciona com iPhone/Apple Health
   • Fitbit requer app oficial para dados completos

📡 **Transmissão Inativa:**
   • Dispositivo pode estar em modo economia
   • Alguns só transmitem durante exercícios
   • Verificar configurações do wearable

🔧 **Solução:**
   • Use o app oficial da marca primeiro
   • Configure o dispositivo para transmitir dados
   • Alguns requerem ativação manual dos sensores`,
      [{ text: 'Entendi' }]
    );
  }

  static showCompatibilityGuide() {
    Alert.alert(
      '⚙️ Compatibilidade de Dispositivos',
      `**NÍVEL DE COMPATIBILIDADE:**

🟢 **ALTA (Funciona bem):**
   • Monitores de frequência cardíaca genéricos
   • Balanças inteligentes BLE
   • Termômetros médicos BLE
   • Oxímetros BLE

🟡 **MÉDIA (Funcionalidade limitada):**
   • Samsung Galaxy Watch (alguns dados)
   • Amazfit (frequência cardíaca)
   • Xiaomi Mi Band (bateria, alguns dados)

🔴 **BAIXA/IMPOSSÍVEL (Protocolos fechados):**
   • Apple Watch (só funciona com iPhone)
   • Huawei Watch GT/GT2/GT3 (protocolos proprietários fechados)
   • Fitbit (requer app oficial + API específica)
   • Garmin (protocolos proprietários)
   • Amazfit (alguns modelos com protocolos fechados)

**IMPORTANTE:**
Este app usa protocolos BLE PADRÃO (Bluetooth Low Energy).

Dispositivos que seguem as especificações oficiais do Bluetooth SIG funcionarão melhor.

Para funcionalidade completa, use sempre o app oficial da marca do seu wearable.`,
      [{ text: 'Entendi' }]
    );
  }

  static showFullTroubleshootingGuide() {
    Alert.alert(
      '🆘 Solução de Problemas Completa',
      `**PROBLEMA: Nenhum dispositivo encontrado**
✅ Verifique permissões (botão "Testar")
✅ Ative Bluetooth no telefone E no wearable
✅ Mantenha dispositivos próximos
✅ Reinicie o Bluetooth em ambos dispositivos

**PROBLEMA: Erro de conexão**
✅ Desconecte de outros dispositivos primeiro
✅ Remova o pareamento antigo (configurações BT)
✅ Reinicie ambos os dispositivos
✅ Tente conectar pelo app oficial primeiro

**PROBLEMA: Conecta mas sem dados**
✅ Dispositivo pode usar protocolos proprietários
✅ Configure o wearable para transmitir dados
✅ Alguns requerem ativação manual dos sensores
✅ Use o app oficial da marca

**ÚLTIMA OPÇÃO:**
Se nada funcionar, o dispositivo pode não ser compatível com protocolos BLE padrão. Use o app oficial da marca para dados completos.`,
      [
        { text: 'Permissões', onPress: () => this.showPermissionGuide() },
        { text: 'Conexão', onPress: () => this.showConnectionGuide() },
        { text: 'OK' }
      ]
    );
  }
}

export default BluetoothTroubleshooting; 