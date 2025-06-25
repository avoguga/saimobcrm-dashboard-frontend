/**
 * 🚀 API GRANULAR SIMPLIFICADA E HONESTA
 * 
 * VENDAS: Usa endpoints V2 reais do backend
 * MARKETING: Usa endpoint completo /marketing-complete
 * 
 * APENAS métodos REALMENTE usados pelo Dashboard.jsx
 */

import { MockDataService } from './mockDataService';

const API_URL = import.meta.env.VITE_API_URL || 'https://backendsaimob.gustavohenrique.dev';

// Flags HONESTAS por módulo
const USE_MOCK_SALES = false; // ✅ VENDAS: Endpoints V2 implementados!
const USE_MOCK_MARKETING = false; // ✅ MARKETING: Endpoints implementados!

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
        
        // Suporta múltiplas seleções separadas por vírgula
        if (corretor) params.append('corretor', corretor);
        if (fonte) params.append('fonte', fonte);

        const [kpis, leadsByUser, conversionRates, pipelineStatus] = await Promise.all([
          fetch(`${API_URL}/api/v2/sales/kpis?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/charts/leads-by-user?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/sales/conversion-rates?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/sales/pipeline-status?${params}`).then(r => r.json())
        ]);

        console.timeEnd('Sales Dashboard V2 Load');
        
        console.log('🔍 DEBUG - leadsByUser response:', leadsByUser);
        console.log('🔍 DEBUG - analyticsTeam no leadsByUser:', leadsByUser.analyticsTeam);

        return {
          ...kpis,
          leadsByUser: leadsByUser.leadsByUser || [],
          analyticsTeam: leadsByUser.analyticsTeam || null, // Incluir analyticsTeam do endpoint leads-by-user
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
  static async loadMarketingDashboard(days = 30, fonte = null, customDates = null, campaignFilters = {}) {
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
        // Usar endpoints reais de marketing
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

        // Adicionar filtros de campanhas Facebook
        if (campaignFilters.campaignIds && campaignFilters.campaignIds.length > 0) {
          campaignFilters.campaignIds.forEach(id => {
            params.append('campaign_ids[]', id);
          });
        }
        
        if (campaignFilters.status && campaignFilters.status.length > 0) {
          campaignFilters.status.forEach(s => {
            params.append('campaign_status[]', s);
          });
        }
        
        if (campaignFilters.objective && campaignFilters.objective.length > 0) {
          campaignFilters.objective.forEach(obj => {
            params.append('campaign_objective[]', obj);
          });
        }
        
        if (campaignFilters.searchTerm) {
          params.append('campaign_search', campaignFilters.searchTerm);
        }

        // Usar endpoint completo de marketing
        const marketingData = await fetch(`${API_URL}/dashboard/marketing-complete?${params}`).then(r => r.json());

        console.timeEnd('Marketing Dashboard Load');
        console.log('✅ Marketing data completo recebido:', marketingData);

        return {
          ...marketingData,
          _metadata: { realAPI: true, granular: true, singleEndpoint: true, ...marketingData._metadata }
        };
      }
    } catch (error) {
      console.error('❌ Erro no carregamento do dashboard de marketing:', error);
      throw error;
    }
  }


  /**
   * 🚀 BUSCAR INSIGHTS DE CAMPANHAS ESPECÍFICAS
   * Implementação conforme recomendação do backend
   */
  static async getFacebookCampaignInsights(campaignIds, dateRange = null) {
    try {
      const since = dateRange?.start || '2025-06-01';
      const until = dateRange?.end || '2025-06-09';
      
      console.log(`🚀 Buscando insights para ${campaignIds.length} campanhas de ${since} até ${until}`);
      
      // Buscar insights de cada campanha em paralelo (conforme recomendação do backend)
      const campaignInsights = await Promise.all(
        campaignIds.map(async (id) => {
          const cacheKey = `campaign_insight_${id}_${since}_${until}`;
          const cached = this.getCached(cacheKey);
          
          if (cached) {
            console.log(`📦 Cache hit para campanha ${id}`);
            return { campaignId: id, ...cached };
          }

          try {
            const response = await fetch(`${API_URL}/facebook-ads/campaigns/${id}/insights?since=${since}&until=${until}`);
            const insightData = await response.json();
            
            this.setCache(cacheKey, insightData);
            console.log(`✅ Insight carregado para campanha ${id}:`, insightData);
            
            return { 
              campaignId: id, 
              data: insightData.data || [],
              paging: insightData.paging || null
            };
          } catch (error) {
            console.error(`❌ Erro ao buscar insight da campanha ${id}:`, error);
            return { campaignId: id, error: error.message };
          }
        })
      );

      // Processar e agregar os dados (método interno)
      console.log('🔍 Debug - Campaign insights antes do processamento:', campaignInsights);
      const aggregatedData = this.processInsights(campaignInsights);
      
      console.log('✅ Dados agregados dos insights:', aggregatedData);
      console.log('📊 Totais calculados:', {
        leads: aggregatedData.totalLeads,
        impressions: aggregatedData.totalImpressions,
        reach: aggregatedData.totalReach,
        spend: aggregatedData.totalSpend,
        ctr: aggregatedData.averageCTR,
        cpc: aggregatedData.averageCPC,
        cpm: aggregatedData.averageCPM,
        costPerLead: aggregatedData.costPerLead
      });
      return aggregatedData;
      
    } catch (error) {
      console.error('❌ Erro geral ao buscar insights:', error);
      return this.getEmptyInsights();
    }
  }

  /**
   * 🔧 PROCESSAR E AGREGAR INSIGHTS
   * Processa os dados brutos das campanhas conforme estrutura real do backend
   */
  static processInsights(campaignInsights) {
    console.log('🔍 Debug processInsights - Input:', campaignInsights);
    const validInsights = campaignInsights.filter(insight => !insight.error && insight.data);
    console.log('🔍 Debug processInsights - Valid insights:', validInsights);
    
    // Inicializar totais
    const aggregated = {
      totalLeads: 0,
      totalImpressions: 0,
      totalReach: 0,
      totalClicks: 0,
      totalSpend: 0,
      totalInlineLinkClicks: 0,
      totalPageEngagement: 0,
      totalPostEngagement: 0,
      totalComments: 0,
      totalPostReactions: 0,
      campaigns: []
    };

    // Processar insights de cada campanha
    validInsights.forEach(insight => {
      if (insight.data && insight.data.length > 0) {
        insight.data.forEach(dataPoint => {
          // Métricas básicas
          aggregated.totalImpressions += parseInt(dataPoint.impressions || 0);
          aggregated.totalReach += parseInt(dataPoint.reach || 0);
          aggregated.totalClicks += parseInt(dataPoint.clicks || 0);
          aggregated.totalSpend += parseFloat(dataPoint.spend || 0);
          aggregated.totalInlineLinkClicks += parseInt(dataPoint.inline_link_clicks || 0);

          // Processar actions array para extrair leads e engajamento
          if (dataPoint.actions) {
            dataPoint.actions.forEach(action => {
              switch (action.action_type) {
                case 'lead':
                  aggregated.totalLeads += parseInt(action.value || 0);
                  break;
                case 'page_engagement':
                  aggregated.totalPageEngagement += parseInt(action.value || 0);
                  break;
                case 'post_engagement':
                  aggregated.totalPostEngagement += parseInt(action.value || 0);
                  break;
                case 'comment':
                  aggregated.totalComments += parseInt(action.value || 0);
                  break;
                case 'post_reaction':
                  aggregated.totalPostReactions += parseInt(action.value || 0);
                  break;
              }
            });
          }

          // Extrair leads e custo por lead das actions
          let campaignLeads = 0;
          let campaignCostPerLead = 0;

          if (dataPoint.actions) {
            const leadAction = dataPoint.actions.find(a => a.action_type === 'lead');
            if (leadAction) {
              campaignLeads = parseInt(leadAction.value || 0);
            }
          }

          if (dataPoint.cost_per_action_type) {
            const leadCost = dataPoint.cost_per_action_type.find(c => c.action_type === 'lead');
            if (leadCost) {
              campaignCostPerLead = parseFloat(leadCost.value || 0);
            }
          }

          // Dados por campanha para detalhamento
          const campaignData = {
            id: insight.campaignId,
            impressions: parseInt(dataPoint.impressions || 0),
            reach: parseInt(dataPoint.reach || 0),
            clicks: parseInt(dataPoint.clicks || 0),
            spend: parseFloat(dataPoint.spend || 0),
            ctr: parseFloat(dataPoint.ctr || 0),
            cpc: parseFloat(dataPoint.cpc || 0),
            cpm: parseFloat(dataPoint.cpm || 0),
            inline_link_clicks: parseInt(dataPoint.inline_link_clicks || 0),
            inline_link_click_ctr: parseFloat(dataPoint.inline_link_click_ctr || 0),
            cost_per_inline_link_click: parseFloat(dataPoint.cost_per_inline_link_click || 0),
            leads: campaignLeads,
            costPerLead: campaignCostPerLead,
            dateStart: dataPoint.date_start,
            dateStop: dataPoint.date_stop
          };

          aggregated.campaigns.push(campaignData);
        });
      }
    });

    // Calcular métricas derivadas totais
    aggregated.averageCTR = aggregated.totalImpressions > 0 
      ? (aggregated.totalClicks / aggregated.totalImpressions) * 100 
      : 0;
      
    aggregated.averageCPC = aggregated.totalClicks > 0 
      ? aggregated.totalSpend / aggregated.totalClicks 
      : 0;
      
    aggregated.averageCPM = aggregated.totalImpressions > 0 
      ? (aggregated.totalSpend / aggregated.totalImpressions) * 1000 
      : 0;
      
    aggregated.costPerLead = aggregated.totalLeads > 0 
      ? aggregated.totalSpend / aggregated.totalLeads 
      : 0;

    aggregated.inlineLinkClickCTR = aggregated.totalImpressions > 0 
      ? (aggregated.totalInlineLinkClicks / aggregated.totalImpressions) * 100 
      : 0;

    aggregated.costPerInlineLinkClick = aggregated.totalInlineLinkClicks > 0 
      ? aggregated.totalSpend / aggregated.totalInlineLinkClicks 
      : 0;

    return aggregated;
  }

  /**
   * 🚀 BUSCAR RESUMO GERAL DE INSIGHTS
   * Endpoint para resumo geral (caso necessário)
   */
  static async getFacebookInsightsSummary(dateRange = null) {
    try {
      const since = dateRange?.start || '2025-06-01';
      const until = dateRange?.end || '2025-06-09';
      
      const response = await fetch(`${API_URL}/facebook-ads/insights/summary?since=${since}&until=${until}`);
      const summary = await response.json();
      
      console.log('✅ Resumo geral de insights:', summary);
      return summary;
    } catch (error) {
      console.error('❌ Erro ao buscar resumo de insights:', error);
      return this.getEmptyInsights();
    }
  }

  /**
   * 🚀 BUSCAR INSIGHTS COM BREAKDOWNS (GÊNERO)
   * Usa o endpoint de insights com parâmetro de breakdown para gênero
   */
  static async getFacebookInsightsWithBreakdowns(campaignIds = [], dateRange = null) {
    try {
      const since = dateRange?.start || '2025-06-01';
      const until = dateRange?.end || '2025-06-09';
      
      console.log(`🎯 Buscando insights com breakdown de gênero`);
      
      // Usar endpoint com level=campaign e breakdown=gender
      const params = new URLSearchParams({
        level: 'campaign',
        breakdowns: 'gender',
        since,
        until
      });
      
      const response = await fetch(`${API_URL}/facebook-ads/insights?${params}`);
      const data = await response.json();
      
      console.log('✅ Insights com breakdown de gênero:', data);
      
      // Processar dados de gênero
      const genderData = this.processGenderData(data);
      
      // Retornar apenas dados de gênero reais
      return {
        genderData,
        cityData: [] // Não usar mais dados de cidade
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar insights com breakdowns:', error);
      return {
        genderData: [],
        cityData: [],
        error: error.message
      };
    }
  }

  /**
   * 🔧 PROCESSAR DADOS DE GÊNERO
   * Agrupa e processa os dados de gênero do response da API
   */
  static processGenderData(response) {
    const genderMap = new Map();
    
    if (response && response.data && Array.isArray(response.data)) {
      response.data.forEach(item => {
        if (item.gender) {
          // Extrair leads das actions
          let leads = 0;
          if (item.actions) {
            const leadAction = item.actions.find(a => a.action_type === 'lead');
            if (leadAction) {
              leads = parseInt(leadAction.value || 0);
            }
          }
          
          // Mapear nome do gênero
          const genderName = item.gender === 'male' ? 'Masculino' : 
                           item.gender === 'female' ? 'Feminino' : 
                           'Não informado';
          
          // Agregar dados por gênero
          const current = genderMap.get(genderName) || { 
            name: genderName,
            value: 0,
            impressions: 0,
            spend: 0
          };
          
          current.value += leads;
          current.impressions += parseInt(item.impressions || 0);
          current.spend += parseFloat(item.spend || 0);
          
          genderMap.set(genderName, current);
        }
      });
    }
    
    // Converter para array e ordenar por quantidade de leads
    const genderData = Array.from(genderMap.values())
      .sort((a, b) => b.value - a.value);
    
    console.log('📊 Dados de gênero processados:', genderData);
    return genderData;
  }

  /**
   * 🔧 PROCESSAR DADOS DE BREAKDOWNS (LEGACY - mantido para compatibilidade)
   * Agrupa e processa os dados de gênero e cidade
   */
  static processBreakdownData(rawData, breakdowns) {
    const result = {
      genderData: [],
      cityData: []
    };
    
    // Mapas para agregar dados
    const genderMap = new Map();
    const cityMap = new Map();
    
    // Função helper para processar cada item de dados
    const processDataItem = (item) => {
      // Extrair leads das actions
      let leads = 0;
      if (item.actions) {
        const leadAction = item.actions.find(a => a.action_type === 'lead');
        if (leadAction) {
          leads = parseInt(leadAction.value || 0);
        }
      }
      
      // Processar por gênero
      if (item.gender && breakdowns.includes('gender')) {
        const current = genderMap.get(item.gender) || { 
          name: item.gender === 'male' ? 'Masculino' : item.gender === 'female' ? 'Feminino' : 'Não informado',
          value: 0,
          impressions: 0,
          spend: 0
        };
        current.value += leads;
        current.impressions += parseInt(item.impressions || 0);
        current.spend += parseFloat(item.spend || 0);
        genderMap.set(item.gender, current);
      }
      
      // Processar por cidade
      if (item.city && breakdowns.includes('city')) {
        const current = cityMap.get(item.city) || { 
          name: item.city,
          value: 0,
          impressions: 0,
          spend: 0
        };
        current.value += leads;
        current.impressions += parseInt(item.impressions || 0);
        current.spend += parseFloat(item.spend || 0);
        cityMap.set(item.city, current);
      }
    };
    
    // Processar dados baseado na estrutura recebida
    if (Array.isArray(rawData)) {
      // Dados diretos do endpoint geral
      if (rawData.length > 0 && rawData[0].data) {
        // Estrutura com múltiplas campanhas
        rawData.forEach(campaign => {
          if (campaign.data && Array.isArray(campaign.data)) {
            campaign.data.forEach(processDataItem);
          }
        });
      } else {
        // Array direto de insights
        rawData.forEach(processDataItem);
      }
    } else if (rawData.data && Array.isArray(rawData.data)) {
      // Resposta única com array de dados
      rawData.data.forEach(processDataItem);
    }
    
    // Converter mapas para arrays e ordenar
    result.genderData = Array.from(genderMap.values())
      .sort((a, b) => b.value - a.value);
    
    result.cityData = Array.from(cityMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 cidades
    
    console.log('📊 Dados processados de breakdowns:', result);
    return result;
  }

  /**
   * Retorna estrutura vazia para insights
   */
  static getEmptyInsights() {
    return {
      totalLeads: 0,
      totalImpressions: 0,
      totalReach: 0,
      totalClicks: 0,
      totalSpend: 0,
      totalInlineLinkClicks: 0,
      totalPageEngagement: 0,
      totalPostEngagement: 0,
      totalComments: 0,
      totalPostReactions: 0,
      averageCTR: 0,
      averageCPC: 0,
      averageCPM: 0,
      costPerLead: 0,
      inlineLinkClickCTR: 0,
      costPerInlineLinkClick: 0,
      campaigns: []
    };
  }

  /**
   * 🚀 BUSCAR CAMPANHAS DO FACEBOOK
   * Usado para popular o filtro de campanhas
   */
  static async getFacebookCampaigns() {
    const cacheKey = 'facebook_campaigns';
    const cached = this.getCached(cacheKey);
    
    if (cached) {
      console.log('📦 Campanhas do Facebook do cache');
      return cached;
    }

    try {
      const response = await fetch(`${API_URL}/facebook-ads/campaigns`);
      const campaigns = await response.json();
      
      this.setCache(cacheKey, campaigns);
      console.log('✅ Campanhas do Facebook carregadas:', campaigns);
      
      return campaigns;
    } catch (error) {
      console.error('❌ Erro ao buscar campanhas do Facebook:', error);
      // Retornar array vazio em caso de erro
      return [];
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