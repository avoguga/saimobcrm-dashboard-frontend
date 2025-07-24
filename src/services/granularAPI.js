/**
 * 🚀 API GRANULAR SIMPLIFICADA E HONESTA
 * 
 * VENDAS: Usa endpoints V2 reais do backend
 * MARKETING: Usa endpoint completo /marketing-complete
 * 
 * APENAS métodos REALMENTE usados pelo Dashboard.jsx
 */

import { MockDataService } from './mockDataService';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
        } else {
          params.append('days', days);
        }
        
        // Suporta múltiplas seleções separadas por vírgula
        if (corretor) params.append('corretor', corretor);
        if (fonte) params.append('fonte', fonte);
        
        // Adicionar timestamp para evitar cache do browser
        params.append('_t', Date.now().toString());

        // DEBUG: Log what's being sent to API
        console.log('🔍 Sales API Params:', {
          corretor,
          fonte,
          paramsString: params.toString(),
          decodedParams: decodeURIComponent(params.toString()),
          fullUrls: [
            `${API_URL}/api/v2/sales/kpis?${params}`,
            `${API_URL}/api/v2/charts/leads-by-user?${params}`,
            `${API_URL}/api/v2/sales/conversion-rates?${params}`,
            `${API_URL}/api/v2/sales/pipeline-status?${params}`
          ]
        });

        const [kpis, leadsByUser, conversionRates, pipelineStatus] = await Promise.all([
          fetch(`${API_URL}/api/v2/sales/kpis?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/charts/leads-by-user?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/sales/conversion-rates?${params}`).then(r => r.json()),
          fetch(`${API_URL}/api/v2/sales/pipeline-status?${params}`).then(r => r.json())
        ]);

        console.timeEnd('Sales Dashboard V2 Load');
        
        // DEBUG: Log API responses
        console.log('📊 Sales API Responses:', {
          kpis,
          leadsByUser,
          fonte: fonte || 'none',
          totalLeads: kpis.totalLeads,
          userCount: leadsByUser.leadsByUser?.length,
          metadata: {
            kpisMetadata: kpis._metadata,
            leadsByUserMetadata: leadsByUser._metadata
          }
        });
        

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
        } else {
          params.append('days', days);
        }
        
        if (fonte) params.append('fonte', fonte);

        // DEBUG: Log marketing params before adding campaign filters
        console.log('🔍 Marketing API Base Params:', {
          fonte,
          days,
          customDates,
          paramsString: params.toString()
        });

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

        // DEBUG: Log final marketing API call
        console.log('🔍 Marketing API Final URL:', `${API_URL}/dashboard/marketing-complete?${params}`);

        // Mapear periodo para preset WhatsApp
        let whatsappPreset = 'last_30d';
        if (days <= 7) whatsappPreset = 'last_7d';
        
        // Buscar dados de marketing em paralelo com WhatsApp e gênero
        const [marketingData, whatsappData, genderData] = await Promise.all([
          fetch(`${API_URL}/dashboard/marketing-complete?${params}`).then(r => r.json()),
          this.getWhatsAppMetrics(whatsappPreset),
          this.getGenderSegmentation(whatsappPreset)
        ]);

        console.timeEnd('Marketing Dashboard Load');

        // Combinar dados usando summary conforme guia do backend
        const whatsappSummary = whatsappData.summary || {};
        const genderSegments = genderData.data || [];
        
        // Converter dados de gênero para formato esperado pelo chart
        const genderData_formatted = genderSegments.map(segment => ({
          name: segment.genero === 'male' ? 'Masculino' : 
                segment.genero === 'female' ? 'Feminino' : 
                segment.genero,
          value: segment.leads || 0
        }));

        const enhancedData = {
          ...marketingData,
          // Substituir dados mock com dados reais do WhatsApp
          whatsappConversations: whatsappSummary.total_conversations || 0,
          profileVisits: whatsappSummary.total_profile_visits || 0,
          whatsappSpend: whatsappSummary.total_spend || 0,
          // Substituir dados mock com dados reais de gênero
          genderData: genderData_formatted,
          _metadata: { 
            ...marketingData._metadata,
            whatsappIntegrated: true,
            genderIntegrated: true,
            whatsappEndpoint: '/facebook-ads/whatsapp/insights',
            genderEndpoint: '/facebook-ads/leads/segmentation'
          }
        };

        console.log('✅ Dados integrados:', {
          whatsapp: {
            conversations: whatsappSummary.total_conversations,
            profileVisits: whatsappSummary.total_profile_visits,
            spend: whatsappSummary.total_spend
          },
          gender: {
            segments: genderSegments.length,
            totalLeads: genderData.summary?.total_leads || 0,
            formatted: genderData_formatted
          }
        });

        return enhancedData;
      }
    } catch (error) {
      console.error('❌ Erro no carregamento do dashboard de marketing:', error);
      throw error;
    }
  }

  /**
   * 📱 BUSCAR MÉTRICAS DE WHATSAPP E PERFIL
   * Extrai métricas específicas dos insights do Facebook
   */
  static async getWhatsAppAndProfileMetrics(dateRange = null) {
    try {
      const since = dateRange?.start || '2025-06-01';
      const until = dateRange?.end || '2025-06-09';
      
      const cacheKey = `whatsapp_profile_metrics_${since}_${until}`;
      const cached = this.getCached(cacheKey);
      
      if (cached) {
        console.log('🎯 Usando métricas WhatsApp/Perfil do cache');
        return cached;
      }

      console.log('📱 Buscando métricas WhatsApp e perfil dos insights...');

      // Buscar insights padrão
      const params = new URLSearchParams({
        since,
        until,
        date_preset: 'last_30d'
      });

      const response = await fetch(`${API_URL}/facebook-ads/insights/summary?${params}`);
      const data = await response.json();

      // Inicializar métricas
      let whatsappConversations = 0;
      let whatsappBlocks = 0;
      let profileVisits = 0;

      // Processar actions para extrair métricas específicas
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach(insight => {
          if (insight.actions && Array.isArray(insight.actions)) {
            insight.actions.forEach(action => {
              // WhatsApp Conversations
              if (action.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
                  action.action_type === 'messaging_conversation_started_7d') {
                whatsappConversations += parseInt(action.value || 0);
              }
              
              // WhatsApp Blocks
              if (action.action_type === 'onsite_conversion.messaging_block' ||
                  action.action_type === 'messaging_block') {
                whatsappBlocks += parseInt(action.value || 0);
              }
              
              // Profile Visits
              if (action.action_type === 'onsite_conversion.view_content' ||
                  action.action_type === 'page_engagement' ||
                  action.action_type === 'landing_page_view') {
                profileVisits += parseInt(action.value || 0);
              }
            });
          }
        });
      }

      const result = {
        whatsappConversations,
        whatsappBlocks,
        profileVisits,
        _metadata: {
          source: 'facebook_insights',
          dateRange: { since, until },
          processedFrom: 'actions'
        }
      };

      // Cache por 5 minutos
      this.setCache(cacheKey, result);

      console.log('✅ Métricas WhatsApp/Perfil extraídas:', result);

      return result;

    } catch (error) {
      console.error('❌ Erro ao buscar métricas WhatsApp/Perfil:', error);
      
      // Retornar zeros ao invés de mock para não mascarar problemas
      return {
        whatsappConversations: 0,
        whatsappBlocks: 0,
        profileVisits: 0,
        error: error.message
      };
    }
  }

  /**
   * 🚀 BUSCAR INSIGHTS DE CAMPANHAS ESPECÍFICAS
   * Implementação conforme recomendação do backend
   * @param {Array} campaignIds - IDs das campanhas
   * @param {Object} dateRange - Range de datas {start, end}
   * @param {Array} adsetIds - IDs dos conjuntos de anúncios (opcional)
   * @param {Array} adIds - IDs dos anúncios (opcional)
   */
  static async getFacebookCampaignInsights(campaignIds, dateRange = null, adsetIds = [], adIds = []) {
    try {
      const since = dateRange?.start || '2025-06-01';
      const until = dateRange?.end || '2025-06-09';
      
      // Log dos filtros recebidos
      console.log('📊 getFacebookCampaignInsights chamado com:', {
        campaignIds,
        dateRange,
        adsetIds,
        adIds
      });
      
      // Se há filtros de adsets ou ads, tentar endpoint direto primeiro
      if (adsetIds.length > 0 || adIds.length > 0) {
        console.log('🎯 Detectados filtros de adsets/ads, tentando endpoint direto...');
        const directResult = await this.getFacebookInsightsWithFilters(campaignIds, adsetIds, adIds, dateRange);
        if (directResult) {
          console.log('✅ Endpoint direto funcionou, retornando resultado filtrado');
          return directResult;
        }
      }
      
      // Construir parâmetros de filtro para método padrão
      const filterParams = new URLSearchParams();
      if (adsetIds.length > 0) {
        filterParams.append('adset_ids', adsetIds.join(','));
      }
      if (adIds.length > 0) {
        filterParams.append('ad_ids', adIds.join(','));
      }
      const filterQuery = filterParams.toString() ? `&${filterParams.toString()}` : '';
      
      console.log('🔗 Query de filtros (método padrão):', filterQuery);
      
      // Buscar insights de cada campanha em paralelo (conforme recomendação do backend)
      const campaignInsights = await Promise.all(
        campaignIds.map(async (id) => {
          const cacheKey = `campaign_insight_${id}_${since}_${until}_${filterQuery}`;
          const cached = this.getCached(cacheKey);
          
          if (cached) {
            return { campaignId: id, ...cached };
          }

          try {
            const url = `${API_URL}/facebook-ads/campaigns/${id}/insights?since=${since}&until=${until}${filterQuery}`;
            console.log('🚀 Fazendo requisição para:', url);
            const response = await fetch(url);
            const insightData = await response.json();
            
            this.setCache(cacheKey, insightData);
            
            return { 
              campaignId: id, 
              data: insightData.data || [],
              paging: insightData.paging || null
            };
          } catch (error) {
            return { campaignId: id, error: error.message };
          }
        })
      );

      // Processar e agregar os dados (método interno)
      const aggregatedData = this.processInsights(campaignInsights);
      
      return aggregatedData;
      
    } catch (error) {
      return this.getEmptyInsights();
    }
  }

  /**
   * 🔧 PROCESSAR E AGREGAR INSIGHTS
   * Processa os dados brutos das campanhas conforme estrutura real do backend
   */
  static processInsights(campaignInsights) {
    const validInsights = campaignInsights.filter(insight => !insight.error && insight.data);
    
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
      
      return summary;
    } catch (error) {
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
      
      
      // Usar endpoint com level=campaign e breakdown=gender
      const params = new URLSearchParams({
        level: 'campaign',
        breakdowns: 'gender',
        since,
        until
      });
      
      const response = await fetch(`${API_URL}/facebook-ads/insights?${params}`);
      const data = await response.json();
      
      
      // Processar dados de gênero
      const genderData = this.processGenderData(data);
      
      // Retornar apenas dados de gênero reais
      return {
        genderData,
        cityData: [] // Não usar mais dados de cidade
      };
      
    } catch (error) {
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
      console.log('📋 Facebook campaigns (cached):', { isArray: Array.isArray(cached), length: cached?.length });
      return Array.isArray(cached) ? cached : [];
    }

    try {
      const response = await fetch(`${API_URL}/facebook-ads/campaigns`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const campaigns = await response.json();
      console.log('📋 Facebook campaigns recebidas:', { isArray: Array.isArray(campaigns), length: campaigns?.length, type: typeof campaigns });
      
      // Garantir que sempre retornamos um array
      const validCampaigns = Array.isArray(campaigns) ? campaigns : [];
      
      this.setCache(cacheKey, validCampaigns);
      
      return validCampaigns;
    } catch (error) {
      console.error('❌ Erro ao buscar Facebook campaigns:', error);
      // Retornar array vazio em caso de erro
      return [];
    }
  }

  /**
   * 🚀 BUSCAR CONJUNTOS DE ANÚNCIOS (ADSETS)
   * Endpoint para conjuntos de anúncios do Facebook
   */
  static async getFacebookAdsets() {
    const cacheKey = 'facebook-adsets';
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${API_URL}/facebook-ads/adsets`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Se já é um array, retornar direto. Se não, pegar data.data
      const adsets = Array.isArray(data) ? data : (data.data || []);
      
      this.setCache(cacheKey, adsets);
      return adsets;
    } catch (error) {
      console.error('Erro ao buscar adsets:', error);
      return [];
    }
  }

  /**
   * 🚀 BUSCAR ANÚNCIOS (ADS)
   * Endpoint para anúncios do Facebook
   */
  static async getFacebookAds() {
    const cacheKey = 'facebook-ads';
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${API_URL}/facebook-ads/ads`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Se já é um array, retornar direto. Se não, pegar data.data
      const ads = Array.isArray(data) ? data : (data.data || []);
      
      this.setCache(cacheKey, ads);
      return ads;
    } catch (error) {
      console.error('Erro ao buscar ads:', error);
      return [];
    }
  }

  /**
   * 🚀 BUSCAR INSIGHTS ESPECÍFICOS (ENDPOINT ALTERNATIVO)
   * Tenta usar endpoint direto para insights com filtros
   */
  static async getFacebookInsightsWithFilters(campaignIds = [], adsetIds = [], adIds = [], dateRange = null) {
    try {
      const since = dateRange?.start || '2025-06-01';
      const until = dateRange?.end || '2025-06-09';
      
      console.log('🔍 Tentando endpoint direto de insights com filtros:', {
        campaignIds, adsetIds, adIds, dateRange
      });
      
      // Construir parâmetros
      const params = new URLSearchParams({
        since,
        until
      });
      
      if (campaignIds.length > 0) {
        params.append('campaign_ids', campaignIds.join(','));
      }
      if (adsetIds.length > 0) {
        params.append('adset_ids', adsetIds.join(','));
      }
      if (adIds.length > 0) {
        params.append('ad_ids', adIds.join(','));
      }
      
      const url = `${API_URL}/facebook-ads/insights?${params.toString()}`;
      console.log('🚀 URL alternativa:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📦 Resposta do endpoint direto:', data);
      
      return data;
    } catch (error) {
      console.warn('⚠️ Endpoint direto não disponível, usando método padrão');
      return null;
    }
  }

  /**
   * 🌍 BUSCAR DADOS GEOGRÁFICOS COM BREAKDOWN (OTIMIZADO)
   * Usa uma única requisição ao invés de múltiplas para evitar rate limit
   */
  static async getFacebookGeographicInsights(breakdown = 'city', dateRange = null) {
    try {
      const since = dateRange?.start || '2025-06-01';
      const until = dateRange?.end || '2025-06-09';
      
      const cacheKey = `geographic_insights_${breakdown}_${since}_${until}`;
      const cached = this.getCached(cacheKey);
      
      if (cached) {
        console.log('🎯 Usando dados geográficos do cache para:', breakdown);
        return cached;
      }

      console.log('🌍 Buscando dados geográficos via API única para:', breakdown);

      // OTIMIZAÇÃO: Usar endpoint geral ao invés de breakdown específico
      // Para evitar múltiplas requisições que causam rate limit
      const params = new URLSearchParams({
        level: 'account', // Level mais alto para uma única requisição
        breakdowns: breakdown,
        since,
        until,
        limit: 100 // Limitar resultados
      });

      const response = await fetch(`${API_URL}/facebook-ads/insights?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache por 10 minutos para evitar requisições repetidas
      this.setCache(cacheKey, data);
      
      console.log('✅ Dados geográficos obtidos:', {
        breakdown,
        totalItems: data.data?.length || 0,
        cached: true
      });
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar dados geográficos:', error);
      
      // Retornar dados mock em caso de erro para não quebrar a UI
      return { 
        data: [],
        error: error.message,
        fallback: true
      };
    }
  }

  /**
   * 🌍 PROCESSAR DADOS GEOGRÁFICOS
   * Extrai localizações únicas e processa leads
   */
  static processGeographicData(data, field) {
    const locationMap = new Map();
    
    if (data && Array.isArray(data)) {
      data.forEach(item => {
        if (item[field]) {
          // Extrair leads das actions
          let leads = 0;
          if (item.actions) {
            const leadAction = item.actions.find(a => a.action_type === 'lead');
            if (leadAction) {
              leads = parseInt(leadAction.value || 0);
            }
          }
          
          // Mapear nome da localização
          const locationName = item[field];
          
          // Agregar dados por localização
          const current = locationMap.get(locationName) || { 
            name: locationName,
            value: 0,
            impressions: 0,
            spend: 0,
            clicks: 0
          };
          
          current.value += leads;
          current.impressions += parseInt(item.impressions || 0);
          current.spend += parseFloat(item.spend || 0);
          current.clicks += parseInt(item.clicks || 0);
          
          locationMap.set(locationName, current);
        }
      });
    }
    
    // Converter para array e ordenar por leads
    return Array.from(locationMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 localizações
  }

  /**
   * 🌍 BUSCAR DADOS DE CIDADES
   * Método específico para dados de cidades
   */
  static async getCitiesData(dateRange = null) {
    try {
      const geographicData = await this.getFacebookGeographicInsights('city', dateRange);
      const citiesData = this.processGeographicData(geographicData.data, 'city');
      
      return {
        cities: citiesData,
        totalCities: citiesData.length,
        totalLeads: citiesData.reduce((sum, city) => sum + city.value, 0)
      };
    } catch (error) {
      console.error('Erro ao buscar dados de cidades:', error);
      return { cities: [], totalCities: 0, totalLeads: 0 };
    }
  }

  /**
   * 🌍 BUSCAR LOCALIZAÇÕES DISPONÍVEIS
   * Retorna lista de localizações únicas para filtros
   */
  static async getAvailableLocations(breakdown = 'city', dateRange = null) {
    try {
      const geographicData = await this.getFacebookGeographicInsights(breakdown, dateRange);
      const locations = new Set();
      
      if (geographicData.data && Array.isArray(geographicData.data)) {
        geographicData.data.forEach(item => {
          if (item[breakdown]) {
            locations.add(item[breakdown]);
          }
        });
      }
      
      return Array.from(locations).sort().map(name => ({
        name,
        value: name,
        label: name
      }));
    } catch (error) {
      console.error('Erro ao buscar localizações disponíveis:', error);
      return [];
    }
  }

  /**
   * 📱 BUSCAR MÉTRICAS WHATSAPP
   * Implementação conforme guia do backend
   */
  static async getWhatsAppMetrics(datePreset = 'last_7d') {
    try {
      const response = await fetch(`${API_URL}/facebook-ads/whatsapp/insights?date_preset=${datePreset}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📱 WhatsApp metrics recebidos:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar WhatsApp metrics:', error);
      return {
        summary: {
          total_conversations: 0,
          total_profile_visits: 0,
          total_spend: 0
        }
      };
    }
  }

  /**
   * 👥 BUSCAR SEGMENTAÇÃO POR GÊNERO
   * Implementação conforme guia do backend
   */
  static async getGenderSegmentation(datePreset = 'last_30d') {
    try {
      const response = await fetch(`${API_URL}/facebook-ads/leads/segmentation?date_preset=${datePreset}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('👥 Gender segmentation recebido:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar gender segmentation:', error);
      return {
        data: [],
        summary: {
          total_leads: 0
        }
      };
    }
  }


  /**
   * Limpar cache
   * USADO EM: Dashboard.jsx:255 e Dashboard.jsx:240
   */
  static clearCache() {
    this.cache.clear();
  }
}

export default GranularAPI;