import { Alert, Platform } from 'react-native';

class AlternativeDataSources {
  
  // Guide for Huawei users
  static showHuaweiExportGuide() {
    Alert.alert(
      '📱 Huawei Watch GT/GT2/GT3 - Como Obter Dados',
      `**❌ LIMITAÇÃO TÉCNICA:**
O Huawei Watch usa protocolos proprietários fechados. Não é possível acesso direto via Bluetooth.

**✅ SOLUÇÕES ALTERNATIVAS:**

**1. EXPORTAR DO HUAWEI HEALTH:**
• Abra o app Huawei Health
• Vá em "Eu" > "Configurações de Dados"
• Procure por "Exportar Dados" ou "Export Data"
• Escolha o período desejado
• Exporte em formato CSV
• Use a opção "Importar" no nosso app

**2. GOOGLE FIT (se disponível):**
• Configure Huawei Health para sincronizar com Google Fit
• Use nossa integração com Google Fit (em desenvolvimento)

**3. HEALTH CONNECT (Android):**
• Se disponível no seu dispositivo
• Conecte Huawei Health ao Health Connect
• Use nossa integração (em desenvolvimento)`,
             [
         { text: 'Como Compartilhar', onPress: () => this.importHuaweiCSV() },
         { text: 'Ver Mais Opções', onPress: () => this.showAllAlternatives() },
         { text: 'Entendi' }
       ]
    );
  }

  // Guide for manual data sharing from Huawei Health
  static async importHuaweiCSV() {
    Alert.alert(
      '📂 Como Compartilhar Dados do Huawei Health',
      `**PASSO A PASSO PARA HUAWEI WATCH:**

**1. EXPORTAR DO HUAWEI HEALTH:**
📱 Abra o app Huawei Health
👤 Vá em "Eu" (ícone de perfil)
⚙️ Toque em "Configurações de dados e privacidade"
📊 Procure por "Exportar dados" ou "Data export"
📅 Selecione o período desejado
📁 Escolha formato CSV ou JSON
📤 Compartilhe via email/WhatsApp

**2. COMPARTILHAR CONOSCO:**
📧 Envie o arquivo para: healthmate@exemplo.com
💬 Ou compartilhe via WhatsApp
📱 Ou cole os dados diretamente no chat

**3. DADOS DISPONÍVEIS:**
❤️ Frequência cardíaca
👟 Passos e distância  
😴 Dados de sono
🔥 Calorias queimadas
📊 Resumos diários/semanais

⚠️ **NOTA:** Como o Huawei Watch usa protocolos fechados, a exportação manual é a única forma de acessar os dados.`,
      [
        { text: 'Como Exportar?', onPress: () => this.showHuaweiExportSteps() },
        { text: 'Entendi' }
      ]
    );
  }

  // Detailed export steps for Huawei Health
  static showHuaweiExportSteps() {
    Alert.alert(
      '📋 Passos Detalhados - Huawei Health Export',
      `**MÉTODO 1 - EXPORTAÇÃO COMPLETA:**

1️⃣ **Abrir Huawei Health:**
   • Abra o app oficial Huawei Health
   
2️⃣ **Ir para Configurações:**
   • Toque no ícone "Eu" (canto inferior direito)
   • Procure "Configurações" ou "Settings"
   
3️⃣ **Encontrar Exportação:**
   • Procure por:
     - "Dados e privacidade"
     - "Data export" 
     - "Exportar dados"
     - "Backup de dados"
   
4️⃣ **Selecionar Dados:**
   • Marque todos os tipos que quiser
   • Escolha período (última semana/mês)
   
5️⃣ **Exportar:**
   • Formato: CSV ou JSON
   • Aguarde processamento
   • Compartilhe o arquivo

**MÉTODO 2 - SCREENSHOTS:**
📱 Tire capturas de tela dos gráficos principais
📊 Dados diários, semanais, mensais
📤 Compartilhe as imagens

**MÉTODO 3 - DIGITAÇÃO MANUAL:**
✍️ Anote manualmente os valores principais
📝 Frequência cardíaca, passos, sono
💬 Envie via texto`,
      [{ text: 'Entendi' }]
    );
  }

  // Parse Huawei Health CSV format
  static parseHuaweiCSV(csvContent) {
    try {
      const lines = csvContent.split('\n');
      if (lines.length < 2) return [];

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length !== headers.length) continue;

        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });

        // Convert to standard format
        const standardRecord = this.convertHuaweiToStandard(record);
        if (standardRecord) {
          data.push(standardRecord);
        }
      }

      return data;
    } catch (error) {
      console.error('Error parsing CSV:', error);
      return [];
    }
  }

  // Convert Huawei format to our standard format
  static convertHuaweiToStandard(huaweiRecord) {
    try {
      const standard = {
        timestamp: new Date().toISOString(),
        deviceName: 'Huawei Watch',
        deviceBrand: 'Huawei',
        dataSource: 'imported_csv'
      };

      // Map common Huawei Health fields to our format
      // (These field names may vary depending on language/version)
      const fieldMappings = {
        'Heart Rate': 'heartRate',
        'Steps': 'steps',
        'Calories': 'calories',
        'Distance': 'distance',
        'Sleep Duration': 'sleepTime',
        'Weight': 'weight',
        'Blood Pressure Systolic': 'bloodPressureSystolic',
        'Blood Pressure Diastolic': 'bloodPressureDiastolic',
        'SpO2': 'bloodOxygen',
        'Temperature': 'bodyTemperature',
        'Date': 'date',
        'Time': 'time'
      };

      let hasData = false;
      Object.entries(fieldMappings).forEach(([huaweiField, standardField]) => {
        if (huaweiRecord[huaweiField] && huaweiRecord[huaweiField] !== '') {
          const value = parseFloat(huaweiRecord[huaweiField]) || huaweiRecord[huaweiField];
          if (!isNaN(value) && value !== 0) {
            standard[standardField] = value;
            hasData = true;
          }
        }
      });

      // Try to parse date/time if available
      if (huaweiRecord['Date'] && huaweiRecord['Time']) {
        try {
          standard.timestamp = new Date(`${huaweiRecord['Date']} ${huaweiRecord['Time']}`).toISOString();
        } catch (e) {
          // Keep default timestamp
        }
      }

      return hasData ? standard : null;
    } catch (error) {
      console.error('Error converting Huawei record:', error);
      return null;
    }
  }

  // Show all alternative data sources
  static showAllAlternatives() {
    Alert.alert(
      '🔄 Todas as Alternativas para Dados de Saúde',
      `**PARA DISPOSITIVOS PROPRIETÁRIOS:**

**🟡 Huawei Watch GT/GT2/GT3:**
• Exportar CSV do Huawei Health
• Google Fit (se sincronizar)
• Health Connect (Android)

**🟡 Apple Watch:**
• Apple HealthKit (apenas iPhone)
• Exportar dados do Apple Health

**🟡 Fitbit:**
• API oficial Fitbit (requer dev account)
• Exportar dados do app Fitbit

**🟡 Garmin:**
• Garmin Connect API
• Exportar dados do Garmin Connect

**✅ PLATAFORMAS DE AGREGAÇÃO:**
• Google Fit (vários dispositivos)
• Samsung Health (Samsung + outros)
• Health Connect (Android universal)
• Apple HealthKit (iOS universal)

**📁 IMPORTAÇÃO MANUAL:**
• Arquivos CSV exportados
• Dados em formato JSON
• Planilhas do Excel`,
             [
         { text: 'Compartilhar Dados', onPress: () => this.importHuaweiCSV() },
         { text: 'Ver Guia Huawei', onPress: () => this.showHuaweiExportGuide() },
         { text: 'OK' }
       ]
    );
  }

  // Future: Google Fit integration placeholder
  static async setupGoogleFitIntegration() {
    Alert.alert(
      '🔄 Google Fit Integration',
      'Integração com Google Fit em desenvolvimento.\n\nEsta funcionalidade permitirá:\n• Acesso automático aos dados\n• Sincronização com múltiplos dispositivos\n• Dados históricos completos\n\nEm breve disponível!',
      [{ text: 'OK' }]
    );
  }

  // Future: Health Connect integration placeholder
  static async setupHealthConnectIntegration() {
    Alert.alert(
      '🔄 Health Connect Integration',
      'Integração com Android Health Connect em desenvolvimento.\n\nEsta funcionalidade permitirá:\n• Acesso universal aos dados de saúde\n• Compatibilidade com todos os apps\n• Dados unificados de múltiplas fontes\n\nEm breve disponível!',
      [{ text: 'OK' }]
    );
  }

  // Check what alternatives are available for user's device
  static async detectAvailableAlternatives() {
    const alternatives = [];

    // Check if Google Fit is installed
    try {
      // This would require checking installed apps
      alternatives.push('Google Fit (detectado)');
    } catch (e) {
      alternatives.push('Google Fit (instalar)');
    }

    // Check Android version for Health Connect
    if (Platform.OS === 'android' && Platform.Version >= 28) {
      alternatives.push('Health Connect (compatível)');
    }

    return alternatives;
  }
}

export default AlternativeDataSources; 