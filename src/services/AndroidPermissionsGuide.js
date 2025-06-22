import { Alert, Platform } from 'react-native';

class AndroidPermissionsGuide {
  static showManualPermissionGuide() {
    Alert.alert(
      '📱 Configurar Permissões Manualmente',
      `Se as permissões de Bluetooth não aparecem automaticamente, siga estes passos:

**MÉTODO 1 - Configurações do App:**
1. 📱 Vá em Configurações do Android
2. 🔍 Procure por "Apps" ou "Aplicativos"
3. 📋 Encontre "HealthMate" na lista
4. ⚙️ Toque em "Permissões" ou "Permissions"
5. ✅ Ative todas as permissões disponíveis:
   • Localização
   • Bluetooth (se aparecer)
   • Dispositivos próximos

**MÉTODO 2 - Configurações de Bluetooth:**
1. 📱 Vá em Configurações > Bluetooth
2. ⚙️ Toque no ícone de configurações (engrenagem)
3. 📋 Procure por "Permissões de aplicativo"
4. ✅ Ative para "HealthMate"

**MÉTODO 3 - Se nada aparecer:**
• Reinstale o app
• Reinicie o telefone
• Atualize o Android se possível`,
      [
        { text: 'Abrir Configurações', onPress: () => {
          const { Linking } = require('react-native');
          Linking.openSettings();
        }},
        { text: 'Entendi' }
      ]
    );
  }

  static showBluetoothActivationGuide() {
    Alert.alert(
      '📡 Como Ativar o Bluetooth',
      `**ATIVAR BLUETOOTH:**

1. 📱 Vá em Configurações do Android
2. 🔍 Procure por "Bluetooth" ou "Conexões"
3. 📡 Ative o Bluetooth
4. ✅ Certifique-se que está "Visível" ou "Detectável"

**PARA WEARABLES:**

1. ⌚ Ligue seu smartwatch/wearable
2. 🔋 Certifique-se que tem bateria
3. 📡 Ative Bluetooth no wearable também
4. 📍 Mantenha próximo (< 10 metros)

**TROUBLESHOOTING:**
• Reinicie o Bluetooth (desligar e ligar)
• Remova pareamentos antigos se houver
• Reinicie ambos os dispositivos`,
      [{ text: 'Entendi' }]
    );
  }

  static showCompatibilityInfo() {
    Alert.alert(
      '📋 Compatibilidade de Dispositivos',
      `**DISPOSITIVOS QUE FUNCIONAM MELHOR:**

🟢 **ALTA COMPATIBILIDADE:**
• Monitores de frequência cardíaca genéricos
• Balanças inteligentes com BLE
• Termômetros médicos Bluetooth
• Oxímetros com Bluetooth LE

🟡 **COMPATIBILIDADE MÉDIA:**
• Samsung Galaxy Watch (limitado)
• Amazfit (alguns modelos)
• Xiaomi Mi Band (básico)
• Smartwatches Android genéricos

🔴 **INCOMPATÍVEIS (Protocolos fechados):**
• Huawei Watch GT/GT2/GT3 (protocolos proprietários fechados)
• Apple Watch (só funciona com iPhone)
• Fitbit (requer app oficial + API específica)
• Garmin (protocolos proprietários)

**IMPORTANTE:**
Este app funciona APENAS com dispositivos que seguem os padrões Bluetooth LE oficiais (Bluetooth SIG). 

**Para Huawei Watch GT/GT2/GT3:**
❌ Acesso direto via BLE é IMPOSSÍVEL
✅ Alternativas: Exportar dados do Huawei Health em CSV
✅ Ou usar Google Fit se Huawei Health sincronizar`,
      [{ text: 'Entendi' }]
    );
  }

  static showFullSetupGuide() {
    Alert.alert(
      '🔧 Guia Completo de Configuração',
      `**PASSO A PASSO COMPLETO:**

**1. PREPARAR O ANDROID:**
✅ Ative o Bluetooth
✅ Ative a Localização/GPS
✅ Mantenha o telefone desbloqueado

**2. PREPARAR O WEARABLE:**
✅ Carregue a bateria (mín. 30%)
✅ Ligue o dispositivo
✅ Ative Bluetooth no wearable
✅ Coloque próximo ao telefone

**3. CONFIGURAR PERMISSÕES:**
✅ Abra o app HealthMate
✅ Vá em Diário Médico > Smartwatch
✅ Aceite todas as permissões solicitadas
✅ Se não aparecer, configure manualmente

**4. TESTAR CONEXÃO:**
✅ Clique em "Testar" no app
✅ Clique em "Buscar Wearables"
✅ Selecione seu dispositivo
✅ Teste a coleta de dados

Se nada funcionar, o dispositivo pode usar protocolos proprietários.`,
      [
        { text: 'Configurar Permissões', onPress: () => this.showManualPermissionGuide() },
        { text: 'Ativar Bluetooth', onPress: () => this.showBluetoothActivationGuide() },
        { text: 'OK' }
      ]
    );
  }
}

export default AndroidPermissionsGuide; 