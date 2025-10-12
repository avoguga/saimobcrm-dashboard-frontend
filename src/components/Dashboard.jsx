import { useState, useEffect, useCallback, useMemo } from 'react';
// Estado para controlar se o cache do Kommo foi limpo
import { KommoAPI } from '../services/api';
import { GranularAPI } from '../services/granularAPI'; // API REAL granular
import DashboardMarketing from './DashboardMarketing';
import DashboardSales from './DashboardSales';
import LoadingSpinner from './LoadingSpinner';
import './Dashboard.css';

// ✅ FUNÇÕES HELPER PARA PROCESSAR DADOS DO ENDPOINT ÚNICO
const processDetailedTablesData = (tablesData) => {
  if (!tablesData) return null;
  
  const { leadsDetalhes = [], reunioesDetalhes = [], reunioesOrganicasDetalhes = [], vendasDetalhes = [], summary = {} } = tablesData;
  
  // 1. Agrupar leads por corretor
  const leadsByUserMap = {};
  leadsDetalhes.forEach(lead => {
    const corretor = lead.Corretor === 'SA IMOB' ? 'Não atribuído' : lead.Corretor;
    if (!leadsByUserMap[corretor]) {
      leadsByUserMap[corretor] = {
        name: corretor,
        value: 0,
        active: 0,
        meetingsHeld: 0,
        sales: 0,
        revenue: 0,
        leads: []
      };
    }
    leadsByUserMap[corretor].value++;
    leadsByUserMap[corretor].leads.push({
      id: Math.random(), // Fake ID
      leadName: lead['Nome do Lead'],
      fonte: lead.Fonte,
      anuncio: lead.Anúncio,
      publico: lead.Público,
      produto: lead.Produto,
      funil: lead.Funil,
      etapa: lead.Etapa,
      createdDate: lead['Data de Criação'],
      is_proposta: lead['É Proposta'] || false
    });
    if (lead.Status === 'Ativo' || lead.Status === 'Em Negociação') {
      leadsByUserMap[corretor].active++;
    }
  });
  
  // 2. Adicionar reuniões aos corretores
  [...reunioesDetalhes, ...reunioesOrganicasDetalhes].forEach(reuniao => {
    const corretor = reuniao.Corretor === 'SA IMOB' ? 'Não atribuído' : reuniao.Corretor;
    if (!leadsByUserMap[corretor]) {
      leadsByUserMap[corretor] = {
        name: corretor,
        value: 0,
        active: 0,
        meetingsHeld: 0,
        sales: 0,
        revenue: 0,
        leads: []
      };
    }
    leadsByUserMap[corretor].meetingsHeld++;
  });
  
  // 3. Adicionar vendas aos corretores
  vendasDetalhes.forEach(venda => {
    const corretor = venda.Corretor === 'SA IMOB' ? 'Não atribuído' : venda.Corretor;
    if (!leadsByUserMap[corretor]) {
      leadsByUserMap[corretor] = {
        name: corretor,
        value: 0,
        active: 0,
        meetingsHeld: 0,
        sales: 0,
        revenue: 0,
        leads: []
      };
    }
    leadsByUserMap[corretor].sales++;
    
    // Extrair valor da venda (remover R$ e pontuação)
    const valorStr = venda['Valor da Venda'] || '0';
    const valor = parseFloat(valorStr.replace(/[R$.\s]/g, '').replace(',', '.')) || 0;
    leadsByUserMap[corretor].revenue += valor;
  });
  
  // 4. Converter para array
  const leadsByUser = Object.values(leadsByUserMap);
  
  // 5. Calcular pipeline status agrupando por etapa
  const pipelineStatusMap = {};
  leadsDetalhes.forEach(lead => {
    const etapa = lead.Etapa || 'Não Definido';
    if (!pipelineStatusMap[etapa]) {
      pipelineStatusMap[etapa] = {
        stage: etapa,
        count: 0,
        leads: []
      };
    }
    pipelineStatusMap[etapa].count++;
    pipelineStatusMap[etapa].leads.push(lead);
  });
  
  const pipelineStatus = Object.values(pipelineStatusMap);
  
  // 6. Calcular taxas de conversão
  const totalLeads = summary.total_leads || leadsDetalhes.length;
  const totalMeetings = summary.total_reunioes || (reunioesDetalhes.length + reunioesOrganicasDetalhes.length);
  const totalSales = summary.total_vendas || vendasDetalhes.length;
  
  const conversionRates = {
    leadToMeeting: totalLeads > 0 ? (totalMeetings / totalLeads) * 100 : 0,
    meetingToSale: totalMeetings > 0 ? (totalSales / totalMeetings) * 100 : 0,
    overallConversion: totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0
  };
  
  // 7. Dados do funil
  const funnelData = [
    { stage: 'Leads', value: totalLeads },
    { stage: 'Reuniões', value: totalMeetings },
    { stage: 'Vendas', value: totalSales }
  ];
  
  return {
    // Dados principais
    totalLeads,
    totalMeetings,
    totalSales: totalSales,
    totalRevenue: summary.valor_total_vendas || 0,
    winRate: conversionRates.overallConversion,
    
    // Arrays para gráficos
    leadsByUser,
    pipelineStatus,
    conversionRates,
    funnelData,
    
    // ✅ OTIMIZAÇÃO: Salvar dados originais para reutilização nos modals
    _rawTablesData: tablesData,
    
    // Metadados
    _metadata: { 
      processedFromDetailedTables: true,
      originalSummary: summary,
      ...tablesData._metadata
    }
  };
};

// Função helper para carregar dados do período anterior
const loadPreviousPeriodData = async (period, originalDays, customPeriod, corretor, fonte) => {
  let previousDays;
  let previousCustomDates;
  
  if (period === 'current_month') {
    // Para mês atual, buscar mês anterior completo
    const now = new Date();
    const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    previousCustomDates = {
      start_date: firstDayPreviousMonth.toISOString().split('T')[0],
      end_date: lastDayPreviousMonth.toISOString().split('T')[0]
    };
  } else if (period === 'previous_month') {
    // Para mês anterior, buscar mês anteanterior
    const now = new Date();
    const firstDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const lastDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    
    previousCustomDates = {
      start_date: firstDayTwoMonthsAgo.toISOString().split('T')[0],
      end_date: lastDayTwoMonthsAgo.toISOString().split('T')[0]
    };
  } else if (period === 'year') {
    // Para ano atual, buscar ano anterior completo
    const now = new Date();
    const firstDayLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const lastDayLastYear = new Date(now.getFullYear() - 1, 11, 31);
    
    previousCustomDates = {
      start_date: firstDayLastYear.toISOString().split('T')[0],
      end_date: lastDayLastYear.toISOString().split('T')[0]
    };
  } else if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
    // Para período customizado, calcular mesmo número de dias anteriores
    const startDate = new Date(customPeriod.startDate);
    const endDate = new Date(customPeriod.endDate);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(startDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousEndDate.getDate() - duration + 1);
    
    previousCustomDates = {
      start_date: previousStartDate.toISOString().split('T')[0],
      end_date: previousEndDate.toISOString().split('T')[0]
    };
  } else {
    // Para períodos predefinidos (7d, 30d, 60d, 90d), usar o mesmo número de dias
    previousDays = originalDays;
    
    // Calcular as datas do período anterior
    const today = new Date();
    const currentStartDate = new Date(today);
    currentStartDate.setDate(today.getDate() - originalDays + 1);
    
    const previousEndDate = new Date(currentStartDate);
    previousEndDate.setDate(currentStartDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousEndDate.getDate() - originalDays + 1);
    
    previousCustomDates = {
      start_date: previousStartDate.toISOString().split('T')[0],
      end_date: previousEndDate.toISOString().split('T')[0]
    };
  }
  
  // ✅ NOVA IMPLEMENTAÇÃO: Usar apenas endpoint detailed-tables
  const extraParams = {};
  if (previousCustomDates) {
    extraParams.start_date = previousCustomDates.start_date;
    extraParams.end_date = previousCustomDates.end_date;
  } else {
    extraParams.days = previousDays;
  }
  
  const tablesData = await KommoAPI.getDetailedTables(corretor, fonte, extraParams);
  return processDetailedTablesData(tablesData);
};

// Dashboard principal otimizado
function Dashboard() {
  // Função para calcular o período padrão (do dia 1 do mês atual até hoje)
  const getDefaultPeriod = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    return {
      startDate: firstDayOfMonth.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };

  const [activeTab, setActiveTab] = useState('sales');
  const [period, setPeriod] = useState('current_month');
  const [customPeriod, setCustomPeriod] = useState(getDefaultPeriod());
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);
  const [corretores, setCorretores] = useState([]);
  const [allCorretores, setAllCorretores] = useState([]); // Lista fixa de todos os corretores
  // ✅ REFATORAÇÃO: Estados únicos para filtros (sem duplicação)
  const [filters, setFilters] = useState({
    corretor: '',
    source: ''
  });
  const [sourceOptions, setSourceOptions] = useState([{ value: '', label: 'Todas as Fontes' }]);
  
  // ✅ REFATORAÇÃO: Funções helper simplificadas (sem referências prematuras)
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || ''
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      corretor: '',
      source: ''
    });
  }, []);

  const clearFilter = useCallback((key) => {
    updateFilter(key, '');
  }, [updateFilter]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isKommoCacheFlushed, setIsKommoCacheFlushed] = useState(false);
  const [isLoadingMarketing, setIsLoadingMarketing] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isInitialSalesLoad, setIsInitialSalesLoad] = useState(true);
  const [isUpdatingSales, setIsUpdatingSales] = useState(false);
  const [isUpdatingDateFilter, setIsUpdatingDateFilter] = useState(false);
  // Removido isLoadingFilters - filtragem agora é instantânea no frontend
  const [error, setError] = useState(null);
  const [marketingData, setMarketingData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  
  // Estados para atualização dinâmica
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // segundos
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Função para extrair lista de corretores dos dados de vendas
  const extractCorretoresFromSalesData = (salesData) => {
    if (!salesData?.leadsByUser || !Array.isArray(salesData.leadsByUser)) {
      return [];
    }
    
    return salesData.leadsByUser
      .map(user => ({ name: user.name }))
      .filter(corretor => corretor.name && corretor.name !== 'Não atribuído')
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  
  // Hook para detecção de tamanho de tela responsiva
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  // Hook para atualizar o tamanho da janela
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    
    // Limpeza
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carregar lista de corretores, limpar cache e buscar dados detalhados no primeiro carregamento
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        setIsKommoCacheFlushed(false);
        // Limpar cache local
        KommoAPI.clearCache();
        // Limpar cache da API granular
        GranularAPI.clearCache();
        // Limpar cache do backend (Kommo)
        try {
          await KommoAPI.flushKommoCache();
          setIsKommoCacheFlushed(true);
          console.log('✅ Cache do Kommo limpo com sucesso no carregamento inicial');
        } catch (error) {
          setIsKommoCacheFlushed(false);
          console.error('⚠️ Erro ao limpar cache do Kommo no carregamento inicial:', error);
        }
        // Carregar apenas fontes (corretores serão extraídos dos dados de vendas)
        const sourceOptionsResponse = await KommoAPI.getSourceOptions();
        if (sourceOptionsResponse && Array.isArray(sourceOptionsResponse)) {
          setSourceOptions(sourceOptionsResponse);
        }
        // Carregar dados detalhados do dashboard (garante flush antes)
        const days = calculateDays();
        const params = { days };
        let customDates = null;
        if (period === 'current_month') {
          const defaultPeriod = getDefaultPeriod();
          params.start_date = defaultPeriod.startDate;
          params.end_date = defaultPeriod.endDate;
          customDates = {
            start_date: defaultPeriod.startDate,
            end_date: defaultPeriod.endDate
          };
        } else if (period === 'previous_month') {
          const today = new Date();
          const firstDayPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastDayPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
          customDates = {
            start_date: firstDayPreviousMonth.toISOString().split('T')[0],
            end_date: lastDayPreviousMonth.toISOString().split('T')[0]
          };
        } else if (period === 'year') {
          const today = new Date();
          const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
          customDates = {
            start_date: firstDayOfYear.toISOString().split('T')[0],
            end_date: today.toISOString().split('T')[0]
          };
        } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
          params.start_date = customPeriod.startDate;
          params.end_date = customPeriod.endDate;
          customDates = {
            start_date: customPeriod.startDate,
            end_date: customPeriod.endDate
          };
        }
        const extraParams = {};
        if (customDates) {
          extraParams.start_date = customDates.start_date;
          extraParams.end_date = customDates.end_date;
        } else {
          extraParams.days = days;
        }
        const tablesData = await KommoAPI.getDetailedTables(filters.corretor, filters.source, extraParams);
        const salesResult = processDetailedTablesData(tablesData);
        salesResult._lastParams = extraParams;
        setSalesData(salesResult);
        setIsLoading(false);
        setIsInitialSalesLoad(false);
      } catch (error) {
        setIsLoading(false);
        setIsInitialSalesLoad(false);
        setError(error.message);
        console.log(error);
      }
    };
    fetchInitialData();
  }, []);

  // Atualizar lista de corretores quando dados de vendas forem carregados
  useEffect(() => {
    if (salesData) {
      const corretoresFromData = extractCorretoresFromSalesData(salesData);
      if (corretoresFromData.length > 0) {
        setCorretores(corretoresFromData);
        
        // Salvar todos os corretores apenas se não houver filtros ativos (dados originais)
        if (!filters.corretor && !filters.source && allCorretores.length === 0) {
          setAllCorretores(corretoresFromData);
        }
      }
    }
  }, [salesData, filters.corretor, filters.source, allCorretores.length]);

  // Função para calcular dias do período
  const calculateDays = () => {
    if (period === 'current_month') {
      const defaultPeriod = getDefaultPeriod();
      const start = new Date(defaultPeriod.startDate);
      const end = new Date(defaultPeriod.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
    if (period === 'previous_month') {
      // Para mês anterior, retornar 30 dias aproximadamente
      return 30;
    }
    if (period === 'year') {
      // Para ano atual, calcular dias desde o início do ano
      const today = new Date();
      const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
      return Math.ceil((today - firstDayOfYear) / (1000 * 60 * 60 * 24)) + 1;
    }
    if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
      const start = new Date(customPeriod.startDate);
      const end = new Date(customPeriod.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    if (period === '7d') return 7;
    return 30; // Padrão
  };

  // Função para verificar se o período está válido para fazer requisição
  const isPeriodValid = () => {
    if (period === 'current_month' || period === 'previous_month' || period === 'year' || period === '7d') {
      return true; // Períodos predefinidos sempre são válidos
    }
    if (period === 'custom') {
      return Boolean(customPeriod.startDate && customPeriod.endDate);
    }
    return Boolean(period && period !== 'custom');
  };

  // Carregar dados de marketing (só quando period está válido E aba marketing ativa) com debounce
  useEffect(() => {
    if (!isPeriodValid() || activeTab !== 'marketing') {
      return; // Não faz nada se o período não estiver válido OU se não estiver na aba marketing
    }

    // Debounce de 300ms para evitar múltiplas chamadas
    const timeoutId = setTimeout(() => {
      const fetchMarketingData = async () => {
        setIsLoadingMarketing(true);
        setError(null);
        
        try {
          const days = calculateDays();
          const params = { days };
          
          // Se for período customizado ou mês atual, enviar datas específicas
          let customDates = null;
          if (period === 'current_month') {
            const defaultPeriod = getDefaultPeriod();
            params.start_date = defaultPeriod.startDate;
            params.end_date = defaultPeriod.endDate;
            customDates = {
              start_date: defaultPeriod.startDate,
              end_date: defaultPeriod.endDate
            };
          } else if (period === 'previous_month') {
            const today = new Date();
            const firstDayPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            customDates = {
              start_date: firstDayPreviousMonth.toISOString().split('T')[0],
              end_date: lastDayPreviousMonth.toISOString().split('T')[0]
            };
          } else if (period === 'year') {
            const today = new Date();
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            customDates = {
              start_date: firstDayOfYear.toISOString().split('T')[0],
              end_date: today.toISOString().split('T')[0]
            };
          } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            params.start_date = customPeriod.startDate;
            params.end_date = customPeriod.endDate;
            customDates = {
              start_date: customPeriod.startDate,
              end_date: customPeriod.endDate
            };
          }
          
          
          // CARREGAMENTO: Dashboard geral de marketing
          const marketingResult = await GranularAPI.loadMarketingDashboard(days, null, customDates);
          
          // Mock dados do Facebook para desenvolvimento
          const facebookCampaigns = [];
          const campaignInsights = null;
          
          // Integrar insights das campanhas nos dados do marketing
          const enrichedMarketingData = {
            ...marketingResult,
            campaignInsights,
            facebookCampaigns
          };
          
     
          setMarketingData(enrichedMarketingData);
        } catch (error) {
          setError(`Falha ao carregar dados de marketing: ${error.message}`);
        } finally {
          setIsLoadingMarketing(false);
          setIsLoading(false); // Loading geral só para primeira carga
        }
      };
      
      fetchMarketingData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [period, activeTab]); // REMOVIDO: customPeriod.startDate, customPeriod.endDate - filtragem apenas no Aplicar

  // Hook para atualização automática
  useEffect(() => {
    let intervalId = null;
    
    if (autoRefresh && isPeriodValid()) {
      
      intervalId = setInterval(async () => {
        
        try {
          const days = calculateDays();
          
          // Não mostrar loading no auto-refresh para não atrapalhar a UX
          // Preparar datas customizadas se período for custom ou mês atual
          let customDates = null;
          if (period === 'current_month') {
            const defaultPeriod = getDefaultPeriod();
            customDates = {
              start_date: defaultPeriod.startDate,
              end_date: defaultPeriod.endDate
            };
          } else if (period === 'previous_month') {
            const today = new Date();
            const firstDayPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            customDates = {
              start_date: firstDayPreviousMonth.toISOString().split('T')[0],
              end_date: lastDayPreviousMonth.toISOString().split('T')[0]
            };
          } else if (period === 'year') {
            const today = new Date();
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            customDates = {
              start_date: firstDayOfYear.toISOString().split('T')[0],
              end_date: today.toISOString().split('T')[0]
            };
          } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            customDates = {
              start_date: customPeriod.startDate,
              end_date: customPeriod.endDate
            };
          }
          
          if (activeTab === 'marketing') {
            const marketingResult = await GranularAPI.loadMarketingDashboard(days, filters.source, customDates);
            setMarketingData(marketingResult);
          } else {
            // ✅ NOVA IMPLEMENTAÇÃO: Carregar dados com endpoint único
            const extraParams = {};
            if (customDates) {
              extraParams.start_date = customDates.start_date;
              extraParams.end_date = customDates.end_date;
            } else {
              extraParams.days = days;
            }
            const tablesData = await KommoAPI.getDetailedTables(filters.corretor, filters.source, extraParams);
            const salesResult = processDetailedTablesData(tablesData);
            // ✅ OTIMIZAÇÃO: Salvar parâmetros para reutilização nos modals
            salesResult._lastParams = extraParams;
            setSalesData(salesResult);
          }
          
          setLastUpdate(new Date());
        } catch (error) {
        }
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, activeTab, period, customPeriod]);

  // Hook para detectar mudança de aba e setar loading apropriado
  useEffect(() => {
    if (activeTab === 'marketing' && !marketingData && isPeriodValid()) {
      setIsLoadingMarketing(true);
    } else if (activeTab === 'sales' && !salesData && isPeriodValid()) {
      setIsLoadingSales(true);
    }
  }, [activeTab, marketingData, salesData]);

  // Carregar dados de vendas (quando período ou aba mudam, e cache já foi limpo)
  useEffect(() => {
    if (!isPeriodValid() || activeTab !== 'sales' || !isKommoCacheFlushed) {
      return;
    }
    // Debounce de 300ms para evitar múltiplas chamadas
    const timeoutId = setTimeout(() => {
      const fetchSalesData = async () => {
        if (isInitialSalesLoad) {
          setIsLoadingSales(true);
        } else {
          setIsUpdatingSales(true);
        }
        setError(null);
        try {
          const days = calculateDays();
          const params = { days };
          let customDates = null;
          if (period === 'current_month') {
            const defaultPeriod = getDefaultPeriod();
            params.start_date = defaultPeriod.startDate;
            params.end_date = defaultPeriod.endDate;
            customDates = {
              start_date: defaultPeriod.startDate,
              end_date: defaultPeriod.endDate
            };
          } else if (period === 'previous_month') {
            const today = new Date();
            const firstDayPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            customDates = {
              start_date: firstDayPreviousMonth.toISOString().split('T')[0],
              end_date: lastDayPreviousMonth.toISOString().split('T')[0]
            };
          } else if (period === 'year') {
            const today = new Date();
            const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
            customDates = {
              start_date: firstDayOfYear.toISOString().split('T')[0],
              end_date: today.toISOString().split('T')[0]
            };
          } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            params.start_date = customPeriod.startDate;
            params.end_date = customPeriod.endDate;
            customDates = {
              start_date: customPeriod.startDate,
              end_date: customPeriod.endDate
            };
          }
          const extraParams = {};
          if (customDates) {
            extraParams.start_date = customDates.start_date;
            extraParams.end_date = customDates.end_date;
          } else {
            extraParams.days = days;
          }
          const tablesData = await KommoAPI.getDetailedTables(filters.corretor, filters.source, extraParams);
          const salesResult = processDetailedTablesData(tablesData);
          salesResult._lastParams = extraParams;
          try {
            const previousPeriodData = await loadPreviousPeriodData(period, days, customPeriod, filters.corretor, filters.source);
            if (previousPeriodData) {
              salesResult.previousPeriodData = previousPeriodData;
            }
          } catch (error) {
            console.warn('Erro ao buscar dados do período anterior:', error);
          }
          setSalesData(salesResult);
        } catch (error) {
          setError(`Falha ao carregar dados de vendas: ${error.message}`);
        } finally {
          setIsLoadingSales(false);
          setIsUpdatingSales(false);
          setIsLoading(false);
          setIsInitialSalesLoad(false);
        }
      };
      fetchSalesData();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [period, activeTab, isKommoCacheFlushed]);
  
  // Reset da flag de primeira carga quando o período muda (só na aba sales)
  useEffect(() => {
    if (activeTab === 'sales') {
      setIsInitialSalesLoad(true);
    }
  }, [period, activeTab]);

  // ✅ REFATORAÇÃO: Removido useEffect desnecessário de sincronização

  // Atualizar dados (só executa se período for válido)
  const refreshData = async (forceRefresh = false) => {
    if (!isPeriodValid()) {
      return;
    }

    // Limpar cache se for refresh forçado
    if (forceRefresh) {
      // Limpar cache local
      KommoAPI.clearCache();
      // Limpar cache do backend (Kommo)
      try {
        await KommoAPI.flushKommoCache();
      } catch (error) {
        console.error('Erro ao limpar cache do Kommo:', error);
        // Continuar mesmo se falhar a limpeza do cache do backend
      }
    }

    if (activeTab === 'marketing') {
      setIsLoadingMarketing(true);
    } else {
      setIsLoadingSales(true);
    }

    try {
      let extraParams = {};
      let customDates = null;
      // Mês atual
      if (period === 'current_month') {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const start_date = firstDay.toISOString().split('T')[0];
        const end_date = today.toISOString().split('T')[0];
        extraParams.start_date = start_date;
        extraParams.end_date = end_date;
        customDates = { start_date, end_date };
      // Mês anterior
      } else if (period === 'previous_month') {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        const start_date = firstDay.toISOString().split('T')[0];
        const end_date = lastDay.toISOString().split('T')[0];
        extraParams.start_date = start_date;
        extraParams.end_date = end_date;
        customDates = { start_date, end_date };
      // Período customizado
      } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
        extraParams.start_date = customPeriod.startDate;
        extraParams.end_date = customPeriod.endDate;
        customDates = { start_date: customPeriod.startDate, end_date: customPeriod.endDate };
      // Outros períodos (ex: 7d, year)
      } else {
        const days = calculateDays();
        extraParams.days = days;
      }

      if (activeTab === 'marketing') {
        GranularAPI.clearCache();
        const days = calculateDays();
        const marketingResponse = await GranularAPI.loadMarketingDashboard(days, filters.source, customDates);
        setMarketingData(marketingResponse);
      } else {
        GranularAPI.clearCache();
        // Requisição para o período atual
        const tablesData = await KommoAPI.getDetailedTables(filters.corretor, filters.source, extraParams);
        const salesResponse = processDetailedTablesData(tablesData);
        salesResponse._lastParams = extraParams;

        // Requisição para o período anterior (para comparação)
        let previousPeriodParams = {};
        if (period === 'current_month') {
          const today = new Date();
          const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastDayPrev = new Date(today.getFullYear(), today.getMonth(), 0);
          previousPeriodParams.start_date = firstDayPrev.toISOString().split('T')[0];
          previousPeriodParams.end_date = lastDayPrev.toISOString().split('T')[0];
        } else if (period === 'previous_month') {
          const today = new Date();
          const firstDayPrev = new Date(today.getFullYear(), today.getMonth() - 2, 1);
          const lastDayPrev = new Date(today.getFullYear(), today.getMonth() - 1, 0);
          previousPeriodParams.start_date = firstDayPrev.toISOString().split('T')[0];
          previousPeriodParams.end_date = lastDayPrev.toISOString().split('T')[0];
        } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
          // Período anterior ao customizado
          const start = new Date(customPeriod.startDate);
          const end = new Date(customPeriod.endDate);
          const diff = end.getTime() - start.getTime();
          const prevEnd = new Date(start.getTime() - 1);
          const prevStart = new Date(prevEnd.getTime() - diff);
          previousPeriodParams.start_date = prevStart.toISOString().split('T')[0];
          previousPeriodParams.end_date = prevEnd.toISOString().split('T')[0];
        } else {
          // Para outros períodos, pode-se usar days igual
          previousPeriodParams.days = calculateDays();
        }
        // Manter filtros
        const previousTablesData = await KommoAPI.getDetailedTables(filters.corretor, filters.source, previousPeriodParams);
        salesResponse.previousPeriodData = processDetailedTablesData(previousTablesData);

        setSalesData(salesResponse);
      }
    } catch (error) {
      setError(`Não foi possível atualizar os dados: ${error.message}`);
    } finally {
      if (activeTab === 'marketing') {
        setIsLoadingMarketing(false);
      } else {
        setIsLoadingSales(false);
      }
    }
  };

  // Função para lidar com mudança de período
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setShowCustomPeriod(false);
      setCustomPeriod({ startDate: '', endDate: '' });
    } else {
      setShowCustomPeriod(true);
    }
  };

  // Função para refresh de marketing com filtros de campanha
  const refreshMarketingWithCampaignFilters = async (campaignFilters = {}) => {
    try {
      setIsLoadingMarketing(true);
        
      const days = calculateDays();
      const customDates = (period === 'custom' && customPeriod.startDate && customPeriod.endDate) ? {
        start_date: customPeriod.startDate,
        end_date: customPeriod.endDate
      } : null;
      
      
      const marketingResponse = await GranularAPI.loadMarketingDashboard(
        days, 
        filters.source, 
        customDates, 
        campaignFilters
      );
      setMarketingData(marketingResponse);
      
    } catch (error) {
      setError(`Erro ao aplicar filtros de campanha: ${error.message}`);
    } finally {
      setIsLoadingMarketing(false);
    }
  };

  // Função para aplicar período customizado
  const applyCustomPeriod = async (periodData = null) => {
    // Usar dados passados ou dados do estado
    const dataToUse = periodData || customPeriod;
    
    
    if (dataToUse.startDate && dataToUse.endDate) {
      // Se dados vieram do modal, atualizar estado
      if (periodData) {
        setCustomPeriod(periodData);
      }
      
      // Validar se data final é maior que inicial
      const startDate = new Date(dataToUse.startDate + 'T12:00:00');
      const endDate = new Date(dataToUse.endDate + 'T12:00:00');
      
      if (endDate <= startDate) {
        alert('Data final deve ser posterior à data inicial');
        return;
      }
      
      // Fechar o modal
      setShowCustomPeriod(false);
      
      // Carregar dados com loading usando os dados corretos
      await loadCustomPeriodDataWithPeriod(dataToUse);
    } else {
      alert('Por favor, selecione ambas as datas');
    }
  };

  // Função para carregar dados usando período específico (com loading)
  const loadCustomPeriodDataWithPeriod = async (periodData) => {
    
    setIsUpdatingDateFilter(true);
    setIsLoadingMarketing(true);
    setIsLoadingSales(true);
    setError(null);
    
    try {
      // Calcular dias baseado no período específico
      const startDate = new Date(periodData.startDate);
      const endDate = new Date(periodData.endDate);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      // Preparar datas customizadas
      const customDates = {
        start_date: periodData.startDate,
        end_date: periodData.endDate
      };
      
      
      // ✅ NOVA IMPLEMENTAÇÃO: Carregar dados em paralelo com endpoint único para sales
      const extraParams = {};
      if (customDates) {
        extraParams.start_date = customDates.start_date;
        extraParams.end_date = customDates.end_date;
      } else {
        extraParams.days = days;
      }
      
      const [marketingResult, tablesData] = await Promise.all([
        GranularAPI.loadMarketingDashboard(days, filters.source, customDates),
        KommoAPI.getDetailedTables(filters.corretor, filters.source, extraParams)
      ]);
      
      const salesResult = processDetailedTablesData(tablesData);
      // ✅ OTIMIZAÇÃO: Salvar parâmetros para reutilização nos modals
      salesResult._lastParams = extraParams;
      
      // Buscar dados do período anterior para comparação
      try {
        const previousPeriodData = await loadPreviousPeriodData('custom', days, periodData, filters.corretor, filters.source);
        if (previousPeriodData) {
          salesResult.previousPeriodData = previousPeriodData;
        }
      } catch (error) {
        console.warn('Erro ao buscar dados do período anterior:', error);
      }
      
      setMarketingData(marketingResult);
      setSalesData(salesResult);
      
    } catch (error) {
      setError(`Falha ao carregar dados: ${error.message}`);
    } finally {
      setIsUpdatingDateFilter(false);
      setIsLoadingMarketing(false);
      setIsLoadingSales(false);
    }
  };

  // ✅ REFATORAÇÃO: Função de filtro simplificada e otimizada (memoizada)
  const applyFilters = useCallback(async () => {
    
    if (!isPeriodValid()) {
      return;
    }

    setIsUpdatingSales(true);
    setError(null);
    
    try {
      const currentData = salesData?._rawTablesData;
      
      // Se não há dados carregados, fazer requisição inicial
      if (!currentData) {
        await loadInitialData();
        return;
      }
      
      
      // Se não há filtros ativos, mostrar todos os dados
      if (!filters.corretor && !filters.source) {
        const salesResult = processDetailedTablesData(currentData);
        salesResult._rawTablesData = currentData;
        salesResult._lastParams = salesData._lastParams;
        
        if (salesData?.previousPeriodData) {
          salesResult.previousPeriodData = salesData.previousPeriodData;
        }
        
        setSalesData(salesResult);
        return;
      }
      
      // Aplicar filtros nos dados
      const filteredData = applyDataFilters(currentData, filters);
      const salesResult = processDetailedTablesData(filteredData);
      
      // Preservar metadados
      salesResult._rawTablesData = currentData;
      salesResult._lastParams = salesData._lastParams;
      
      if (salesData?.previousPeriodData) {
        salesResult.previousPeriodData = salesData.previousPeriodData;
      }
      
      
      setSalesData(salesResult);
    } catch (error) {
      setError(`Falha ao aplicar filtros: ${error.message}`);
    } finally {
      setIsUpdatingSales(false);
    }
  }, [filters, period, customPeriod]);

  // ✅ REFATORAÇÃO: Função helper para filtrar dados (com suporte a múltiplas seleções)
  const applyDataFilters = useCallback((data, filters) => {
    const { corretor, source } = filters;

    const filterByCorretor = (item) => {
      if (!corretor || corretor === '') return true;
      
      // Suporte a múltiplas seleções separadas por vírgula
      const selectedCorretores = corretor.split(',').map(c => c.trim()).filter(c => c);
      if (selectedCorretores.length === 0) return true;
      
      const itemCorretor = item.Corretor;
      return selectedCorretores.some(selectedCorretor =>
        itemCorretor === selectedCorretor ||
        (selectedCorretor === 'SA IMOB' && itemCorretor === 'Não atribuído')
      );
    };

    const filterBySource = (item) => {
      if (!source || source === '') return true;
      
      // Suporte a múltiplas seleções separadas por vírgula
      const selectedSources = source.split(',').map(s => s.trim()).filter(s => s);
      if (selectedSources.length === 0) return true;
      
      // Tentar diferentes campos possíveis para fonte (mesma lógica do hook)
      const itemFonte = item.fonte || item.Fonte || item.source || item.utm_source || '';
      
      return selectedSources.includes(itemFonte);
    };

    const filterItem = (item) => filterByCorretor(item) && filterBySource(item);

    return {
      ...data,
      leadsDetalhes: (data.leadsDetalhes || []).filter(filterItem),
      organicosDetalhes: (data.organicosDetalhes || []).filter(filterItem),
      reunioesDetalhes: (data.reunioesDetalhes || []).filter(filterItem),
      reunioesOrganicasDetalhes: (data.reunioesOrganicasDetalhes || []).filter(filterItem),
      vendasDetalhes: (data.vendasDetalhes || []).filter(filterItem),
      propostasDetalhes: data.propostasDetalhes || [],
      summary: data.summary || {}
    };
  }, []);

  // ✅ REFATORAÇÃO: Função helper para carregamento inicial
  const loadInitialData = useCallback(async () => {
    const days = calculateDays();
    let customDates = null;
    
    if (period === 'current_month') {
      const defaultPeriod = getDefaultPeriod();
      customDates = {
        start_date: defaultPeriod.startDate,
        end_date: defaultPeriod.endDate
      };
    } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
      customDates = {
        start_date: customPeriod.startDate,
        end_date: customPeriod.endDate
      };
    }

    const extraParams = {};
    if (customDates) {
      extraParams.start_date = customDates.start_date;
      extraParams.end_date = customDates.end_date;
    } else {
      extraParams.days = days;
    }

    const tablesData = await KommoAPI.getDetailedTables(filters.corretor, filters.source, extraParams);
    const salesResult = processDetailedTablesData(tablesData);
    salesResult._lastParams = extraParams;
    setSalesData(salesResult);
  }, [calculateDays, period, customPeriod, filters.corretor, filters.source, processDetailedTablesData]);

  // ✅ REFATORAÇÃO: Hook para aplicar filtros quando mudarem (com debounce)
  useEffect(() => {
    if (salesData && !isInitialSalesLoad && !isLoadingSales && activeTab === 'sales') {
      const timeoutId = setTimeout(() => {
        applyFilters();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters.corretor, filters.source]);

  // ✅ REFATORAÇÃO: Função helper memoizada para verificar se há filtros ativos
  const hasActiveFilters = useMemo(() => {
    return Boolean(filters.corretor || filters.source);
  }, [filters.corretor, filters.source]);

  return (
    <div className="dashboard-optimized">
      <div className="dashboard-header">
        <div className="brand" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/icon.png" alt="SA IMOB" style={{ width: '32px', height: '32px', marginRight: '12px' }} />
            <h1>SA IMOB</h1>
            <span className="subtitle">Dashboard</span>
          {false && (
            <div className="filter-loading-indicator">
              <span className="loading-icon">⏳</span>
              <span className="loading-text">Aplicando filtros...</span>
            </div>
          )}
        </div>
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === 'marketing' ? 'active' : ''}`} 
            onClick={() => setActiveTab('marketing')}
          >
            Marketing
          </button>
          <button 
            className={`tab-button ${activeTab === 'sales' ? 'active' : ''}`} 
            onClick={() => setActiveTab('sales')}
          >
            Vendas
          </button>
        </div>
        <div className="dashboard-actions">
          <div className="auto-refresh-controls">
            <button 
              className={`toggle-button ${autoRefresh ? 'active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Desativar atualização automática' : 'Ativar atualização automática'}
            >
              <span className="icon">{autoRefresh ? '⏸️' : '▶️'}</span>
              {autoRefresh ? 'Auto ON' : 'Auto OFF'}
            </button>
            
            {autoRefresh && (
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="interval-select"
                title="Intervalo de atualização"
              >
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>1min</option>
                <option value={300}>5min</option>
              </select>
            )}
          </div>
          
          <button 
            className="action-button" 
            onClick={() => refreshData(true)} 
            disabled={isLoadingMarketing || isLoadingSales}
            title="Atualizar dados (limpar cache)"
          >
            <span className="icon">{(isLoadingMarketing || isLoadingSales) ? '⏳' : '🔄'}</span> 
            {(isLoadingMarketing || isLoadingSales) ? 'Atualizando...' : 'Refresh Cache'}
          </button>
          
          <div className="data-timestamp">
            Dados atualizados em: {(lastUpdate || new Date()).toLocaleString('pt-BR')}
            {autoRefresh && (
              <span className="auto-refresh-indicator">
                • Auto-refresh: {refreshInterval}s
              </span>
            )}
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <LoadingSpinner message={`Carregando dashboard de ${activeTab === 'marketing' ? 'marketing' : 'vendas'}...`} />
      ) : error ? (
        <div className="dashboard-content">
          <div className="error-message">{error}</div>
        </div>
      ) : activeTab === 'marketing' ? (
        <DashboardMarketing 
          period={period} 
          setPeriod={setPeriod} 
          windowSize={windowSize}
          selectedSource={filters.source}
          setSelectedSource={(value) => updateFilter('source', value)}
          sourceOptions={sourceOptions}
          data={marketingData}
          salesData={salesData}
          isLoading={isLoadingMarketing || isUpdatingDateFilter}
          isUpdating={false}
          customPeriod={customPeriod}
          setCustomPeriod={setCustomPeriod}
          showCustomPeriod={showCustomPeriod}
          setShowCustomPeriod={setShowCustomPeriod}
          handlePeriodChange={handlePeriodChange}
          applyCustomPeriod={applyCustomPeriod}
          onDataRefresh={refreshMarketingWithCampaignFilters}
        />
      ) : (
        <DashboardSales 
          period={period} 
          setPeriod={setPeriod} 
          windowSize={windowSize}
          corretores={allCorretores.length > 0 ? allCorretores : corretores}
          // ✅ REFATORAÇÃO: Props simplificadas para filtros
          filters={filters}
          updateFilter={updateFilter}
          clearFilter={clearFilter}
          clearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          sourceOptions={sourceOptions}
          data={salesData}
          isLoading={isLoadingSales || isUpdatingDateFilter}
          isUpdating={isUpdatingSales}
          customPeriod={customPeriod}
          setCustomPeriod={setCustomPeriod}
          showCustomPeriod={showCustomPeriod}
          setShowCustomPeriod={setShowCustomPeriod}
          handlePeriodChange={handlePeriodChange}
          applyCustomPeriod={applyCustomPeriod}
        />
      )}
    </div>
  );
}

export default Dashboard;