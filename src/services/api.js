// src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Serviço para comunicação com a API do Kommo Dashboard
 */
export const KommoAPI = {
  /**
   * Realiza uma requisição GET para a API com tolerância a falhas
   * @param {string} endpoint - Endpoint da API
   * @param {Object} params - Parâmetros de consulta
   * @returns {Promise} - Promise com os dados da resposta
   */
  async get(endpoint, params = {}) {
    try {
      // Construir URL com parâmetros
      const url = new URL(`${API_URL}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

      console.log(`Fazendo requisição para: ${url.toString()}`);

      // Realizar a requisição
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
      }

      // Retornar os dados como JSON
      const data = await response.json();
      console.log(`Dados recebidos de ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`Erro ao acessar ${endpoint}:`, error);
      // Retornar um objeto vazio em vez de propagar o erro
      // Isso permite que o dashboard carregue mesmo que alguns endpoints falhem
      return this.getDefaultResponse(endpoint);
    }
  },

  /**
   * Retorna uma resposta padrão para endpoints com falha
   * @param {string} endpoint - Endpoint da API
   * @returns {Object} - Resposta padrão
   */
  getDefaultResponse(endpoint) {
    // Mapear respostas padrão para endpoints utilizados
    const defaults = {
      '/corretor-dashboard/list': { corretores: [] },
      '/dashboard/marketing-complete': { 
        totalLeads: 0,
        leadsBySource: [],
        leadsByTag: [],
        leadsByAd: [],
        previousPeriodLeads: 0,
        previousFacebookLeads: 0,
        previousOlxLeads: 0,
        facebookMetrics: {
          impressions: 0,
          reach: 0,
          clicks: 0,
          ctr: 0,
          cpc: 0,
          totalSpent: 0,
          costPerLead: 0,
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
            videoViews: 0,
            profileVisits: 0
          }
        },
        previousFacebookMetrics: {
          impressions: 0,
          reach: 0,
          clicks: 0,
          ctr: 0,
          cpc: 0,
          totalSpent: 0,
          costPerLead: 0,
          engagement: {
            likes: 0,
            comments: 0,
            shares: 0,
            videoViews: 0,
            profileVisits: 0
          }
        },
        metricsTrend: []
      },
      '/dashboard/sales-complete': {
        totalLeads: 0,
        leadsByUser: [],
        leadsByStage: [],
        leadsBySource: [],
        conversionRates: { meetings: 0, prospects: 0, sales: 0 },
        leadCycleTime: 0,
        winRate: 0,
        averageDealSize: 0,
        salesbotRecovery: 0,
        salesTrend: [],
        customFields: { fonte: [], available_fontes: [] },
        analyticsOverview: { leads: { total: 0, active: 0, lost: 0, won: 0 } },
        analyticsFunnel: {},
        analyticsTeam: {},
        meetingsStats: {}
      },
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
      'default': {}
    };

    return defaults[endpoint] || defaults['default'];
  },

  // MÉTODOS UTILIZADOS NO DASHBOARD

  /**
   * Obtém lista de corretores disponíveis
   * @returns {Promise} - Lista de corretores com suas métricas básicas
   */
  async getCorretoresList() {
    return this.get('/corretor-dashboard/list');
  },

  /**
   * Dashboard de marketing completo em uma única requisição
   * @param {number} days - Período em dias para análise
   * @param {Object} extraParams - Parâmetros adicionais (startDate, endDate)
   * @returns {Promise<Object>} - Dados completos do dashboard de marketing
   */
  async getMarketingDashboardComplete(days = 90, extraParams = {}) {
    const params = { days, ...extraParams };
    return this.get(`/dashboard/marketing-complete`, params);
  },

  /**
   * Dashboard de vendas completo em uma única requisição
   * @param {number} days - Período em dias para análise
   * @param {string} corretor - Nome do corretor (opcional)
   * @param {Object} extraParams - Parâmetros adicionais (startDate, endDate)
   * @returns {Promise<Object>} - Dados completos do dashboard de vendas
   */
  async getSalesDashboardComplete(days = 90, corretor = null, extraParams = {}) {
    const params = { days, ...extraParams };
    if (corretor) params.corretor = corretor;
    return this.get(`/dashboard/sales-complete`, params);
  },

  /**
   * Comparação de vendas entre períodos
   * Compara métricas do mês atual vs mês anterior
   * @param {string} corretor - Nome do corretor (opcional)
   * @returns {Promise<Object>} - Dados de comparação entre períodos
   */
  async getSalesComparison(corretor = null) {
    const params = {};
    if (corretor) params.corretor = corretor;
    return this.get(`/dashboard/sales-comparison`, params);
  },

  /**
   * Obtém tabelas detalhadas do dashboard
   * @param {number} days - Período em dias (padrão: 30)
   * @param {string} corretor - Nome do corretor (opcional)
   * @param {Object} extraParams - Parâmetros adicionais (startDate, endDate)
   * @returns {Promise<Object>} - Dados detalhados das tabelas (reuniões, propostas, vendas)
   */
  async getDetailedTables(days = 30, corretor = null, extraParams = {}) {
    const params = { days, ...extraParams };
    if (corretor) params.corretor = encodeURIComponent(corretor);
    return this.get(`/dashboard/detailed-tables`, params);
  }
};

export default KommoAPI;