// src/services/api.js
// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = import.meta.env.VITE_API_URL || 'https://backendsaimob.gustavohenrique.dev';

/**
 * Serviço para comunicação com a API do Kommo Dashboard
 * SIMPLIFICADO - apenas métodos REALMENTE usados
 */
export const KommoAPI = {
  // Cache interno para reduzir chamadas à API
  _cache: new Map(),

  /**
   * Obtém dados do cache se ainda válidos
   */
  getFromCache(key, ttl = 5 * 60 * 1000) {
    const cached = this._cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < ttl) {
      return cached.data;
    }
    return null;
  },

  /**
   * Armazena dados no cache
   */
  setCache(key, data) {
    if (this._cache.size >= 50) {
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    
    this._cache.set(key, {
      data,
      timestamp: Date.now()
    });
  },

  /**
   * Limpa todo o cache local
   */
  clearCache() {
    this._cache.clear();
  },

  /**
   * Limpa o cache do backend (Kommo)
   */
  async flushKommoCache() {
    try {
      const response = await fetch(`${API_URL}/cache/flush/kommo`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao limpar cache do Kommo: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Cache do Kommo limpo com sucesso:', data);
      return data;
    } catch (error) {
      console.error('❌ Erro ao limpar cache do Kommo:', error);
      throw error;
    }
  },

  /**
   * Realiza uma requisição GET para a API
   */
  async get(endpoint, params = {}) {
    try {
      const url = new URL(`${API_URL}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return this.getDefaultResponse(endpoint);
    }
  },

  /**
   * Retorna uma resposta padrão para endpoints com falha
   */
  getDefaultResponse(endpoint) {
    const defaults = {
      '/corretor-dashboard/list': { corretores: [] },
      '/dashboard/sales-comparison': {
        currentPeriod: { name: 'Mês Atual', totalLeads: 0, winRate: 0, averageDealSize: 0, totalRevenue: 0, leadCycleTime: 0 },
        previousPeriod: { name: 'Mês Anterior', totalLeads: 0, winRate: 0, averageDealSize: 0, totalRevenue: 0, leadCycleTime: 0 }
      },
      '/dashboard/detailed-tables': {
        reunioesDetalhes: [],
        propostasDetalhes: [],
        vendasDetalhes: [],
        summary: {
          total_reunioes: 0,
          total_propostas: 0,
          total_vendas: 0,
          valor_total_vendas: 0.0
        }
      },
      '/custom-fields/837886': {
        custom_field: {
          id: 837886,
          name: "Fonte",
          type: "select",
          enums: [
            { id: 770632, value: "Tráfego Meta", sort: 500 },
            { id: 770634, value: "Escritório Patacho", sort: 1 },
            { id: 770636, value: "Canal Pro", sort: 2 },
            { id: 770638, value: "Site", sort: 3 },
            { id: 770640, value: "Redes Sociais", sort: 4 },
            { id: 770642, value: "Parceria com Construtoras", sort: 5 },
            { id: 788498, value: "Google", sort: 15 }
          ]
        }
      },
      'default': {}
    };

    return defaults[endpoint] || defaults['default'];
  },

  // ============================================================================
  // MÉTODOS REALMENTE USADOS (apenas estes 5)
  // ============================================================================

  /**
   * Obtém lista de corretores disponíveis
   * USADO EM: Dashboard.jsx:62
   */
  async getCorretoresList() {
    return this.get('/corretor-dashboard/list');
  },

  /**
   * Obtém custom field do Kommo por ID
   */
  async getCustomField(fieldId) {
    return this.get(`/custom-fields/${fieldId}`);
  },

  /**
   * Obtém opções de fonte (custom field 837886)
   * USADO EM: Dashboard.jsx:64
   */
  async getSourceOptions() {
    try {
      const FONTE_FIELD_ID = 837886;
      const response = await this.getCustomField(FONTE_FIELD_ID);
      
      if (response?.custom_field?.enums) {
        const sources = response.custom_field.enums
          .sort((a, b) => a.sort - b.sort)
          .map(enum_item => ({
            value: enum_item.value,
            label: enum_item.value,
            id: enum_item.id
          }));
        
        return [
          { value: '', label: 'Todas as Fontes', id: null },
          ...sources
        ];
      }
    } catch (error) {
      // Error handled silently
    }
    
    // Fallback
    return [
      { value: '', label: 'Todas as Fontes', id: null },
      { value: 'Google', label: 'Google', id: 'fallback-1' },
      { value: 'Tráfego Meta', label: 'Tráfego Meta', id: 'fallback-2' },
      { value: 'Site', label: 'Site', id: 'fallback-3' }
    ];
  },

  /**
   * Comparação de vendas entre períodos
   * USADO EM: DashboardSales.jsx:341
   */
  async getSalesComparison(corretor = null, fonte = null) {
    const params = {};
    // Suporta múltiplas seleções separadas por vírgula
    if (corretor && corretor.trim() !== '') {
      params.corretor = corretor;
    }
    if (fonte && fonte.trim() !== '') {
      params.fonte = fonte;
    }
    return this.get(`/dashboard/sales-comparison`, params);
  },

  /**
   * Dashboard de vendas OTIMIZADO (V2 - MongoDB)
   * Tenta V2 primeiro, fallback para V1 se falhar
   */
  async getSalesCompleteV2(corretor = null, fonte = null, extraParams = {}) {
    const params = { ...extraParams };

    if (corretor && corretor.trim() !== '') {
      params.corretor = corretor;
    }
    if (fonte && fonte.trim() !== '') {
      params.fonte = fonte;
    }

    try {
      // Tentar endpoint V2 (MongoDB - muito mais rapido)
      const result = await this.get(`/v2/dashboard/sales-complete`, params);
      if (result && result.totalLeads !== undefined) {
        console.log('V2 sales-complete OK:', result._metadata?.elapsed_ms, 'ms');
        return result;
      }
      throw new Error('V2 retornou dados invalidos');
    } catch (error) {
      console.warn('V2 sales-complete falhou, usando V1:', error.message);
      // Fallback para endpoint original
      return this.get(`/dashboard/sales-complete`, params);
    }
  },

  /**
   * Obtém tabelas detalhadas do dashboard
   * OTIMIZADO: Tenta V2 (MongoDB) primeiro, fallback para V1
   * USADO EM: DashboardSales.jsx, Dashboard.jsx
   */
  async getDetailedTables(corretor = null, fonte = null, extraParams = {}) {
    const params = { ...extraParams };

    // Aplicar filtro de corretor se especificado
    if (corretor && corretor.trim() !== '') {
      params.corretor = corretor;
    }

    // Aplicar filtro de fonte se especificado
    if (fonte && fonte.trim() !== '') {
      params.fonte = fonte;
    }

    try {
      // Tentar V2 primeiro (MongoDB - muito mais rapido)
      const result = await this.get(`/v2/dashboard/detailed-tables`, params);
      if (result && result.summary !== undefined) {
        console.log('[V2] detailed-tables OK:', result._metadata?.elapsed_ms, 'ms');
        return result;
      }
      throw new Error('V2 retornou dados invalidos');
    } catch (error) {
      console.warn('[V2] detailed-tables falhou, usando V1:', error.message);
      // Fallback para endpoint original
      return this.get(`/dashboard/detailed-tables`, params);
    }
  },

  /**
   * Tabelas detalhadas OTIMIZADAS (V2 - MongoDB)
   * Tenta V2 primeiro, fallback para V1 se falhar
   */
  async getDetailedTablesV2(corretor = null, fonte = null, extraParams = {}) {
    const params = { ...extraParams };

    if (corretor && corretor.trim() !== '') {
      params.corretor = corretor;
    }
    if (fonte && fonte.trim() !== '') {
      params.fonte = fonte;
    }

    try {
      // Tentar endpoint V2 (MongoDB - muito mais rapido)
      const result = await this.get(`/v2/dashboard/detailed-tables`, params);
      if (result && result.summary !== undefined) {
        console.log('V2 detailed-tables OK:', result._metadata?.elapsed_ms, 'ms');
        return result;
      }
      throw new Error('V2 retornou dados invalidos');
    } catch (error) {
      console.warn('V2 detailed-tables falhou, usando V1:', error.message);
      // Fallback para endpoint original
      return this.get(`/dashboard/detailed-tables`, params);
    }
  },

  /**
   * Verifica status do MongoDB e sincronizacao
   */
  async getV2Status() {
    return this.get(`/v2/dashboard/health`);
  },

  /**
   * Dispara sincronizacao manual do Kommo -> MongoDB
   */
  async triggerKommoSync(type = 'incremental') {
    const endpoint = type === 'full' ? '/webhooks/sync/full' : '/webhooks/sync/incremental';
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Erro ao disparar sync:', error);
      throw error;
    }
  }
};

export default KommoAPI;