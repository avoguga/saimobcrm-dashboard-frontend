// src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://jwwcw84ccswsgkgcw8oc0g0w.167.88.39.225.sslip.io';

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
      throw error;
    }
  },

  // Métodos para endpoints específicos
  
  // Leads
  async getLeadsCount() {
    return this.get('/leads/count');
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
  
  // Pipelines
  async getPipelines() {
    return this.get('/pipelines');
  },
  
  async getPipelineStatuses(pipeline_id) {
    return this.get(`/pipelines/${pipeline_id}/statuses`);
  },
  
  // Users
  async getUsers() {
    return this.get('/users');
  },
  
  // Sources
  async getSources() {
    return this.get('/sources');
  },
  
  // Tags
  async getTags() {
    return this.get('/tags');
  }
};

export default KommoAPI;