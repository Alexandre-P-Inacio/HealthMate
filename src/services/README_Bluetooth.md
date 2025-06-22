# Bluetooth Wearable Integration

## Funcionalidades Implementadas

O sistema de integração com wearables via Bluetooth Low Energy (BLE) permite conectar com dispositivos reais de qualquer marca e coletar dados de saúde genuínos.

### ✅ O que funciona:

1. **Detecção Automática de Wearables**
   - Busca por dispositivos Bluetooth LE próximos
   - Filtra apenas dispositivos wearables (smartwatches, fitness trackers)
   - Identifica marcas automaticamente (Apple, Samsung, Garmin, Fitbit, etc.)

2. **Conexão Real via BLE**
   - Conecta com dispositivos usando protocolos BLE padrão
   - Descobre serviços e características disponíveis
   - Estabelece conexão segura

3. **Coleta de Dados de Saúde**
   - ❤️ Frequência cardíaca (Heart Rate Service)
   - 🔋 Nível da bateria (Battery Service)
   - 👟 Contagem de passos (Fitness Machine Service)
   - 🌡️ Temperatura corporal (Health Thermometer Service)
   - 🩺 Pressão arterial (Blood Pressure Service)
   - 🩸 Oxigenação do sangue SpO2 (Pulse Oximeter Service)
   - ⚖️ Peso (Weight Scale Service)

4. **Monitoramento em Tempo Real**
   - Subscrição para notificações automáticas
   - Atualização de dados conforme disponível
   - Modo polling como fallback

5. **Armazenamento de Dados**
   - Salva na database Supabase
   - Integra com o diário médico
   - Histórico de dados por data

### 🛠️ Como usar:

```javascript
import BluetoothWearableService from './BluetoothWearableService';

// 1. Buscar dispositivos
const devices = await BluetoothWearableService.scanForWearableDevices();

// 2. Conectar com um dispositivo
const result = await BluetoothWearableService.connectToDevice(deviceId, deviceName);

// 3. Ler dados de saúde
const healthData = await BluetoothWearableService.readHealthData();

// 4. Salvar na database
await BluetoothWearableService.saveHealthDataToSupabase(userId, healthData);

// 5. Desconectar
await BluetoothWearableService.disconnect();
```

### 🔧 Configuração Necessária:

1. **Permissões Android** (já configuradas):
   ```xml
   <uses-permission android:name="android.permission.BLUETOOTH"/>
   <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
   <uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
   ```

2. **Features BLE**:
   ```xml
   <uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>
   ```

3. **Dependências** (já instaladas):
   - `react-native-ble-plx@3.5.0`
   - `buffer`

### 📊 Serviços BLE Suportados:

| Serviço | UUID | Funcionalidade |
|---------|------|----------------|
| Heart Rate | 0x180D | Frequência cardíaca |
| Battery Service | 0x180F | Nível da bateria |
| Device Information | 0x180A | Info do dispositivo |
| Fitness Machine | 0x1826 | Passos, distância |
| Health Thermometer | 0x1809 | Temperatura |
| Blood Pressure | 0x1810 | Pressão arterial |
| Pulse Oximeter | 0x1822 | SpO2 |
| Weight Scale | 0x181D | Peso |

### ⚠️ Limitações Importantes:

1. **Protocolos Proprietários**: 
   - **Huawei Watch GT/GT2/GT3**: Protocolos completamente fechados, impossível acesso direto via BLE
   - **Apple Watch**: Só funciona com iPhone/HealthKit
   - **Fitbit**: Requer app oficial e APIs específicas da marca
   - **Garmin**: Usa protocolos proprietários, acesso limitado

2. **Compatibilidade BLE**: Apenas dispositivos que seguem padrões Bluetooth SIG funcionam completamente

3. **Autenticação**: Alguns dispositivos requerem pareamento pelo app oficial primeiro

4. **iOS**: Permissões mais restritivas que Android

### 🐛 Troubleshooting:

**Dispositivo não encontrado:**
- Certifique-se que o Bluetooth está ativo
- Verifique se o wearable está ligado e próximo
- Alguns dispositivos precisam estar no modo "pareável"

**Erro de conexão:**
- Dispositivo pode estar conectado a outro telefone
- Tente reiniciar o Bluetooth 
- Verifique se tem as permissões necessárias

**Nenhum dado coletado:**
- Dispositivo pode não implementar serviços BLE padrão
- Alguns wearables precisam do app oficial para funcionar
- Verifique se o dispositivo está transmitindo dados

### 🔄 Fluxo de Uso no App:

1. Usuário clica no botão "Smartwatch" no Diário Médico
2. App abre modal com opção "Buscar Wearables"
3. Sistema escaneia e lista dispositivos encontrados
4. Usuário seleciona um dispositivo para conectar
5. App estabelece conexão BLE
6. Usuário pode coletar dados ou ativar modo tempo real
7. Dados podem ser salvos na database ou adicionados ao diário
8. Usuário pode desconectar quando terminar

### 📱 Interface do Usuário:

- ✅ Indicador visual de dispositivo conectado
- 🔄 Modo tempo real com animação de pulso
- 📊 Visualização dos dados coletados
- 💾 Opções de salvamento (Database ou Diário)
- 🔌 Botão de desconexão

### 🔄 Alternativas para Dispositivos Proprietários:

**Para Huawei Watch GT/GT2/GT3:**
1. **Exportação Manual**: Usuário exporta dados do app Huawei Health em CSV
2. **Google Fit Integration**: Se Huawei Health sincronizar com Google Fit
3. **Health Connect**: Integração via Android Health Connect (se disponível)

**Para outros dispositivos fechados:**
1. **APIs Oficiais**: Usar APIs dos fabricantes quando disponíveis
2. **Plataformas de Agregação**: Google Fit, Apple HealthKit, Samsung Health
3. **Exportação de Dados**: Leitura de arquivos exportados pelos apps oficiais

### 🚀 Futuras Melhorias:

- [ ] Integração com Google Fit/Health Connect
- [ ] Suporte para leitura de arquivos CSV exportados
- [ ] APIs oficiais de fabricantes (quando disponíveis)
- [ ] Sincronização automática em background
- [ ] Histórico gráfico dos dados
- [ ] Alertas baseados nos dados coletados
- [ ] Suporte para múltiplos dispositivos 