"use strict";
/**
 * Health Connect TypeScript Service
 * Projeto: Expo Native (development build)
 * Funcionalidades: Buscar dados de saúde (passos, calorias, frequência cardíaca) do Health Connect
 * Compatibilidade: Expo Native (não Expo Go)
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_health_connect_1 = require("react-native-health-connect");
// ===========================================
// CLASSE PRINCIPAL
// ===========================================
class HealthConnectTypeScriptService {
    constructor() {
        this.isInitialized = false;
        this.hasPermissions = false;
    }
    /**
     * 1. Função para solicitar permissões do Health Connect
     */
    requestHealthPermissions() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔐 [HealthConnect] Solicitando permissões...');
                // Verifica inicialização
                if (!this.isInitialized) {
                    const initResult = yield this.initializeHealthConnect();
                    if (!initResult.success) {
                        return {
                            success: false,
                            granted: [],
                            error: initResult.error
                        };
                    }
                }
                // Define as permissões necessárias
                const permissions = [
                    { accessType: 'read', recordType: 'Steps' },
                    { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
                    { accessType: 'read', recordType: 'HeartRate' },
                    { accessType: 'read', recordType: 'Weight' },
                ];
                console.log('📋 [HealthConnect] Solicitando permissões:', permissions.map(p => p.recordType));
                // Solicita as permissões
                const grantedPermissions = yield (0, react_native_health_connect_1.requestPermission)(permissions);
                this.hasPermissions = grantedPermissions && grantedPermissions.length > 0;
                if (this.hasPermissions) {
                    console.log(`✅ [HealthConnect] ${grantedPermissions.length} permissões concedidas`);
                    return {
                        success: true,
                        granted: grantedPermissions.map(p => p.recordType)
                    };
                }
                else {
                    // Abre configurações automaticamente se não conseguiu permissões
                    yield this.openHealthConnectSettings();
                    return {
                        success: false,
                        granted: [],
                        error: 'Nenhuma permissão concedida. Configurações abertas - configure manualmente.'
                    };
                }
            }
            catch (error) {
                console.error('❌ [HealthConnect] Erro ao solicitar permissões:', error);
                // Tenta abrir configurações como fallback
                try {
                    yield this.openHealthConnectSettings();
                }
                catch (settingsError) {
                    console.log('⚠️ [HealthConnect] Erro ao abrir configurações:', settingsError);
                }
                return {
                    success: false,
                    granted: [],
                    error: `Erro: ${error.message}. Configurações abertas para configuração manual.`
                };
            }
        });
    }
    /**
     * 2. Função para buscar dados de saúde do Health Connect
     */
    fetchHealthData() {
        return __awaiter(this, arguments, void 0, function* (daysBack = 1) {
            try {
                console.log(`📊 [HealthConnect] Buscando dados dos últimos ${daysBack} dias...`);
                // Verifica inicialização
                if (!this.isInitialized) {
                    const initResult = yield this.initializeHealthConnect();
                    if (!initResult.success) {
                        return {
                            success: false,
                            error: initResult.error,
                            needsPermissions: true
                        };
                    }
                }
                // Verifica permissões
                if (!this.hasPermissions) {
                    return {
                        success: false,
                        error: 'Permissões não concedidas. Solicite permissões primeiro.',
                        needsPermissions: true
                    };
                }
                // Define intervalo de tempo
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - daysBack);
                const timeRangeFilter = {
                    operator: 'between',
                    startTime: startDate.toISOString(),
                    endTime: endDate.toISOString(),
                };
                console.log('🕐 [HealthConnect] Buscando dados entre:', startDate.toLocaleDateString(), 'e', endDate.toLocaleDateString());
                // Busca dados em paralelo
                const [stepsData, caloriesData, heartRateData, weightData] = yield Promise.allSettled([
                    this.safeReadRecords('Steps', timeRangeFilter),
                    this.safeReadRecords('ActiveCaloriesBurned', timeRangeFilter),
                    this.safeReadRecords('HeartRate', timeRangeFilter),
                    this.safeReadRecords('Weight', timeRangeFilter)
                ]);
                // Processa os resultados
                const steps = this.processStepsData(stepsData.status === 'fulfilled' ? stepsData.value : []);
                const calories = this.processCaloriesData(caloriesData.status === 'fulfilled' ? caloriesData.value : []);
                const heartRate = this.processHeartRateData(heartRateData.status === 'fulfilled' ? heartRateData.value : []);
                const weight = this.processWeightData(weightData.status === 'fulfilled' ? weightData.value : []);
                // Coleta fontes de dados
                const allRecords = [];
                if (stepsData.status === 'fulfilled')
                    allRecords.push(...stepsData.value);
                if (caloriesData.status === 'fulfilled')
                    allRecords.push(...caloriesData.value);
                if (heartRateData.status === 'fulfilled')
                    allRecords.push(...heartRateData.value);
                if (weightData.status === 'fulfilled')
                    allRecords.push(...weightData.value);
                const sources = this.collectDataSources(allRecords);
                const healthData = {
                    steps,
                    calories,
                    heartRate,
                    weight,
                    lastUpdated: new Date().toISOString(),
                    sources
                };
                console.log('✅ [HealthConnect] Dados processados:', {
                    steps: steps || 'N/A',
                    calories: calories || 'N/A',
                    heartRate: heartRate || 'N/A',
                    weight: weight || 'N/A',
                    sources: sources.length
                });
                return {
                    success: true,
                    data: healthData
                };
            }
            catch (error) {
                console.error('❌ [HealthConnect] Erro ao buscar dados:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Abre as configurações do Health Connect
     */
    openHealthConnectSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔧 [HealthConnect] Abrindo configurações...');
                yield (0, react_native_health_connect_1.openHealthConnectSettings)();
            }
            catch (error) {
                console.error('❌ [HealthConnect] Erro ao abrir configurações:', error);
                throw error;
            }
        });
    }
    // ===========================================
    // MÉTODOS PRIVADOS
    // ===========================================
    initializeHealthConnect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔄 [HealthConnect] Inicializando...');
                // Verifica disponibilidade
                const status = yield (0, react_native_health_connect_1.getSdkStatus)();
                console.log('📱 [HealthConnect] Status do SDK:', status);
                if (status !== react_native_health_connect_1.SdkAvailabilityStatus.SDK_AVAILABLE) {
                    let errorMessage = 'Health Connect não disponível';
                    switch (status) {
                        case react_native_health_connect_1.SdkAvailabilityStatus.SDK_UNAVAILABLE:
                            errorMessage = 'Health Connect não está instalado neste dispositivo';
                            break;
                        case react_native_health_connect_1.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED:
                            errorMessage = 'Health Connect precisa ser atualizado via Google Play Store';
                            break;
                    }
                    return { success: false, error: errorMessage };
                }
                // Inicializa
                const initialized = yield (0, react_native_health_connect_1.initialize)();
                if (!initialized) {
                    return { success: false, error: 'Falha ao inicializar Health Connect' };
                }
                this.isInitialized = true;
                console.log('✅ [HealthConnect] Inicializado com sucesso');
                return { success: true };
            }
            catch (error) {
                console.error('❌ [HealthConnect] Erro na inicialização:', error);
                return { success: false, error: error.message };
            }
        });
    }
    safeReadRecords(recordType, timeRangeFilter) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const records = yield (0, react_native_health_connect_1.readRecords)(recordType, { timeRangeFilter });
                console.log(`📊 [HealthConnect] ${recordType}: ${Array.isArray(records) ? records.length : 0} registros`);
                return Array.isArray(records) ? records : [];
            }
            catch (error) {
                console.log(`⚠️ [HealthConnect] Erro ao ler ${recordType}:`, error.message);
                return [];
            }
        });
    }
    processStepsData(records) {
        if (!records || records.length === 0)
            return null;
        const totalSteps = records.reduce((total, record) => total + (record.count || 0), 0);
        return totalSteps;
    }
    processCaloriesData(records) {
        if (!records || records.length === 0)
            return null;
        const totalCalories = records.reduce((total, record) => {
            var _a;
            return total + (((_a = record.energy) === null || _a === void 0 ? void 0 : _a.inCalories) || 0);
        }, 0);
        return Math.round(totalCalories);
    }
    processHeartRateData(records) {
        if (!records || records.length === 0)
            return null;
        // Pega a medição mais recente
        const sorted = records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        return sorted[0].beatsPerMinute || null;
    }
    processWeightData(records) {
        var _a;
        if (!records || records.length === 0)
            return null;
        const sorted = records.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        return ((_a = sorted[0].weight) === null || _a === void 0 ? void 0 : _a.inKilograms) || null;
    }
    collectDataSources(records) {
        const sources = new Set();
        records.forEach(record => {
            var _a, _b;
            const packageName = (_b = (_a = record.metadata) === null || _a === void 0 ? void 0 : _a.dataOrigin) === null || _b === void 0 ? void 0 : _b.packageName;
            if (packageName) {
                const sourceName = this.getSourceName(packageName);
                sources.add(sourceName);
            }
        });
        return Array.from(sources);
    }
    getSourceName(packageName) {
        const sourceNames = {
            'com.sec.android.app.shealth': 'Samsung Health',
            'com.google.android.apps.fitness': 'Google Fit',
            'com.fitdays.fitdays': 'FitDays',
            'com.mi.health': 'Mi Health',
            'com.huawei.health': 'Huawei Health',
            'com.fitbit.FitbitMobile': 'Fitbit',
            'com.garmin.android.apps.connectmobile': 'Garmin Connect',
            'com.polar.polarflow': 'Polar Flow'
        };
        return sourceNames[packageName] || packageName || 'Health Connect';
    }
    getWeightData() {
        return __awaiter(this, arguments, void 0, function* (daysBack = 7) {
            try {
                // Ensure initialization
                if (!this.isInitialized) {
                    const initResult = yield this.initializeHealthConnect();
                    if (!initResult.success) {
                        return { success: false, error: initResult.error };
                    }
                }
                // Ensure permissions
                if (!this.hasPermissions) {
                    const permResult = yield this.requestHealthPermissions();
                    if (!permResult.success) {
                        return { success: false, error: permResult.error };
                    }
                }
                // Date range
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - daysBack);
                const timeRangeFilter = {
                    operator: 'between',
                    startTime: startDate.toISOString(),
                    endTime: endDate.toISOString(),
                };
                // Fetch weight records
                let data = yield (0, react_native_health_connect_1.readRecords)('Weight', { timeRangeFilter });
                console.log('[getWeightData] readRecords returned:', data);
                data = Array.isArray(data) ? data : [];
                let latest = null;
                if (data.length > 0) {
                    latest = data.reduce((a, b) => {
                        const aTime = new Date(a.endTime || a.timestamp || a.startTime || 0).getTime();
                        const bTime = new Date(b.endTime || b.timestamp || b.startTime || 0).getTime();
                        return bTime > aTime ? b : a;
                    });
                }
                return { success: true, data, latest };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
}
// Exporta instância singleton
exports.default = new HealthConnectTypeScriptService();

// JS bridge for React Native/Node to import the TS default export
const HealthConnectTypeScript = require('./HealthConnectTypeScript.ts').default;
module.exports = HealthConnectTypeScript;
