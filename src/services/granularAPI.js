/**
 * 🚀 API GRANULAR SIMPLIFICADA E HONESTA
 *
 * VENDAS: Usa endpoints V2 reais do backend
 * MARKETING: Usa endpoints reais do backend
 *
 * APENAS métodos REALMENTE usados pelo Dashboard.jsx
 */

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = import.meta.env.VITE_API_URL || 'https://backendsaimob.gustavohenrique.dev';
export class GranularAPI {
  /**
   * 🚀 FACEBOOK UNIFIED DATA
   * Novo endpoint unificado que retorna dados completos
   */
  static async getFacebookUnifiedData(start_date, end_date, options = {}) {
    const cacheKey = `facebook-unified-${start_date}-${end_date}-${JSON.stringify(options)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        start_date,
        end_date
      });

      const response = await fetch(`${API_URL}/facebook/unified-data?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro desconhecido na API');
      }

      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('❌ Erro ao carregar Facebook Unified Data:', error);
      throw error;
    }
  }

  /**
   * 🚀 FACEBOOK CAMPAIGNS LIST
   * Lista todas as campanhas disponíveis para filtros
   * Usa dados do unified-data em vez de endpoint separado
   */
  static async getFacebookCampaigns(start_date, end_date) {
    try {
      const unifiedData = await this.getFacebookUnifiedData(start_date, end_date);
      return unifiedData?.campaigns || [];
    } catch (error) {
      console.error('❌ Erro ao carregar campanhas do Facebook:', error);
      return [];
    }
  }

  /**
   * 🚀 FACEBOOK ADSETS LIST
   * Lista todos os conjuntos de anúncios de uma campanha
   * Usa dados do unified-data em vez de endpoint separado
   */
  static async getFacebookAdsets(campaign_id, start_date, end_date) {
    try {
      const unifiedData = await this.getFacebookUnifiedData(start_date, end_date);
      const campaign = unifiedData?.campaigns?.find(c => c.id === campaign_id);
      return campaign?.adsets || [];
    } catch (error) {
      console.error('❌ Erro ao carregar conjuntos de anúncios do Facebook:', error);
      return [];
    }
  }

  /**
   * 🚀 FACEBOOK ADS LIST
   * Lista todos os anúncios de um conjunto de anúncios
   * Usa dados do unified-data em vez de endpoint separado
   */
  static async getFacebookAds(adset_id, start_date, end_date) {
    try {
      const unifiedData = await this.getFacebookUnifiedData(start_date, end_date);
      const adset = unifiedData?.campaigns
        ?.flatMap(c => c.adsets || [])
        ?.find(a => a.id === adset_id);
      return adset?.ads || [];
    } catch (error) {
      console.error('❌ Erro ao carregar anúncios do Facebook:', error);
      return [];
    }
  }

  /**
   * 🚀 CARREGAMENTO PARALELO DE VENDAS
   * USADO EM: Dashboard.jsx:186 e Dashboard.jsx:242
   */
  static async loadSalesDashboard(days = 30, corretor = null, fonte = null, customDates = null) {
    console.time('Sales Dashboard V2 Load');
    
    try {
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
        analyticsTeam: leadsByUser.analyticsTeam || null, // Incluir analyticsTeam do endpoint leads-by-user
        conversionRates: conversionRates.conversionRates || {},
        funnelData: conversionRates.funnelData || [],
        pipelineStatus: pipelineStatus.pipelineStatus || [], // V2: Corrigido de leadsByStage
        _metadata: { realAPI: true, granular: true, v2Endpoints: true }
      };
    } catch (error) {
      console.error('❌ Erro no carregamento do dashboard de vendas:', error);
      throw error;
    }
  }

  /**
   * 🚀 CARREGAMENTO PARALELO DE MARKETING
   * USADO EM: Dashboard.jsx:143 e Dashboard.jsx:235
   * Agora usando o novo endpoint /facebook/unified-data
   */
  static async loadMarketingDashboard(days = 30, fonte = null, customDates = null, campaignFilters = {}) {
    console.time('Marketing Dashboard Load');

    try {
      // Calcular datas para o Facebook
      let start_date, end_date;
      if (customDates && customDates.start_date && customDates.end_date) {
        start_date = customDates.start_date;
        end_date = customDates.end_date;
      } else {
        const today = new Date();
        end_date = today.toISOString().split('T')[0];
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - days);
        start_date = startDate.toISOString().split('T')[0];
      }

      // Chamada para o novo endpoint unificado (sem filtro de campaign_id)
      const facebookData = await this.getFacebookUnifiedData(start_date, end_date);

      if (!facebookData || !facebookData.success) {
        throw new Error('Facebook API não retornou dados válidos');
      }

      // Usar dados reais do Facebook Unified Data
      const { campaigns, totals, period } = facebookData;

      // Processar estrutura de campanhas para os filtros do frontend
      const facebookStructure = {
        campaigns: campaigns || [],
        adsets: campaigns?.flatMap(c => c.adsets || []) || [],
        ads: campaigns?.flatMap(c => c.adsets?.flatMap(a => a.ads || []) || []) || []
      };

      const marketingData = {
        // Dados principais para gráficos usando totals
        leadsBySource: [
          { name: 'Facebook', value: totals?.leads || 0, percentage: 100 }
        ],
        totalLeads: totals?.leads || 0,
        conversionRate: totals?.cost_per_lead || 0,

        // Dados completos do Facebook com métricas formatadas
        facebookMetrics: {
          leads: {
            formatted: totals?.leads?.toString() || "0",
            value: totals?.leads || 0
          },
          profile_visits: {
            formatted: totals?.profile_visits?.toString() || "0",
            value: totals?.profile_visits || 0
          },
          whatsapp: {
            formatted: totals?.whatsapp_conversations?.toString() || "0",
            value: totals?.whatsapp_conversations || 0
          },
          reach: {
            formatted: totals?.reach?.toLocaleString() || "0",
            value: totals?.reach || 0
          },
          impressions: {
            formatted: totals?.impressions?.toLocaleString() || "0",
            value: totals?.impressions || 0
          },
          cost_per_lead: {
            formatted: `R$ ${(totals?.cost_per_lead || 0).toFixed(2)}`,
            value: totals?.cost_per_lead || 0
          },
          cost_per_click: {
            formatted: `R$ ${(totals?.cpc || 0).toFixed(2)}`,
            value: totals?.cpc || 0
          },
          cpm: {
            formatted: `R$ ${(totals?.cpm || 0).toFixed(2)}`,
            value: totals?.cpm || 0
          },
          clicks: {
            formatted: totals?.clicks?.toLocaleString() || "0",
            value: totals?.clicks || 0
          },
          link_clicks: {
            formatted: totals?.link_clicks?.toLocaleString() || "0",
            value: totals?.link_clicks || 0
          },
          total_spent: {
            formatted: `R$ ${(totals?.spend || 0).toFixed(2)}`,
            value: totals?.spend || 0
          },
          page_engagement: {
            formatted: totals?.page_engagement?.toString() || "0",
            value: totals?.page_engagement || 0
          },
          reactions: {
            formatted: totals?.reactions?.toString() || "0",
            value: totals?.reactions || 0
          },
          comments: {
            formatted: totals?.comments?.toString() || "0",
            value: totals?.comments || 0
          }
        },
        facebookStructure: facebookStructure,
        facebookRawMetrics: totals || {},

        // Compatibilidade com componente existente
        facebookCampaigns: campaigns?.map(campaign => ({
          id: campaign.id,
          name: campaign.name,
          spend: campaign.metrics?.spend || 0,
          impressions: campaign.metrics?.impressions || 0,
          clicks: campaign.metrics?.clicks || 0,
          leads: campaign.metrics?.leads || 0
        })) || [],

        // Métricas específicas
        whatsappConversations: totals?.whatsapp_conversations || 0,
        profileVisits: totals?.profile_visits || 0,
        whatsappSpend: totals?.spend || 0
      };

      console.timeEnd('Marketing Dashboard Load');

      return {
        ...marketingData,
        genderData: [], // Dados demográficos virão da API no futuro
        _metadata: {
          realFacebookData: !!facebookData?.success,
          granular: true,
          unifiedData: true,
          period: period || { start_date, end_date }
        }
      };

    } catch (error) {
      console.error('❌ Erro ao carregar marketing dashboard:', error);
      return {
        leadsBySource: [],
        totalLeads: 0,
        conversionRate: 0,
        genderData: [],
        facebookCampaigns: [],
        whatsappConversations: 0,
        profileVisits: 0,
        whatsappSpend: 0,
        facebookMetrics: {},
        facebookStructure: { campaigns: [], adsets: [], ads: [] },
        facebookRawMetrics: {},
        _metadata: {
          realFacebookData: false,
          granular: true,
          unifiedData: true,
          error: true
        }
      };
    }
  }

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
   * Limpar cache
   * USADO EM: Dashboard.jsx:255 e Dashboard.jsx:240
   */
  static clearCache() {
    this.cache.clear();
  }
}

export default GranularAPI;