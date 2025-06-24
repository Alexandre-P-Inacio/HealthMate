# Health Connect Integration

## Visão Geral

O `HealthConnectService.js` fornece uma interface unificada para acessar dados de saúde através do Google Health Connect. Este serviço permite que tanto balança digital quanto wearables sejam acessados de forma consistente.

## Funcionalidades

### 🔗 Integração Unificada com Fallback Inteligente
- **Balança Digital**: Busca dados de peso com prioridade FitDays → Google Fit → Qualquer fonte
- **Wearables**: Busca dados de saúde com prioridade Samsung Health → Google Fit → Qualquer fonte  
- **Fonte Única**: Todos os dados vêm do Health Connect, garantindo consistência
- **Fallback Automático**: Se a fonte preferencial não tem dados, tenta outras automaticamente

### 📊 Dados Suportados

#### 🎯 **Sistema de Prioridade de Fontes**

**Para Dados de Peso (Balança Digital):**
1. **FitDays** (`com.fitdays.fitdays`) - Fonte preferencial
2. **Google Fit** (`com.google.android.apps.fitness`) - Fallback primário  
3. **Qualquer fonte no Health Connect** - Fallback final

**Para Dados de Wearables:**
1. **Samsung Health** (`com.sec.android.app.shealth`) - Fonte preferencial
2. **Google Fit** (`com.google.android.apps.fitness`) - Fallback primário
3. **Qualquer fonte no Health Connect** - Fallback final

#### Balança Digital
- Peso corporal
- Percentual de gordura
- Massa muscular magra
- Massa óssea

#### Wearables
- Frequência cardíaca
- Passos
- Calorias queimadas
- Distância percorrida
- Pressão arterial
- Saturação de oxigênio (SpO2)
- Temperatura corporal
- Dados de sono

## Implementação no MedicalDiaryScreen

### Antes
```javascript
// Balança simulada
const handleConnectDigitalScale = () => {
  Alert.alert('Conectar Balança Digital', 'Simulando conexão...');
};

// Bluetooth direto para wearables
const handleConnectHealthConnect = async () => {
  setSmartwatchModalVisible(true);
  // Lógica de Bluetooth...
};
```

### Depois
```javascript
// Ambos usam Health Connect
const handleConnectDigitalScale = async () => {
  const weightResult = await HealthConnectService.getWeightData(14);
  // Processa dados de peso...
};

const handleConnectHealthConnect = async () => {
  const wearableResult = await HealthConnectService.getWearableHealthData(1);
  // Processa dados de wearables...
};
```

## Benefícios

### ✅ Para o Usuário
- **Interface Unificada**: Mesma experiência para balança e wearables
- **Dados Consolidados**: Todos os apps de saúde em um só lugar
- **Maior Compatibilidade**: Suporte a mais dispositivos e marcas
- **Fallback Inteligente**: Se FitDays/Samsung Health não têm dados, tenta Google Fit automaticamente
- **Flexibilidade**: Funciona com qualquer app compatível com Health Connect
- **Privacidade**: Controle centralizado de permissões

### ✅ Para o Desenvolvedor
- **Código Simplificado**: Uma API para todos os tipos de dados
- **Manutenção Reduzida**: Menos código específico por dispositivo
- **Escalabilidade**: Fácil adição de novos tipos de dados
- **Confiabilidade**: Google Health Connect como intermediário

## Requisitos

### Android
- **Android 14+**: Health Connect está disponível nativamente
- **Android 13**: Requer instalação do app Health Connect
- **Permissões**: Acesso aos tipos de dados específicos

### Apps Compatíveis
- Google Fit
- Samsung Health
- Fitbit
- Strava
- MyFitnessPal
- Apps de balanças inteligentes (Withings, Xiaomi, etc.)
- Apps de wearables (Garmin Connect, Polar, etc.)

## Como Configurar

### 1. Para o Usuário
1. Instalar o Health Connect (se Android 13)
2. Conectar apps de saúde ao Health Connect
3. Conceder permissões no HealthMate
4. Sincronizar dados dos dispositivos

### 2. Para o Desenvolvedor
```javascript
import HealthConnectService from '../services/HealthConnectService';

// Inicializar o serviço
const initResult = await HealthConnectService.initialize();

// Obter dados de peso
const weightData = await HealthConnectService.getWeightData(7);

// Obter dados de wearables
const healthData = await HealthConnectService.getWearableHealthData(1);
```

## Tratamento de Erros

O serviço inclui tratamento robusto de erros:

- **Health Connect não disponível**: Orientação para instalação
- **Permissões negadas**: Redirecionamento para configurações
- **Sem dados**: Instruções para sincronização
- **Fallback para Bluetooth**: Opção de usar método anterior

## Status da Implementação

### ✅ Implementado
- [x] HealthConnectService.js completo
- [x] Integração no MedicalDiaryScreen
- [x] Botão da balança usando Health Connect
- [x] Botão do wearable usando Health Connect
- [x] Interface unificada
- [x] Tratamento de erros
- [x] Documentação

### 🔄 Próximos Passos
- [ ] Implementar bridge nativo Android
- [ ] Testes com dispositivos reais
- [ ] Otimizações de performance
- [ ] Suporte ao iOS (HealthKit)

## Arquivos Modificados

1. **`src/services/HealthConnectService.js`** (novo)
   - Serviço principal do Health Connect

2. **`src/App/General/MedicalDiaryScreen.js`** (modificado)
   - Importação do HealthConnectService
   - Atualização de handleConnectDigitalScale()
   - Atualização de handleConnectHealthConnect()
   - Novos estilos CSS
   - Interface atualizada

3. **`src/services/README_HealthConnect.md`** (novo)
   - Esta documentação

## Compatibilidade

- **Backward Compatible**: Modo Bluetooth ainda disponível como fallback
- **Progressive Enhancement**: Melhor experiência quando Health Connect disponível
- **Graceful Degradation**: Funcionamento mesmo sem Health Connect 