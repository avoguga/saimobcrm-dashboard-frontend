// src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://jwwcw84ccswsgkgcw8oc0g0w.167.88.39.225.sslip.io';

/**
 * Mock data para o Dashboard de Marketing
 */
const marketingMockData = {
  totalLeads: 836,
  leadsBySource: [
    { name: 'Facebook Ads', value: 324 },
    { name: 'Instagram Ads', value: 218 },
    { name: 'OLX', value: 156 },
    { name: 'Site', value: 98 },
    { name: 'Panfletagem', value: 40 }
  ],
  leadsByAd: [
    { name: 'Milagres Lançamento', value: 187 },
    { name: 'Maceió Centro', value: 145 },
    { name: 'Praia do Francês', value: 132 },
    { name: 'Apartamento Jatiúca', value: 124 },
    { name: 'Casa em Ipioca', value: 98 },
    { name: 'Outros', value: 150 }
  ],
  leadsByTag: [
    { name: 'Maceió', value: 495 },
    { name: 'Milagres', value: 205 },
    { name: 'Praia', value: 136 }
  ],
  facebookMetrics: {
    impressions: 458942,
    reach: 187453,
    clicks: 12458,
    ctr: 2.7,
    cpc: 3.48,
    cpm: 94.32,
    totalSpent: 43287.65,
    costPerLead: 79.64,
    engagement: {
      likes: 3254,
      comments: 872,
      shares: 416,
      videoViews: 38245,
      profileVisits: 2658
    }
  },
  metricsTrend: [
    { month: 'Jan', leads: 65, cpl: 82, spent: 5330 },
    { month: 'Fev', leads: 78, cpl: 78, spent: 6084 },
    { month: 'Mar', leads: 94, cpl: 75, spent: 7050 },
    { month: 'Abr', leads: 87, cpl: 80, spent: 6960 },
    { month: 'Mai', leads: 115, cpl: 77, spent: 8855 },
    { month: 'Jun', leads: 140, cpl: 64, spent: 8960 },
    { month: 'Jul', leads: 147, cpl: 60, spent: 8820 },
    { month: 'Ago', leads: 110, cpl: 73, spent: 8030 }
  ],
  customFields: {
    regionInterest: [
      { name: 'Norte', value: 120 },
      { name: 'Sul', value: 215 },
      { name: 'Leste', value: 310 },
      { name: 'Oeste', value: 191 }
    ],
    propertyType: [
      { name: 'Apartamento', value: 467 },
      { name: 'Casa', value: 219 },
      { name: 'Terreno', value: 95 },
      { name: 'Comercial', value: 55 }
    ]
  }
};

/**
 * Mock data para o Dashboard de Vendas
 */
const salesMockData = {
  totalLeads: 836,
  leadsByUser: [
    { name: 'Ana Silva', value: 134, active: 89, lost: 45, meetings: 67, meetingsHeld: 52, sales: 24 },
    { name: 'Bruno Costa', value: 127, active: 82, lost: 45, meetings: 74, meetingsHeld: 56, sales: 27 },
    { name: 'Carlos Oliveira', value: 116, active: 71, lost: 45, meetings: 59, meetingsHeld: 47, sales: 22 },
    { name: 'Débora Santos', value: 98, active: 62, lost: 36, meetings: 51, meetingsHeld: 42, sales: 19 },
    { name: 'Eduardo Lima', value: 172, active: 112, lost: 60, meetings: 89, meetingsHeld: 71, sales: 34 },
    { name: 'Fernanda Martins', value: 189, active: 124, lost: 65, meetings: 97, meetingsHeld: 78, sales: 38 }
  ],
  leadsByStage: [
    { name: 'Novo', value: 327 },
    { name: 'Contato Realizado', value: 243 },
    { name: 'Reunião Agendada', value: 142 },
    { name: 'Proposta Enviada', value: 87 },
    { name: 'Negociação', value: 37 }
  ],
  conversionRates: {
    meetings: 48.3,
    prospects: 62.7,
    sales: 21.8
  },
  leadCycleTime: 27.5,
  winRate: 21.8,
  averageDealSize: 415000,
  salesbotRecovery: 58,
  salesTrend: [
    { month: 'Jan', sales: 12, value: 4820000 },
    { month: 'Fev', sales: 15, value: 6150000 },
    { month: 'Mar', sales: 22, value: 9240000 },
    { month: 'Abr', sales: 18, value: 7200000 },
    { month: 'Mai', sales: 25, value: 10750000 },
    { month: 'Jun', sales: 32, value: 13440000 },
    { month: 'Jul', sales: 28, value: 11760000 },
    { month: 'Ago', sales: 22, value: 8800000 }
  ],
  customFields: {
    financingType: [
      { name: 'À Vista', value: 42 },
      { name: 'Financiamento Bancário', value: 94 },
      { name: 'Financiamento Direto', value: 28 }
    ],
    propertyPurpose: [
      { name: 'Moradia', value: 104 },
      { name: 'Investimento', value: 60 }
    ]
  }
};

/**
 * Serviço para comunicação com a API do Kommo Dashboard
 */
export const KommoAPI = {
  /**
   * Realiza uma requisição GET para a API
   * @param {string} endpoint - Endpoint da API
   * @param {Object} params - Parâmetros de consulta
   * @returns {Promise} - Promise com os dados da resposta
   */
  async get(endpoint, params = {}) {
    try {
      // Simulação de dados mockados para desenvolvimento
      if (import.meta.env.DEV) {
        return this.getMockData(endpoint);
      }
      
      // Construir URL com parâmetros
      const url = new URL(`${API_URL}${endpoint}`);
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
      
      // Realizar a requisição
      const response = await fetch(url);
      
      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        throw new Error(`Erro na requisição: ${response.status} - ${response.statusText}`);
      }
      
      // Retornar os dados como JSON
      return await response.json();
    } catch (error) {
      console.error(`Erro ao acessar ${endpoint}:`, error);
      // Retornar um objeto vazio ou valor padrão dependendo do endpoint
      return this.getDefaultResponse(endpoint);
    }
  },

  /**
   * Retorna dados mockados para desenvolvimento ou teste
   * @param {string} endpoint - Endpoint da API
   * @returns {Object} - Objeto com dados mockados
   */
  getMockData(endpoint) {
    // Endpoints de marketing
    if (endpoint === '/marketing/dashboard') {
      return marketingMockData;
    }
    // Endpoints de vendas
    else if (endpoint === '/sales/dashboard') {
      return salesMockData;
    }
    // Outros endpoints
    else {
      return this.getDefaultResponse(endpoint);
    }
  },

  /**
   * Retorna uma resposta padrão em caso de erro, baseado no endpoint
   * @param {string} endpoint - Endpoint da API
   * @returns {Object} - Objeto com dados padrão
   */
  getDefaultResponse(endpoint) {
    const defaults = {
      '/leads/count': { total_leads: 0 },
      '/leads/by-source': { leads_by_source: {} },
      '/leads/by-tag': { leads_by_tag: {} },
      '/leads/by-user': { leads_by_user: {} },
      '/leads/active-by-user': { active_leads_by_user: {} },
      '/leads/lost-by-user': { lost_leads_by_user: {} },
      '/leads/by-stage': { leads_by_stage: {} },
      '/analytics/lead-cycle-time': { lead_cycle_time_days: 0 },
      '/analytics/win-rate': { win_rate_percentage: 0 },
      '/analytics/average-deal-size': { average_deal_size: 0 },
      '/analytics/conversion-rates': { conversion_rates_percentage: {} },
      '/marketing/dashboard': marketingMockData,
      '/sales/dashboard': salesMockData,
      'default': {}
    };

    return defaults[endpoint] || defaults['default'];
  },

  // Métodos para endpoints específicos
  
  // Marketing Dashboard
  async getMarketingDashboard(days = 90) {
    return this.get('/marketing/dashboard', { days });
  },
  
  // Sales Dashboard
  async getSalesDashboard(days = 90) {
    return this.get('/sales/dashboard', { days });
  },
  
  // Leads
  async getLeadsCount(params = {}) {
    return this.get('/leads/count', params);
  },
  
  async getLeadsBySource() {
    return this.get('/leads/by-source');
  },
  
  async getLeadsByTag() {
    return this.get('/leads/by-tag');
  },
  
  async getLeadsByUser() {
    return this.get('/leads/by-user');
  },
  
  async getActiveLeadsByUser() {
    return this.get('/leads/active-by-user');
  },
  
  async getLostLeadsByUser() {
    return this.get('/leads/lost-by-user');
  },
  
  async getLeadsByStage() {
    return this.get('/leads/by-stage');
  },
  
  async getLeadsByAdvertisement(fieldName = 'Anúncio') {
    return this.get('/leads/by-advertisement', { field_name: fieldName });
  },
  
  // Analytics
  async getLeadCycleTime(days = 90) {
    return this.get('/analytics/lead-cycle-time', { days });
  },
  
  async getWinRate(days = 90, pipeline_id = null) {
    const params = { days };
    if (pipeline_id) params.pipeline_id = pipeline_id;
    return this.get('/analytics/win-rate', params);
  },
  
  async getAverageDealSize(days = 90, pipeline_id = null) {
    const params = { days };
    if (pipeline_id) params.pipeline_id = pipeline_id;
    return this.get('/analytics/average-deal-size', params);
  },
  
  async getConversionRates(days = 90, pipeline_id = null) {
    const params = { days };
    if (pipeline_id) params.pipeline_id = pipeline_id;
    return this.get('/analytics/conversion-rates', params);
  },
  
  async getSalesbotRecovery(days = 90, tag = 'Recuperado pelo SalesBot') {
    return this.get('/analytics/salesbot-recovery', { days, recovery_tag: tag });
  },
  
  // Facebook Ads Metrics
  async getFacebookMetrics(days = 90) {
    return this.get('/facebook/metrics', { days });
  },
  
  // Pipelines
  async getPipelines() {
    return this.get('/pipelines');
  },
  
  async getPipelineStatuses(pipeline_id) {
    return this.get(`/pipelines/${pipeline_id}/statuses`);
  },
  
  // Custom Fields
  async getCustomFields() {
    return this.get('/custom-fields');
  },
  
  async getCustomFieldValues(field_id) {
    return this.get(`/custom-fields/values/${field_id}`);
  },
  
  // Users
  async getUsers() {
    return this.get('/users');
  },
  
  // Sources
  async getSources() {
    return this.get('/sources');
  }
};

export default KommoAPI;