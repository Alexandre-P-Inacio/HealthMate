# 🏥 Health Connect - Configuração Completa para Expo Native

Este guia documenta como configurar e usar Health Connect em um projeto **Expo Native** (development build) para buscar dados de saúde.

## 📋 Índice

1. [Pré-requisitos](#-pré-requisitos)
2. [Instalação](#-instalação)
3. [Configuração Android](#-configuração-android)
4. [Configuração Expo](#-configuração-expo)
5. [Configuração Health Connect](#-configuração-health-connect)
6. [Uso do Código](#-uso-do-código)
7. [Build e Deploy](#-build-e-deploy)
8. [Troubleshooting](#-troubleshooting)

## 🔧 Pré-requisitos

- **Expo SDK 50+** (versão atual: 52)
- **Android 14+** (API level 34+) no dispositivo de teste
- **Expo Native** (development build) - **NÃO funciona no Expo Go**
- **Health Connect** instalado no dispositivo Android

## 📦 Instalação

### 1. Dependências Necessárias

```bash
# Instalar pacotes do Health Connect
npx expo install expo-health-connect
npm install react-native-health-connect

# Instalar dependências de permissões (se necessário)
npx expo install expo-permissions

# Verificar e corrigir dependências
npx expo install --fix
```

### 2. Verificar package.json

```json
{
  "dependencies": {
    "expo-health-connect": "^0.1.1",
    "react-native-health-connect": "^3.3.3",
    "expo": "~52.0.26"
  }
}
```

## 🤖 Configuração Android

### 1. AndroidManifest.xml

Adicione as permissões necessárias em `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Health Connect Permissions -->
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
<uses-permission android:name="android.permission.health.READ_DISTANCE" />
<uses-permission android:name="android.permission.health.READ_WEIGHT" />
<uses-permission android:name="android.permission.health.READ_BLOOD_PRESSURE" />
<uses-permission android:name="android.permission.health.READ_OXYGEN_SATURATION" />
<uses-permission android:name="android.permission.health.READ_BODY_TEMPERATURE" />

<!-- Health Connect Intent Filter (dentro de <activity>) -->
<activity>
  <!-- Seus intent-filters existentes -->
  
  <!-- Adicione este -->
  <intent-filter>
    <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
  </intent-filter>
</activity>

<!-- Health Connect Data Handling -->
<queries>
  <package android:name="com.google.android.apps.healthdata" />
</queries>
```

### 2. app.json / app.config.js

Configure o Health Connect no arquivo de configuração do Expo:

```json
{
  "expo": {
    "name": "HealthMate",
    "plugins": [
      [
        "expo-health-connect",
        {
          "healthDataTypes": [
            "Steps",
            "ActiveCaloriesBurned", 
            "HeartRate",
            "Distance",
            "Weight",
            "BloodPressure",
            "OxygenSaturation",
            "BodyTemperature"
          ]
        }
      ]
    ],
    "android": {
      "compileSdkVersion": 34,
      "targetSdkVersion": 34,
      "minSdkVersion": 26
    }
  }
}
```

### 3. Build Properties

Configure `android/gradle.properties`:

```properties
# Health Connect compatibility
android.enableJetifier=true
android.useAndroidX=true
org.gradle.jvmargs=-Xmx2048m
```

## ⚙️ Configuração Expo

### 1. EAS Build Configuration

Configure `eas.json` para development builds:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "aab"
      }
    }
  }
}
```

### 2. Metro Configuration

Configure `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Health Connect specific resolver
config.resolver.alias = {
  ...config.resolver.alias,
  'react-native-health-connect': 'react-native-health-connect'
};

module.exports = config;
```

## 🏥 Configuração Health Connect

### 1. Instalar Health Connect no Dispositivo

1. Abra **Google Play Store**
2. Procure por **"Health Connect"**
3. Instale o app oficial do Google
4. Abra e configure o Health Connect

### 2. Conectar Apps de Saúde

No app Health Connect:
1. Vá em **"Apps"**
2. Conecte apps como:
   - **Samsung Health**
   - **Google Fit**
   - **FitDays**
   - **Mi Health**
   - Outros apps de fitness

### 3. Configurar Permissões

1. Após instalar seu app, abra **Health Connect**
2. Vá em **"App permissions"**
3. Encontre seu app (**HealthMate**)
4. Conceda permissões para:
   - Passos
   - Calorias ativas
   - Frequência cardíaca
   - Distância
   - Peso
   - Pressão arterial
   - Oxigenação do sangue
   - Temperatura corporal

## 💻 Uso do Código

### 1. Hook useHealthData()

```typescript
import React from 'react';
import { ActivityIndicator, Text } from 'react-native';
import useHealthData from './src/hooks/useHealthData';
import HealthDashboard from './src/Components/HealthDashboard';

const MyHealthScreen = () => {
  const { data, loading, error, refresh } = useHealthData({
    refreshInterval: 10, // Atualiza a cada 10 segundos
    daysBack: 1,
    autoRefresh: true,
    requestPermissionsOnMount: true
  });

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Erro: {error}</Text>;

  return (
    <HealthDashboard
      steps={data?.steps}
      calories={data?.calories}
      heartRate={data?.heartRate}
      onRefresh={refresh}
    />
  );
};
```

### 2. Funções Disponíveis

```typescript
import HealthConnectService from './src/services/HealthConnectTypeScript';

// 1. Solicitar permissões
const requestPermissions = async () => {
  const result = await HealthConnectService.requestHealthPermissions();
  console.log('Permissões:', result);
};

// 2. Buscar dados de saúde
const fetchData = async () => {
  const result = await HealthConnectService.fetchHealthData(7); // 7 dias
  console.log('Dados:', result);
};

// 3. Abrir configurações
const openSettings = async () => {
  await HealthConnectService.openHealthConnectSettings();
};
```

### 3. Componente HealthDashboard

```tsx
<HealthDashboard
  steps={data?.steps}
  calories={data?.calories}
  heartRate={data?.heartRate}
  distance={data?.distance}
  bloodPressure={data?.bloodPressure}
  bloodOxygen={data?.bloodOxygen}
  bodyTemperature={data?.bodyTemperature}
  lastUpdated={data?.lastUpdated}
  sources={data?.sources}
  loading={loading}
  error={error}
  onRefresh={refresh}
  onRequestPermissions={requestPermissions}
  hasPermissions={hasPermissions}
  isSupported={isSupported}
/>
```

## 🚀 Build e Deploy

### 1. Development Build

```bash
# Build para desenvolvimento
eas build --profile development --platform android

# Instalar no dispositivo
adb install arquivo.apk
```

### 2. Preview Build

```bash
# Build para testes
eas build --profile preview --platform android
```

### 3. Production Build

```bash
# Build para produção
eas build --profile production --platform android
```

### 4. Configuração Play Console

Para publicar na Play Store, você precisa:

1. **Declarar uso do Health Connect** na descrição do app
2. **Adicionar política de privacidade** explicando uso de dados de saúde
3. **Preencher formulário de permissões sensíveis** na Play Console
4. **Justificar cada permissão** de saúde solicitada

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. "Health Connect não encontrado"
- **Solução**: Instale Health Connect da Play Store
- **Verificação**: Settings > Apps > Health Connect

#### 2. "Permissões não concedidas"
- **Solução**: Abra Health Connect > App permissions > Seu app
- **Configure**: Conceda todas as permissões necessárias

#### 3. "SDK não disponível"
- **Solução**: Verifique se está usando Android 14+
- **Verificação**: Settings > About phone > Android version

#### 4. "Erro lateinit property"
- **Solução**: Reinicie o app e tente novamente
- **Prevenção**: Sempre chame initialize() antes de usar permissões

#### 5. "Nenhum dado encontrado"
- **Solução**: 
  - Conecte apps de saúde ao Health Connect
  - Use um smartwatch ou app de fitness
  - Aguarde alguns minutos para sincronização

### Debug e Logs

```typescript
// Habilitar logs detalhados
const { data, loading, error } = useHealthData({
  refreshInterval: 10,
  daysBack: 7,
  autoRefresh: true,
  requestPermissionsOnMount: true
});

// Verificar logs no console
console.log('Health Data:', data);
console.log('Loading:', loading);
console.log('Error:', error);
```

### Teste em Emulador

⚠️ **Health Connect NÃO funciona em emuladores**. É necessário um dispositivo físico Android 14+.

## 📱 Dispositivos Testados

- ✅ Samsung Galaxy S23+ (Android 14)
- ✅ Google Pixel 7 (Android 14)
- ✅ OnePlus 11 (Android 14)
- ❌ Emuladores Android (não suportado)
- ❌ Android < 14 (não suportado)

## 🔗 Links Úteis

- [Health Connect Official Docs](https://developer.android.com/guide/health-and-fitness/health-connect)
- [Expo Health Connect Plugin](https://docs.expo.dev/versions/latest/sdk/health-connect/)
- [React Native Health Connect](https://github.com/matinzd/react-native-health-connect)
- [Android Health Permissions](https://developer.android.com/reference/android/Manifest.permission#health)

## 📄 Exemplo Completo

Veja o arquivo `src/Components/HealthDataExample.tsx` para um exemplo completo de implementação.

---

**🎯 Resultado Final**: Com esta configuração, você terá um sistema completo para buscar dados de saúde do Health Connect com interface amigável, tratamento de erros e atualizações automáticas. 