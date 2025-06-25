// src/services/api.js
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
   * Limpa todo o cache
   */
  clearCache() {
    this._cache.clear();
    console.log('🗑️ Cache da API limpo');
  },

  /**
   * Realiza uma requisição GET para a API
   */
  async get(endpoint, params = {}) {
    try {
      const url = new URL(`${API_URL}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

      console.log(`🌐 Fazendo requisição para: ${url.toString()}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ Resposta não OK: ${response.status} - ${response.statusText}`);
        throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Dados recebidos de ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`💥 Erro ao acessar ${endpoint}:`, error);
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
      console.error('💥 Erro ao buscar opções de fonte:', error);
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
   * Obtém tabelas detalhadas do dashboard
   * USADO EM: DashboardSales.jsx (linha não especificada)
   */
  async getDetailedTables(corretor = null, fonte = null, extraParams = {}) {
    const params = { ...extraParams };
    
    // Aplicar filtro de corretor se especificado
    // Suporta múltiplas seleções separadas por vírgula
    if (corretor && corretor.trim() !== '') {
      params.corretor = corretor;
    }
    
    // Aplicar filtro de fonte se especificado  
    // Suporta múltiplas seleções separadas por vírgula
    if (fonte && fonte.trim() !== '') {
      params.fonte = fonte;
    }
    
    return this.get(`/dashboard/detailed-tables`, params);
  }
};

export default KommoAPI;