/**
 * 🚀 API GRANULAR SIMPLIFICADA E HONESTA
 * 
 * VENDAS: Usa endpoints V2 reais do backend
 * MARKETING: Usa mocks (backend ainda não implementou)
 * 
 * APENAS métodos REALMENTE usados pelo Dashboard.jsx
 */

import { MockDataService } from './mockDataService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Flags HONESTAS por módulo
const USE_MOCK_SALES = false; // ✅ VENDAS: Endpoints V2 implementados!
const USE_MOCK_MARKETING = true; // ⏳ MARKETING: Ainda em desenvolvimento

export class GranularAPI {
  /**
   * Cache interno
   */
  static cache = new Map();
  static cacheTimeout = 2 * 60 * 1000; // 2 minutos

  /**
   * Gerencia cache
   */
  static getCached(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  static setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
    if (this.cache.size > 30) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * 🚀 CARREGAMENTO PARALELO DE VENDAS
   * USADO EM: Dashboard.jsx:186 e Dashboard.jsx:242
   */
  static async loadSalesDashboard(days = 30, corretor = null, fonte = null, customDates = null) {
    console.time('Sales Dashboard V2 Load');
    
    try {
      if (USE_MOCK_SALES) {
        // Usar mocks (desenvolvimento)
        const [kpis, leadsByUser, conversionRates, pipelineStatus] = await Promise.all([
          MockDataService.getSalesKPIs(days, corretor, fonte, customDates),
          MockDataService.getLeadsByUserChart(days, corretor, fonte),
          MockDataService.getConversionRates(days, corretor, fonte),
          MockDataService.getPipelineStatus(days, corretor, fonte)
        ]);

        console.timeEnd('Sales Dashboard V2 Load');

        return {
          ...kpis,
          leadsByUser: leadsByUser.leadsByUser || [],
          conversionRates: conversionRates.conversionRates || {},
          funnelData: conversionRates.funnelData || [],
          pipelineStatus: pipelineStatus.pipelineStatus || [], // V2: Corrigido de leadsByStage
          _metadata: { mockData: true, granular: true }
        };
      } else {
        // Usar endpoints V2 reais
        const params = new URLSearchParams();
        
        // Suporte a período customizado
        if (customDates && customDates.start_date && customDates.end_date) {
          params.append('start_date', customDates.start_date);
          params.append('end_date', customDates.end_date);
          console.log('📅 Usando período customizado:', customDates);
        } else {
          params.append('days', days);
          console.log('📅 Usando período em dias:', days);
        }
        
        if (corretor) params.append('corretor', corretor);
        if (fonte) params.append('fonte', fonte);

        const [kpis, leadsByUser, conversionRates, pipelineStatus] = await Promise.all([
          fetch(`${API_URL}/api/v2/sales/kpis?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/charts/leads-by-user?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/sales/conversion-rates?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/sales/pipeline-status?${params}`).then(r => r.json())
        ]);

        console.timeEnd('Sales Dashboard V2 Load');

        return {
          ...kpis,
          leadsByUser: leadsByUser.leadsByUser || [],
          conversionRates: conversionRates.conversionRates || {},
          funnelData: conversionRates.funnelData || [],
          pipelineStatus: pipelineStatus.pipelineStatus || [], // V2: Corrigido de leadsByStage
          _metadata: { realAPI: true, granular: true, v2Endpoints: true }
        };
      }
    } catch (error) {
      console.error('❌ Erro no carregamento do dashboard de vendas:', error);
      throw error;
    }
  }

  /**
   * 🚀 CARREGAMENTO PARALELO DE MARKETING 
   * USADO EM: Dashboard.jsx:143 e Dashboard.jsx:235
   */
  static async loadMarketingDashboard(days = 30, fonte = null, customDates = null) {
    console.time('Marketing Dashboard Load');
    
    try {
      if (USE_MOCK_MARKETING) {
        // Usar mocks (backend ainda não implementou)
        const [kpis, leadsBySource] = await Promise.all([
          MockDataService.getMarketingKPIs(days, fonte, customDates),
          MockDataService.getLeadsBySource(days, fonte)
        ]);

        console.timeEnd('Marketing Dashboard Load');

        return {
          ...kpis,
          leadsBySource: leadsBySource.leadsBySource || [],
          _metadata: { mockData: true, granular: true }
        };
      } else {
        // Usar endpoints V2 reais (quando backend implementar)
        const params = new URLSearchParams();
        
        // Suporte a período customizado
        if (customDates && customDates.start_date && customDates.end_date) {
          params.append('start_date', customDates.start_date);
          params.append('end_date', customDates.end_date);
          console.log('📅 Marketing: Usando período customizado:', customDates);
        } else {
          params.append('days', days);
          console.log('📅 Marketing: Usando período em dias:', days);
        }
        
        if (fonte) params.append('fonte', fonte);

        const [kpis, leadsBySource] = await Promise.all([
          fetch(`${API_URL}/api/v2/marketing/kpis?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/charts/leads-by-source?${params}`).then(r => r.json())
        ]);

        console.timeEnd('Marketing Dashboard Load');

        return {
          ...kpis,
          leadsBySource: leadsBySource.leadsBySource || [],
          _metadata: { realAPI: true, granular: true, v2Endpoints: true }
        };
      }
    } catch (error) {
      console.error('❌ Erro no carregamento do dashboard de marketing:', error);
      throw error;
    }
  }

  /**
   * Limpar cache
   * USADO EM: Dashboard.jsx:255 e Dashboard.jsx:240
   */
  static clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache limpo');
  }
}

export default GranularAPI;