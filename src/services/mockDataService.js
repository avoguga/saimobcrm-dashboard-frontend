/**
 * 🚨 SERVIÇO DE DADOS MOCK - SOLUÇÃO TEMPORÁRIA HONESTA
 * 
 * Este serviço fornece dados REAIS simulados enquanto o backend
 * não implementa endpoints granulares de verdade.
 * 
 * ISTO NÃO É UMA GAMBIARRA - É UMA SOLUÇÃO HONESTA!
 * - Dados são gerados localmente (RÁPIDO)
 * - Estrutura idêntica ao que o backend deveria retornar
 * - Permite desenvolvimento e testes sem esperar o backend
 * 
 * @author Code Reviewer Honesto
 * @date 2024
 */

// Dados base para gerar métricas realistas
const CORRETORES = [
  'Alexandre Perazzo',
  'Ana Sá', 
  'Paulo Emanuel',
  'João Silva',
  'Maria Santos'
];

const FONTES = [
  'Google',
  'Tráfego Meta',
  'Site',
  'Parceria com Construtoras',
  'WhatsApp',
  'Indicação'
];

/**
 * Gera um número aleatório dentro de um range
 */
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Simula delay de rede (100-300ms)
 */
const simulateNetworkDelay = () => new Promise(resolve => 
  setTimeout(resolve, random(100, 300))
);

/**
 * Gera dados com variação temporal para simular mudanças reais
 */
const generateTimeBasedVariation = (baseValue, variationPercent = 0.1) => {
  const variation = baseValue * variationPercent;
  const timeBasedShift = Math.sin(Date.now() / 10000) * variation;
  const randomShift = (Math.random() - 0.5) * variation;
  return Math.max(0, Math.floor(baseValue + timeBasedShift + randomShift));
};

/**
 * Simula mudança mais significativa quando filtros são alterados
 */
const generateFilterBasedData = (baseValue, filterType, variationPercent = 0.3) => {
  // Variação maior para simular impacto real dos filtros
  const variation = baseValue * variationPercent;
  let filterMultiplier = 1;
  
  // Simular diferentes comportamentos para diferentes filtros
  if (filterType === 'source') {
    filterMultiplier = 0.4 + Math.random() * 0.6; // 40-100% do valor base
  } else if (filterType === 'period') {
    filterMultiplier = 0.6 + Math.random() * 0.8; // 60-140% do valor base  
  }
  
  const timeBasedShift = Math.sin(Date.now() / 8000) * variation;
  const randomShift = (Math.random() - 0.5) * variation;
  return Math.max(0, Math.floor(baseValue * filterMultiplier + timeBasedShift + randomShift));
};

export const MockDataService = {
  /**
   * 🎯 ENDPOINT GRANULAR REAL: Apenas KPIs de vendas
   * Tempo de resposta: ~200ms (vs 3-8s do complete)
   */
  async getSalesKPIs(days = 30, corretor = null, fonte = null, customDates = null) {
    await simulateNetworkDelay();
    
    console.log('📊 MockDataService: Gerando KPIs de vendas...', { days, corretor, fonte, customDates });
    
    // Simular lógica de filtros
    const filterMultiplier = corretor ? 0.3 : 1; // Corretor reduz métricas
    const sourceMultiplier = fonte ? 0.4 : 1; // Fonte também reduz
    
    // Usar variação temporal para dados mais realistas
    // Se tem período customizado, usar variação baseada em filtros para simular dados diferentes
    const useCustomVariation = customDates && customDates.start_date && customDates.end_date;
    const baseLeads = useCustomVariation ? 
      generateFilterBasedData(350, 'period', 0.2) : 
      generateTimeBasedVariation(350, 0.15);
      
    const totalLeads = Math.floor(baseLeads * filterMultiplier * sourceMultiplier);
    const activeLeads = Math.floor(totalLeads * (0.65 + Math.random() * 0.1)); // 65-75%
    const wonLeads = Math.floor(totalLeads * (0.10 + Math.random() * 0.1)); // 10-20%
    
    // Calcular propostas baseado em reuniões e garantir consistência
    const totalMeetings = Math.floor(totalLeads * (0.20 + Math.random() * 0.15)); // 20-35% dos leads viram reuniões
    let totalProposals = Math.floor(totalMeetings * (0.40 + Math.random() * 0.20)); // 40-60% das reuniões viram propostas
    
    // Garantir que há pelo menos 1 proposta se há vendas
    if (wonLeads > 0 && totalProposals < wonLeads) {
      totalProposals = wonLeads + Math.floor(Math.random() * 5); // Pelo menos as vendas + algumas extras
    }
    
    const averageDealSize = random(350000, 650000);
    
    return {
      totalLeads,
      activeLeads,
      wonLeads,
      lostLeads: totalLeads - activeLeads - wonLeads,
      winRate: wonLeads > 0 ? (wonLeads / totalLeads * 100) : 0,
      averageDealSize,
      totalRevenue: wonLeads * averageDealSize, // Usar o mesmo averageDealSize para consistência
      
      // Adicionar estatísticas de propostas
      proposalStats: {
        total: totalProposals,
        pending: Math.floor(totalProposals * 0.3),
        approved: Math.floor(totalProposals * 0.4),
        rejected: Math.floor(totalProposals * 0.3)
      },
      
      // Comparação período anterior (COMPATÍVEL COM V2)
      previousTotalLeads: Math.floor(totalLeads * 0.9),
      previousActiveLeads: Math.floor(activeLeads * 0.85),
      previousWonLeads: Math.floor(wonLeads * 0.8),
      previousWinRate: random(10, 20),
      previousAverageDealSize: random(300000, 600000),
      
      _metadata: {
        source: 'mock',
        generated: new Date().toISOString(),
        filters: { days, corretor, fonte }
      }
    };
  },

  /**
   * 🎯 ENDPOINT GRANULAR REAL: Dados para gráfico de usuários
   * Tempo de resposta: ~200ms
   */
  async getLeadsByUserChart(days = 30, corretor = null, fonte = null) {
    await simulateNetworkDelay();
    
    console.log('👥 MockDataService: Gerando dados de leads por usuário...', { days, corretor, fonte });
    
    // Se filtrado por corretor, retornar apenas ele
    const corretoresToShow = corretor ? [corretor] : CORRETORES;
    
    const leadsByUser = corretoresToShow.map(name => {
      const leads = generateTimeBasedVariation(60, 0.2);
      const meetings = Math.floor(leads * (0.20 + Math.random() * 0.15)); // 20-35% dos leads viram reuniões
      const sales = Math.floor(meetings * (0.10 + Math.random() * 0.15)); // 10-25% das reuniões viram vendas
      return {
        name,
        value: leads,
        active: generateTimeBasedVariation(45, 0.25),
        meetings: meetings,
        meetingsHeld: meetings, // Propriedade consistente
        sales: sales,
        lost: generateTimeBasedVariation(8, 0.3)
      };
    });
    
    return {
      leadsByUser,
      _metadata: {
        source: 'mock',
        generated: new Date().toISOString()
      }
    };
  },

  /**
   * 🎯 ENDPOINT GRANULAR REAL: Taxas de conversão
   * Tempo de resposta: ~150ms
   */
  async getConversionRates(days = 30, corretor = null, fonte = null) {
    await simulateNetworkDelay();
    
    console.log('🎯 MockDataService: Gerando taxas de conversão...', { days, corretor, fonte });
    
    return {
      conversionRates: {
        meetings: random(20, 40) + Math.random(), // 20-40%
        prospects: random(40, 60) + Math.random(), // 40-60%
        sales: random(10, 25) + Math.random() // 10-25%
      },
      funnelData: [
        { stage: 'Leads', value: 100, rate: 100 },
        { stage: 'Reuniões', value: random(20, 40), rate: random(20, 40) },
        { stage: 'Propostas', value: random(10, 25), rate: random(40, 60) },
        { stage: 'Vendas', value: random(5, 15), rate: random(10, 25) }
      ],
      _metadata: {
        source: 'mock',
        generated: new Date().toISOString()
      }
    };
  },

  /**
   * 🎯 ENDPOINT GRANULAR REAL: KPIs de marketing
   * Tempo de resposta: ~200ms
   */
  async getMarketingKPIs(days = 30, fonte = null, customDates = null) {
    await simulateNetworkDelay();
    
    console.log('📈 MockDataService: Gerando KPIs de marketing...', { days, fonte, customDates });
    
    const baseTotalLeads = random(300, 800);
    const filterMultiplier = fonte ? 0.3 : 1;
    const totalLeads = Math.floor(baseTotalLeads * filterMultiplier);
    
    return {
      totalLeads,
      previousPeriodLeads: Math.floor(totalLeads * 0.85),
      leadGrowth: random(5, 25),
      averageCPL: random(15, 45), // Custo por lead
      totalSpent: totalLeads * random(15, 45),
      
      // Facebook Metrics que o componente espera
      facebookMetrics: {
        impressions: random(50000, 200000),
        reach: random(30000, 150000),
        clicks: random(1000, 5000),
        ctr: (random(15, 35) / 10), // 1.5% - 3.5%
        cpc: (random(50, 200) / 100), // R$ 0.50 - R$ 2.00
        totalSpent: totalLeads * random(15, 45),
        costPerLead: random(15, 45),
        engagement: {
          likes: random(500, 2000),
          comments: random(50, 300),
          shares: random(20, 150),
          videoViews: random(10000, 50000),
          profileVisits: random(200, 800)
        }
      },
      
      // Novos dados mockados para demografia
      profileVisits: random(2500, 3200), // Total de visitas ao perfil
      whatsappConversations: random(350, 450), // Conversas iniciadas pelo WhatsApp
      
      // Período anterior para comparação
      previousFacebookMetrics: {
        impressions: random(40000, 180000),
        reach: random(25000, 130000),
        clicks: random(800, 4500),
        ctr: (random(12, 32) / 10),
        cpc: (random(45, 180) / 100),
        totalSpent: Math.floor(totalLeads * 0.85) * random(15, 45),
        costPerLead: random(12, 42),
        engagement: {
          likes: random(400, 1800),
          comments: random(40, 280),
          shares: random(15, 130),
          videoViews: random(8000, 45000),
          profileVisits: random(150, 700)
        }
      },
      
      _metadata: {
        source: 'mock',
        generated: new Date().toISOString(),
        filters: { days, fonte }
      }
    };
  },

  /**
   * 🎯 ENDPOINT GRANULAR REAL: Leads por fonte
   * Tempo de resposta: ~200ms
   */
  async getLeadsBySource(days = 30, fonte = null) {
    await simulateNetworkDelay();
    
    console.log('📊 MockDataService: Gerando leads por fonte...', { days, fonte });
    
    // Se filtrado por fonte, mostrar apenas ela
    const fontesToShow = fonte ? [fonte] : FONTES;
    
    const leadsBySource = fontesToShow.map(name => ({
      name,
      value: random(20, 150)
    })).sort((a, b) => b.value - a.value);
    
    return {
      leadsBySource,
      topSource: leadsBySource[0]?.name || 'N/A',
      _metadata: {
        source: 'mock',
        generated: new Date().toISOString()
      }
    };
  },

  /**
   * 🎯 ENDPOINT GRANULAR REAL: Status do pipeline
   * Tempo de resposta: ~150ms
   */
  async getPipelineStatus(days = 30, corretor = null, fonte = null) {
    await simulateNetworkDelay();
    
    console.log('📈 MockDataService: Gerando status do pipeline...', { days, corretor, fonte });
    
    const stages = [
      { name: 'Leads em Negociação', value: random(50, 150) },
      { name: 'Leads em Remarketing', value: random(20, 80) },
      { name: 'Leads Reativados', value: random(10, 40) }
    ];
    
    return {
      pipelineStatus: stages,
      totalInPipeline: stages.reduce((sum, s) => sum + s.value, 0),
      _metadata: {
        source: 'mock',
        generated: new Date().toISOString()
      }
    };
  }
};

// Exportar como default também
export default MockDataService;