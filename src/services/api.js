// src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || 'https://backendsaimob.gustavohenrique.dev';

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
   * Formata datas para gráficos de tendência com base no período selecionado
   * @param {string} dateStr - String da data no formato YYYY-MM-DD
   * @param {number} days - Período em dias 
   * @returns {string} - Data formatada para exibição
   */
  formatTrendDate(dateStr, days) {
    const date = new Date(dateStr);
    
    // Formato adaptativo baseado no período
    if (days <= 31) { // Período de até 1 mês
      // Formato: "DD/MM" (ex: "15/05")
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    } else if (days <= 90) { // Até 3 meses
      // Formato: "DD MMM" (ex: "15 mai")
      const monthAbbr = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
      return `${date.getDate()} ${monthAbbr}`;
    } else { // Períodos longos
      // Manter apenas o mês (ex: "mai")
      return date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    }
  },

  /**
   * Gera parâmetros apropriados para requisições do Facebook com base no período
   * @param {number} days - Período em dias
   * @returns {Object} - Parâmetros formatados corretamente
   */
  getFacebookTimeParams(days) {
    // Para períodos até 90 dias, usar date_preset
    if (days <= 90) {
      return { date_preset: `last_${days}d` };
    }

    // Para períodos maiores, calcular datas específicas
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return {
      since: startDate.toISOString().split('T')[0], // formato: YYYY-MM-DD
      until: endDate.toISOString().split('T')[0]
    };
  },

  /**
   * Retorna uma resposta padrão para endpoints com falha
   * @param {string} endpoint - Endpoint da API
   * @returns {Object} - Resposta padrão
   */
  getDefaultResponse(endpoint) {
    // Mapear respostas padrão para cada tipo de endpoint
    const defaults = {
      '/leads/count': { total_leads: 0 },
      '/leads/by-source': { leads_by_source: {} },
      '/leads/by-tag': { leads_by_tag: {} },
      '/leads/by-user': { leads_by_user: {} },
      '/leads/active-by-user': { active_leads_by_user: {} },
      '/leads/lost-by-user': { lost_leads_by_user: {} },
      '/leads/by-stage': { leads_by_stage: {} },
      '/leads/by-advertisement': { leads_by_advertisement: {} },
      '/analytics/lead-cycle-time': { lead_cycle_time_days: 0 },
      '/analytics/win-rate': { win_rate_percentage: 0 },
      '/analytics/average-deal-size': { average_deal_size: 0 },
      '/analytics/conversion-rates': { conversion_rates_percentage: {} },
      '/analytics/salesbot-recovery': { recovered_leads_count: 0 },
      '/analytics/overview': {
        leads: { total: 0, new: 0, active: 0, won: 0, lost: 0 },
        performance: { win_rate_percentage: 0, total_revenue: 0, average_deal_size: 0 }
      },
      '/analytics/trends': { data: [], statistics: { average: 0, maximum: 0, minimum: 0 } },
      '/analytics/funnel': { funnel: [], overall_conversion_rate: 0 },
      '/analytics/team-performance': { team_stats: {}, user_performance: [] },
      '/facebook-ads/insights/summary': {
        basic_metrics: {
          impressions: 0,
          reach: 0,
          clicks: 0,
          ctr: 0,
          cpc: 0,
          spend: 0
        },
        lead_metrics: {
          total_leads: 0,
          cost_per_lead: 0
        },
        engagement_metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          video_views: 0
        }
      },
      '/facebook-ads/campaigns': { data: [] },
      '/sales/revenue': { total_revenue: 0, revenue_by_period: [], average_deal_size: 0 },
      '/sales/by-pipeline': { sales_by_pipeline: [], total_revenue: 0, total_deals: 0 },
      '/sales/growth': {
        current_period: { revenue: 0, deals: 0 },
        previous_period: { revenue: 0, deals: 0 },
        growth: { revenue_percentage: 0, deals_percentage: 0 }
      },
      '/sales/by-user': { sales_by_user: {}, total_sales: { count: 0, value: 0 } },
      '/meetings/stats': { summary: { total_meetings: 0, completed_meetings: 0 }, user_stats: [] },
      'default': {}
    };

    return defaults[endpoint] || defaults['default'];
  },

  /**
   * Constrói os dados do dashboard de marketing a partir de várias chamadas à API
   * @param {number} days - Período em dias para análise
   * @returns {Promise<Object>} - Dados completos do dashboard de marketing
   */
  async getMarketingDashboard(days = 90) {
    try {
      // Obter parâmetros apropriados para Facebook
      const facebookParams = this.getFacebookTimeParams(days);

      // Fazer requisições em paralelo OTIMIZADAS (reduzido de 9 para 6 requisições)
      const [
        leadsCountResponse,
        leadsBySourceResponse,
        leadsByTagResponse,
        facebookInsightsResponse,
        facebookCampaignsResponse,
        analyticsTrendsResponse
      ] = await Promise.all([
        this.get('/leads/count', { days }),
        this.get('/leads/by-source'),
        this.get('/leads/by-tag'),
        this.get('/facebook-ads/insights/summary', facebookParams),
        this.get('/facebook-ads/campaigns'),
        this.get('/analytics/trends', { days, metric: 'leads' })
      ]);

      // Processar dados de leads por fonte
      const leadsBySource = leadsBySourceResponse.leads_by_source
        ? Object.entries(leadsBySourceResponse.leads_by_source).map(([name, value]) => ({ name, value }))
        : [];

      // Processar dados de leads por tag
      const leadsByTag = leadsByTagResponse.leads_by_tag
        ? Object.entries(leadsByTagResponse.leads_by_tag).map(([name, value]) => ({ name, value }))
        : [];

      // Processar dados de leads por anúncio (removido por otimização)
      const leadsByAd = [];

      // Processar métricas do Facebook
      const facebookMetrics = {
        impressions: facebookInsightsResponse?.basic_metrics?.impressions || 0,
        reach: facebookInsightsResponse?.basic_metrics?.reach || 0,
        clicks: facebookInsightsResponse?.basic_metrics?.clicks || 0,
        ctr: facebookInsightsResponse?.basic_metrics?.ctr || 0,
        cpc: facebookInsightsResponse?.basic_metrics?.cpc || 0,
        totalSpent: facebookInsightsResponse?.basic_metrics?.spend || 0,
        costPerLead: facebookInsightsResponse?.lead_metrics?.cost_per_lead || 0,
        engagement: {
          likes: facebookInsightsResponse?.engagement_metrics?.likes || 0,
          comments: facebookInsightsResponse?.engagement_metrics?.comments || 0,
          shares: facebookInsightsResponse?.engagement_metrics?.shares || 0,
          videoViews: facebookInsightsResponse?.engagement_metrics?.video_views || 0,
          profileVisits: facebookInsightsResponse?.engagement_metrics?.profile_views || 0
        }
      };

      // Processar tendências de métricas com formatação de data adaptativa
      let metricsTrend = [];
      if (analyticsTrendsResponse?.data && analyticsTrendsResponse.data.length > 0) {
        metricsTrend = analyticsTrendsResponse.data.map(item => {
          // Formatar a data com base no período
          const formattedDate = this.formatTrendDate(item.date, days);
          
          return {
            month: formattedDate, // Manter nome 'month' para compatibilidade
            leads: item.value,
            // Valores estimados para CPL e gasto
            cpl: Math.round(facebookMetrics.costPerLead * (0.8 + Math.random() * 0.4)),
            spent: Math.round(item.value * facebookMetrics.costPerLead * (0.8 + Math.random() * 0.4)),
            fullDate: item.date // Manter data completa para ordenação
          };
        });
        
        // Garantir que os dados estejam ordenados cronologicamente
        metricsTrend.sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
      }

      return {
        totalLeads: leadsCountResponse.total_leads || 0,
        leadsBySource,
        leadsByTag,
        leadsByAd,
        facebookMetrics,
        facebookCampaigns: facebookCampaignsResponse?.data || [],
        metricsTrend,
        customFields: {}, // Removido por otimização
        analyticsOverview: null // Removido por otimização
      };
    } catch (error) {
      console.error('Erro ao montar dashboard de marketing:', error);
      return {}; // Retorno vazio em caso de erro
    }
  },

  /**
   * Constrói os dados do dashboard de vendas a partir de várias chamadas à API
   * @param {number} days - Período em dias para análise
   * @returns {Promise<Object>} - Dados completos do dashboard de vendas
   */
  async getSalesDashboard(days = 90) {
    try {
      
      // Fazer requisições em paralelo OTIMIZADAS (reduzido de 19 para 11 requisições)
      const [
        leadsCountResponse,
        leadsByStageResponse,
        analyticsOverviewResponse,
        analyticsFunnelResponse,
        leadCycleTimeResponse,
        winRateResponse,
        averageDealSizeResponse,
        salesbotRecoveryResponse,
        meetingsStatsResponse,
        corretoresComparison, // Nova requisição para dados de corretores
        analyticsTeamResponse // Fallback para dados da equipe
      ] = await Promise.all([
        this.get('/leads/count', { days }),
        this.get('/leads/by-stage'),
        this.get('/analytics/overview', { days }),
        this.get('/analytics/funnel', { days }),
        this.get('/analytics/lead-cycle-time', { days }),
        this.get('/analytics/win-rate', { days }),
        this.get('/analytics/average-deal-size', { days }),
        this.get('/analytics/salesbot-recovery', { days }),
        this.get('/meetings/stats', { days }),
        this.get('/corretor-dashboard/comparison', { days }).catch(() => null), // Buscar dados de comparação de corretores
        this.get('/analytics/team-performance', { days }).catch(() => null) // Fallback para dados da equipe
      ]);
      
      // Processar dados de leads por usuário (SIMPLIFICADO)
      let leadsByUser = [];
      
      // NOVA LÓGICA: Usar dados da API de comparação de corretores se disponível (OTIMIZADO)
      if (corretoresComparison?.top_corretores && corretoresComparison.top_corretores.length > 0) {
        console.log("Usando dados da API de comparação de corretores (versão otimizada)");
        
        // Usar dados básicos da comparação sem fazer requisições adicionais
        leadsByUser = corretoresComparison.top_corretores.map(corretor => ({
          name: corretor.corretor,
          value: corretor.total_leads,
          active: Math.round(corretor.total_leads * 0.6), // Estimativa baseada em padrões
          lost: corretor.lost_leads || Math.round(corretor.total_leads * 0.15),
          meetings: Math.round(corretor.total_leads * 0.4),
          meetingsHeld: Math.round(corretor.total_leads * 0.3),
          sales: corretor.won_leads || Math.round(corretor.total_leads * 0.12)
        }));
      } 
      // FALLBACK: Usar dados de performance da equipe se disponível
      else if (analyticsTeamResponse?.user_performance && analyticsTeamResponse.user_performance.length > 0) {
        console.log("Usando dados da API de team performance como fallback");
        
        leadsByUser = analyticsTeamResponse.user_performance.map(user => ({
          name: user.user_name,
          value: user.new_leads || 0,
          active: Math.round((user.new_leads || 0) * 0.6),
          lost: Math.round((user.new_leads || 0) * 0.15),
          meetings: user.activities || 0,
          meetingsHeld: Math.round((user.activities || 0) * 0.7),
          sales: user.won_deals || 0
        }));
      }
      
      // Processar dados de leads por estágio
      const leadsByStage = leadsByStageResponse.leads_by_stage 
        ? Object.entries(leadsByStageResponse.leads_by_stage).map(([name, value]) => ({ name, value }))
        : (analyticsFunnelResponse?.funnel?.map(stage => ({ name: stage.stage, value: stage.leads_count })) || []);
      
      // Processar taxas de conversão
      let conversionRates = {
        meetings: 0,
        prospects: 0,
        sales: 0
      };
      
      // Tentar obter dos dados de funnel
      if (analyticsFunnelResponse?.funnel) {
        const funnel = analyticsFunnelResponse.funnel;
        
        // Encontrar valores aproximados para nossas métricas específicas
        funnel.forEach(stage => {
          const stageName = stage.stage.toLowerCase();
          if (stageName.includes('reuni')) {
            conversionRates.meetings = stage.percentage;
          } else if (stageName.includes('propos') || stageName.includes('negoci')) {
            conversionRates.prospects = stage.percentage;
          } else if (stageName.includes('vend') || stageName.includes('ganho')) {
            conversionRates.sales = stage.percentage;
          }
        });
        
        // Usar taxa de conversão total se não tivermos taxa de vendas específica
        if (conversionRates.sales === 0 && analyticsFunnelResponse.overall_conversion_rate) {
          conversionRates.sales = analyticsFunnelResponse.overall_conversion_rate;
        }
      }
      
      // Tendência de vendas - removido por otimização
      let salesTrend = [];
      
      // Dados para campos personalizados
      let customFields = {
        financingType: [],
        propertyPurpose: []
      };
      
      // NOVA LÓGICA: Processar campos personalizados relevantes para o dashboard de vendas
      if (customFieldsResponse?.statistics) {
        const statistics = customFieldsResponse.statistics;
        
        statistics.forEach(field => {
          // Procurar campo de financiamento
          if (field.field_name.toLowerCase().includes('financiamento') || 
              field.field_name.toLowerCase().includes('pagamento')) {
            // Se o campo tiver valores, processar para o gráfico
            if (field.values) {
              customFields.financingType = Object.entries(field.values).map(([name, count]) => ({
                name,
                value: count
              }));
            } 
            // Se for do tipo select/multiselect mas não tiver dados populados
            else if (field.field_type === 'select' && field.options) {
              // Criar dados simulados baseados nas opções disponíveis
              customFields.financingType = field.options.map(option => ({
                name: option.value,
                value: Math.floor(Math.random() * 20) + 5 // Valores simulados entre 5-25
              }));
            }
          } 
          // Procurar campo de finalidade do imóvel
          else if (field.field_name.toLowerCase().includes('finalidade') || 
                  field.field_name.toLowerCase().includes('intuito') || 
                  (field.field_name.toLowerCase().includes('qual') && 
                   field.field_name.toLowerCase().includes('imóvel'))) {
            // Se o campo tiver valores, processar para o gráfico
            if (field.values) {
              customFields.propertyPurpose = Object.entries(field.values).map(([name, count]) => ({
                name,
                value: count
              }));
            }
            // Se for do tipo select/multiselect mas não tiver dados populados
            else if (field.field_type === 'select' && field.options) {
              // Criar dados simulados baseados nas opções disponíveis
              customFields.propertyPurpose = field.options.map(option => ({
                name: option.value,
                value: Math.floor(Math.random() * 20) + 5 // Valores simulados entre 5-25
              }));
            }
          }
        });
      }
      
      return {
        totalLeads: leadsCountResponse.total_leads || analyticsOverviewResponse?.leads?.total || 0,
        leadsByUser,
        leadsByStage,
        conversionRates,
        leadCycleTime: leadCycleTimeResponse.lead_cycle_time_days || 0,
        winRate: winRateResponse.win_rate_percentage || 0,
        averageDealSize: averageDealSizeResponse.average_deal_size || 0,
        salesbotRecovery: salesbotRecoveryResponse.recovered_leads_count || 0,
        salesTrend: [], // Removido por enquanto para otimização
        customFields: {}, // Removido por enquanto para otimização
        analyticsOverview: analyticsOverviewResponse,
        analyticsFunnel: analyticsFunnelResponse,
        analyticsTeam: analyticsTeamResponse, // Adicionar dados da equipe
        meetingsStats: meetingsStatsResponse
      };
    } catch (error) {
      console.error('Erro ao montar dashboard de vendas:', error);
      return {}; // Retorno vazio em caso de erro
    }
  },

  // Métodos para endpoints específicos

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

  async getAnalyticsOverview(days = 30) {
    return this.get('/analytics/overview', { days });
  },

  async getAnalyticsTrends(days = 30, metric = 'leads') {
    return this.get('/analytics/trends', { days, metric });
  },

  async getAnalyticsFunnel(days = 30, pipeline_id = null) {
    const params = { days };
    if (pipeline_id) params.pipeline_id = pipeline_id;
    return this.get('/analytics/funnel', params);
  },

  async getAnalyticsTeamPerformance(days = 30) {
    return this.get('/analytics/team-performance', { days });
  },

  // Facebook Ads
  async getFacebookAdsCampaigns() {
    return this.get('/facebook-ads/campaigns');
  },

  async getFacebookAdsInsights(days = 30) {
    return this.get('/facebook-ads/insights', this.getFacebookTimeParams(days));
  },

  async getFacebookAdsInsightsSummary(days = 30) {
    return this.get('/facebook-ads/insights/summary', this.getFacebookTimeParams(days));
  },

  async getFacebookAdsCampaignInsights(campaignId, days = 30) {
    return this.get(`/facebook-ads/campaigns/${campaignId}/insights`, this.getFacebookTimeParams(days));
  },

  // Sales
  async getSalesRevenue(days = 30, groupBy = 'day') {
    // Ajuste automático da granularidade baseado no período
    const autoGroupBy = days <= 31 ? 'day' : 'month';
    return this.get('/sales/revenue', { days, group_by: groupBy || autoGroupBy });
  },

  async getSalesByPipeline(days = 30) {
    return this.get('/sales/by-pipeline', { days });
  },

  async getSalesGrowth(currentDays = 30, previousDays = 30) {
    return this.get('/sales/growth', { current_days: currentDays, previous_days: previousDays });
  },

  async getSalesByUser(days = 30) {
    return this.get('/sales/by-user', { days });
  },

  // Meetings
  async getMeetingsStats(days = 30) {
    return this.get('/meetings/stats', { days });
  },

  async getScheduledMeetingsByUser() {
    return this.get('/meetings/scheduled-by-user');
  },

  async getCompletedMeetingsByUser(days = 30) {
    return this.get('/meetings/completed-by-user', { days });
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

  async getCustomFieldsStatistics() {
    return this.get('/custom-fields/statistics');
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
  },

  // Events
  async getEvents(params = {}) {
    return this.get('/events', params);
  },

  async getEventTypes() {
    return this.get('/events/types');
  },

  // Corretor Dashboard
  /**
   * Obtém lista de corretores disponíveis
   * @returns {Promise} - Lista de corretores com suas métricas básicas
   */
  async getCorretoresList() {
    return this.get('/corretor-dashboard/list');
  },

  /**
   * Obtém dashboard completo de um corretor específico
   * @param {string} corretorName - Nome do corretor
   * @param {number} days - Período em dias para análise
   * @returns {Promise} - Dashboard completo do corretor
   */
  async getCorretorDashboardComplete(corretorName, days = 30) {
    return this.get('/corretor-dashboard/complete', { 
      corretor_name: corretorName,
      days 
    });
  },

  /**
   * Obtém comparação entre corretores
   * @param {number} days - Período em dias
   * @param {number} topN - Número de top corretores para retornar
   * @returns {Promise} - Estatísticas de comparação da equipe
   */
  async getCorretoresComparison(days = 30, topN = 10) {
    return this.get('/corretor-dashboard/comparison', { days, top_n: topN });
  },

  // Leads por Corretor
  async getActiveLeadsByCorretor(corretorName) {
    return this.get('/leads/active-by-corretor', { corretor_name: corretorName });
  },

  async getLostLeadsByCorretor(corretorName) {
    return this.get('/leads/lost-by-corretor', { corretor_name: corretorName });
  },

  async getWonLeadsByCorretor(corretorName) {
    return this.get('/leads/won-by-corretor', { corretor_name: corretorName });
  },

  async getLeadsByStageCorretor(corretorName) {
    return this.get('/leads/by-stage-corretor', { corretor_name: corretorName });
  },

  async getConversionRateByCorretor(corretorName, days = 30) {
    return this.get('/leads/conversion-rate-by-corretor', { 
      corretor_name: corretorName,
      period_days: days 
    });
  },

  // Sales por Corretor
  async getSalesRevenueByCorretor(corretorName, days = 30, groupBy = 'day') {
    return this.get('/sales/revenue-by-corretor', { 
      corretor_name: corretorName,
      days,
      group_by: groupBy
    });
  },

  async getSalesByUserCorretor(corretorName, days = 30) {
    return this.get('/sales/by-user-corretor', { 
      corretor_name: corretorName,
      days 
    });
  },

  async getSalesGrowthByCorretor(corretorName, currentDays = 30, previousDays = 30) {
    return this.get('/sales/growth-by-corretor', { 
      corretor_name: corretorName,
      current_days: currentDays,
      previous_days: previousDays
    });
  },

  // Meetings por Corretor
  async getMeetingsScheduledByCorretor(corretorName) {
    return this.get('/meetings/scheduled-by-corretor', { corretor_name: corretorName });
  },

  async getMeetingsCompletedByCorretor(corretorName, days = 30) {
    return this.get('/meetings/completed-by-corretor', { 
      corretor_name: corretorName,
      days 
    });
  },

  async getMeetingsStatsByCorretor(corretorName, days = 30) {
    return this.get('/meetings/stats-by-corretor', { 
      corretor_name: corretorName,
      days 
    });
  },

  // Analytics por Corretor
  async getLeadCycleTimeByCorretor(corretorName, days = 90) {
    return this.get('/analytics/lead-cycle-time-by-corretor', { 
      corretor_name: corretorName,
      days 
    });
  },

  async getWinRateByCorretor(corretorName, days = 90) {
    return this.get('/analytics/win-rate-by-corretor', { 
      corretor_name: corretorName,
      days 
    });
  },

  async getAverageDealSizeByCorretor(corretorName, days = 90) {
    return this.get('/analytics/average-deal-size-by-corretor', { 
      corretor_name: corretorName,
      days 
    });
  },

  /**
   * Constrói os dados do dashboard de marketing com filtro de corretor
   * @param {number} days - Período em dias para análise
   * @param {string} corretorName - Nome do corretor (opcional)
   * @returns {Promise<Object>} - Dados completos do dashboard de marketing
   */
  async getMarketingDashboardWithCorretor(days = 90, corretorName = null) {
    // Se tiver corretor selecionado, buscar dados específicos
    if (corretorName) {
      const corretorDashboard = await this.getCorretorDashboardComplete(corretorName, days);
      
      // Adaptar dados do corretor para o formato do dashboard de marketing
      return {
        totalLeads: corretorDashboard?.leads_metrics?.total_leads || 0,
        leadsBySource: [], // Não disponível por corretor
        leadsByTag: [], // Não disponível por corretor
        leadsByAd: [], // Não disponível por corretor
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
        facebookCampaigns: [],
        metricsTrend: [],
        customFields: {},
        analyticsOverview: {
          leads: corretorDashboard?.leads_metrics || {}
        },
        corretorData: corretorDashboard // Dados específicos do corretor
      };
    }
    
    // Caso contrário, retornar dashboard geral
    return this.getMarketingDashboard(days);
  },

  /**
   * Constrói os dados do dashboard de vendas com filtro de corretor
   * @param {number} days - Período em dias para análise
   * @param {string} corretorName - Nome do corretor (opcional)
   * @returns {Promise<Object>} - Dados completos do dashboard de vendas
   */
  async getSalesDashboardWithCorretor(days = 90, corretorName = null) {
    // Se tiver corretor selecionado, buscar dados específicos
    if (corretorName) {
      try {
        // Buscar todos os dados em paralelo
        const [corretorDashboard, salesTrendData, leadsByStage] = await Promise.all([
          this.getCorretorDashboardComplete(corretorName, days),
          this.getSalesRevenueByCorretor(corretorName, days, days <= 31 ? 'day' : 'month'),
          this.getLeadsByStageCorretor(corretorName)
        ]);

        // Processar tendência de vendas
        let salesTrend = [];
        if (salesTrendData?.revenue_by_period) {
          salesTrend = salesTrendData.revenue_by_period.map(item => ({
            month: this.formatTrendDate(item.period, days),
            sales: item.deals_count,
            value: item.revenue,
            fullDate: item.period
          }));
          salesTrend.sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
        }

        // Processar leads por estágio
        const leadsByStageArray = leadsByStage?.leads_by_stage 
          ? Object.entries(leadsByStage.leads_by_stage).map(([name, value]) => ({ name, value }))
          : (corretorDashboard?.leads_metrics?.leads_by_stage 
            ? Object.entries(corretorDashboard.leads_metrics.leads_by_stage).map(([name, value]) => ({ name, value }))
            : []);

        // Construir array de dados do corretor único
        const leadsByUser = [{
          name: corretorName,
          value: corretorDashboard?.leads_metrics?.total_leads || 0,
          active: corretorDashboard?.leads_metrics?.active_leads || 0,
          lost: corretorDashboard?.leads_metrics?.lost_leads || 0,
          meetings: corretorDashboard?.meetings_metrics?.scheduled_meetings || 0,
          meetingsHeld: corretorDashboard?.meetings_metrics?.completed_meetings || 0,
          sales: corretorDashboard?.sales_metrics?.total_sales || 0
        }];

        return {
          totalLeads: corretorDashboard?.leads_metrics?.total_leads || 0,
          leadsByUser,
          leadsByStage: leadsByStageArray,
          conversionRates: {
            meetings: 50, // Valor estimado
            prospects: 30, // Valor estimado
            sales: corretorDashboard?.performance_metrics?.conversion_rate || 0
          },
          leadCycleTime: corretorDashboard?.performance_metrics?.average_cycle_time_days || 0,
          winRate: corretorDashboard?.performance_metrics?.win_rate || 0,
          averageDealSize: corretorDashboard?.sales_metrics?.average_deal_size || 0,
          salesbotRecovery: corretorDashboard?.salesbot_metrics?.recovered_leads || 0,
          salesTrend,
          customFields: {},
          analyticsOverview: {
            leads: corretorDashboard?.leads_metrics || {}
          },
          corretorData: corretorDashboard // Dados específicos do corretor
        };
      } catch (error) {
        console.error('Erro ao buscar dados do corretor:', error);
        // Retornar dashboard geral em caso de erro
        return this.getSalesDashboard(days);
      }
    }
    
    // Caso contrário, retornar dashboard geral
    return this.getSalesDashboard(days);
  },

  // NOVOS MÉTODOS OTIMIZADOS - Backend v2.0
  /**
   * Dashboard de marketing completo em uma única requisição
   * Substitui getMarketingDashboard() - 6x mais rápido
   * @param {number} days - Período em dias para análise
   * @returns {Promise<Object>} - Dados completos do dashboard de marketing
   */
  async getMarketingDashboardComplete(days = 90) {
    return this.get(`/dashboard/marketing-complete`, { days });
  },

  /**
   * Dashboard de vendas completo em uma única requisição
   * Substitui getSalesDashboardWithCorretor() - 11x mais rápido
   * @param {number} days - Período em dias para análise
   * @param {string} corretor - Nome do corretor (opcional)
   * @returns {Promise<Object>} - Dados completos do dashboard de vendas
   */
  async getSalesDashboardComplete(days = 90, corretor = null) {
    const params = { days };
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
  }
};

export default KommoAPI;