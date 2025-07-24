import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import * as echarts from 'echarts';
import LoadingSpinner from './LoadingSpinner';
import SimpleModal from './SimpleModal';
import DetailModal from './common/DetailModal';
import MultiSelectFilter from './common/MultiSelectFilter';
import { COLORS } from '../constants/colors';
import { KommoAPI } from '../services/api';
import GranularAPI from '../services/granularAPI';
import './Dashboard.css';



function DashboardMarketing({ period, setPeriod, windowSize, selectedSource, setSelectedSource, sourceOptions, data, salesData, isLoading, isUpdating, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod, onDataRefresh }) {
  const [marketingData, setMarketingData] = useState(data);
  const [filteredData, setFilteredData] = useState(data);
  
  // Estados para filtros de campanhas Facebook
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  
  // Estados para conjuntos de anúncios (adsets)
  const [adsets, setAdsets] = useState([]);
  const [selectedAdsets, setSelectedAdsets] = useState([]);
  const [loadingAdsets, setLoadingAdsets] = useState(false);
  
  // Estados para anúncios (ads)
  const [ads, setAds] = useState([]);
  const [selectedAds, setSelectedAds] = useState([]);
  const [loadingAds, setLoadingAds] = useState(false);
  
  // Estados dos filtros combinados
  const [campaignFilters, setCampaignFilters] = useState({
    campaignIds: [],
    adsetIds: [],
    adIds: [],
    status: [],
    objective: [],
    searchTerm: ''
  });
  
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showCampaignFilter, setShowCampaignFilter] = useState(false);
  const [campaignInsights, setCampaignInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // Estados para controlar dropdowns
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdsetDropdown, setShowAdsetDropdown] = useState(false);
  const [showAdDropdown, setShowAdDropdown] = useState(false);
  
  const dropdownRef = useRef(null);
  const adsetDropdownRef = useRef(null);
  const adDropdownRef = useRef(null);
  
  // Ref para controlar requisições em andamento
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const initialDataLoadedRef = useRef(false);
  
  // Estados para dados demográficos
  const [demographicData, setDemographicData] = useState({
    genderData: [],
    cityData: []
  });
  const [loadingDemographics, setLoadingDemographics] = useState(false);

  // Estados para dados de vendas específicos do período
  const [periodSalesData, setPeriodSalesData] = useState(null);
  const [loadingPeriodSales, setLoadingPeriodSales] = useState(false);

  // ✅ Estado do modal usando ref (igual ao DashboardSales)
  const modalStateRef = useRef({
    isOpen: false,
    type: '',
    title: '',
    isLoading: false,
    data: [],
    error: null
  });
  
  const [modalForceUpdate, setModalForceUpdate] = useState(0);

  // Estados para dados geográficos
  const [geographicData, setGeographicData] = useState({
    cities: [],
    regions: [],
    countries: [],
    selectedFilters: {
      city: null,
      region: null,
      country: null
    }
  });
  const [loadingGeographics, setLoadingGeographics] = useState(false);

  // Constantes de responsividade
  const isMobile = windowSize.width < 768;
  const isSmallMobile = windowSize.width < 480;

  // Filtros em cascata (opcional)
  const getFilteredAdsets = useMemo(() => {
    // Se não há campanhas selecionadas, mostrar todos os adsets
    if (selectedCampaigns.length === 0) return adsets;
    
    // Filtrar adsets pelas campanhas selecionadas
    return adsets.filter(adset => 
      selectedCampaigns.includes(adset.campaign_id)
    );
  }, [adsets, selectedCampaigns]);

  const getFilteredAds = useMemo(() => {
    // Se não há filtros, mostrar todos os ads
    if (selectedCampaigns.length === 0 && selectedAdsets.length === 0) return ads;
    
    return ads.filter(ad => {
      // Filtrar por adset primeiro (mais específico)
      if (selectedAdsets.length > 0) {
        return selectedAdsets.includes(ad.adset_id);
      }
      
      // Se não há adsets selecionados, filtrar por campanha
      if (selectedCampaigns.length > 0) {
        // Encontrar os adsets das campanhas selecionadas
        const campaignAdsets = adsets
          .filter(adset => selectedCampaigns.includes(adset.campaign_id))
          .map(adset => adset.id);
        
        return campaignAdsets.includes(ad.adset_id);
      }
      
      return true;
    });
  }, [ads, adsets, selectedCampaigns, selectedAdsets]);

  // Effect to track props changes

  // Usar dados que vêm do componente pai (Dashboard.jsx)
  useEffect(() => {
    console.log('🔍 Effect data mudou:', {
      hasData: !!data,
      hasFacebookCampaigns: !!(data && data.facebookCampaigns),
      facebookCampaignsType: typeof data?.facebookCampaigns,
      isArray: Array.isArray(data?.facebookCampaigns),
      campaignsCount: data?.facebookCampaigns?.length || 0,
      currentSelectedCampaigns: selectedCampaigns.length,
      period,
      dataKeys: data ? Object.keys(data) : []
    });
    
    if (data && data.facebookCampaigns && Array.isArray(data.facebookCampaigns)) {
      setCampaigns(data.facebookCampaigns);
      
      // ✅ PROTEÇÃO: Só resetar seleções se não há campanhas selecionadas
      // Isso evita que o período personalizado resete os dropdowns
      if (selectedCampaigns.length === 0) {
        console.log('🔧 Resetando seleções de campanhas (primeira carga)');
        const allCampaignIds = data.facebookCampaigns.map(campaign => campaign.id);
        setSelectedCampaigns(allCampaignIds);
        
        setCampaignFilters({
          campaignIds: allCampaignIds,
          adsetIds: [],
          adIds: [],
          status: [],
          objective: [],
          searchTerm: ''
        });
      } else {
        console.log('🔒 Mantendo seleções existentes para evitar reset');
      }
      
      // Mostrar filtro de campanhas sempre que houver campanhas
      setShowCampaignFilter(true);
    } else {
      console.log('⚠️ facebookCampaigns não é um array válido:', {
        exists: !!data?.facebookCampaigns,
        type: typeof data?.facebookCampaigns,
        value: data?.facebookCampaigns
      });
      // Inicializar com arrays vazios para evitar erros
      setCampaigns([]);
      setShowCampaignFilter(false);
    }
    
    if (data && data.campaignInsights) {
      setCampaignInsights(data.campaignInsights);
      // Marcar que os dados iniciais foram carregados
      initialDataLoadedRef.current = true;
    }

    // Usar dados de gênero reais se disponíveis
    if (data && data.genderData && Array.isArray(data.genderData)) {
      console.log('📊 Usando dados de gênero reais:', data.genderData);
      setDemographicData(prev => ({
        ...prev,
        genderData: data.genderData
      }));
    } else {
      console.log('⚠️ Dados de gênero não disponíveis:', {
        hasData: !!data,
        hasGenderData: !!(data && data.genderData),
        isArray: Array.isArray(data?.genderData),
        genderDataValue: data?.genderData,
        allDataKeys: data ? Object.keys(data) : []
      });
    }
  }, [data]); // Removido selectedCampaigns da dependência para evitar loop
  
  // Carregar dados de adsets e ads ao montar o componente
  useEffect(() => {
    console.log('🔍 Effect carregar adsets/ads:', {
      hasAdsets: adsets.length > 0,
      hasAds: ads.length > 0,
      loadingAdsets,
      loadingAds
    });
    
    // ✅ PROTEÇÃO: Só carregar se ainda não tem dados
    if (adsets.length === 0 && ads.length === 0 && !loadingAdsets && !loadingAds) {
      const loadAdditionalData = async () => {
        try {
          console.log('📦 Carregando adsets e ads pela primeira vez...');
          
          // Carregar conjuntos de anúncios
          setLoadingAdsets(true);
          const adsetsResponse = await GranularAPI.getFacebookAdsets();
          setAdsets(adsetsResponse || []);
          setLoadingAdsets(false);
          
          // Carregar anúncios
          setLoadingAds(true);
          const adsResponse = await GranularAPI.getFacebookAds();
          setAds(adsResponse || []);
          setLoadingAds(false);
          
          console.log('✅ Adsets e ads carregados:', {
            adsetsCount: adsetsResponse?.length || 0,
            adsCount: adsResponse?.length || 0
          });
          
        } catch (error) {
          console.error('❌ Erro ao carregar dados adicionais:', error);
          setLoadingAdsets(false);
          setLoadingAds(false);
        }
      };
      
      loadAdditionalData();
    } else {
      console.log('🔒 Dados já carregados, evitando recarregamento desnecessário');
    }
  }, []);

  // ✅ FUNÇÃO HELPER: Preservar seleções dos dropdowns
  const preserveDropdownSelections = useCallback(() => {
    const currentSelections = {
      campaigns: selectedCampaigns,
      adsets: selectedAdsets,
      ads: selectedAds
    };
    
    console.log('💾 Preservando seleções dos dropdowns:', currentSelections);
    
    // Salvar no sessionStorage para recuperar caso os dados sejam recarregados
    sessionStorage.setItem('marketing_dropdown_selections', JSON.stringify(currentSelections));
    
    return currentSelections;
  }, [selectedCampaigns, selectedAdsets, selectedAds]);

  // ✅ FUNÇÃO HELPER: Restaurar seleções dos dropdowns
  const restoreDropdownSelections = useCallback(() => {
    try {
      const saved = sessionStorage.getItem('marketing_dropdown_selections');
      if (saved) {
        const selections = JSON.parse(saved);
        console.log('🔄 Restaurando seleções dos dropdowns:', selections);
        
        if (selections.campaigns && selections.campaigns.length > 0) {
          setSelectedCampaigns(selections.campaigns);
        }
        if (selections.adsets && selections.adsets.length > 0) {
          setSelectedAdsets(selections.adsets);
        }
        if (selections.ads && selections.ads.length > 0) {
          setSelectedAds(selections.ads);
        }
        
        return selections;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao restaurar seleções:', error);
    }
    return null;
  }, []);

  // ✅ Effect para restaurar seleções após recarregamento de dados
  useEffect(() => {
    // Se temos campanhas mas não temos seleções, tentar restaurar
    if (campaigns.length > 0 && selectedCampaigns.length === 0) {
      console.log('🔄 Detectado recarregamento de campanhas, tentando restaurar seleções...');
      const restored = restoreDropdownSelections();
      
      // Se não conseguiu restaurar, usar todas as campanhas como padrão
      if (!restored || !restored.campaigns || restored.campaigns.length === 0) {
        console.log('📝 Usando todas as campanhas como padrão');
        const allCampaignIds = campaigns.map(campaign => campaign.id);
        setSelectedCampaigns(allCampaignIds);
      }
    }
  }, [campaigns.length, selectedCampaigns.length, restoreDropdownSelections]);

  // Effect para fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup em unmount para cancelar requests e timers
  useEffect(() => {
    return () => {
      // Cancelar requests em andamento
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Cancelar timers de debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ✅ FUNÇÃO HELPER: Carregar dados geográficos
  const loadGeographicData = useCallback(async () => {
    setLoadingGeographics(true);
    
    try {
      console.log('🌍 Carregando dados geográficos...');
      
      // Criar objeto de range de data baseado no período
      let dateRange = null;
      if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
        dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
      }
      
      // Usar endpoints paralelos para melhor performance
      const [citiesRes, regionsRes, countriesRes] = await Promise.all([
        GranularAPI.getAvailableLocations('city', dateRange),
        GranularAPI.getAvailableLocations('region', dateRange),
        GranularAPI.getAvailableLocations('country', dateRange)
      ]);
      
      setGeographicData(prev => ({
        ...prev,
        cities: citiesRes,
        regions: regionsRes,
        countries: countriesRes
      }));
      
      console.log('✅ Dados geográficos carregados:', {
        cities: citiesRes.length,
        regions: regionsRes.length,
        countries: countriesRes.length,
        dateRange
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados geográficos:', error);
    } finally {
      setLoadingGeographics(false);
    }
  }, [period, customPeriod?.startDate, customPeriod?.endDate]);

  // ✅ FUNÇÃO HELPER: Carregar dados de vendas para o período
  const loadPeriodSalesData = useCallback(async () => {
    setLoadingPeriodSales(true);
    
    try {
      console.log('📊 Carregando dados de vendas para o período:', { period, customPeriod });
      
      // Criar objeto de customDates baseado no período
      let customDates = null;
      let days = 30; // Padrão
      
      if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
        customDates = {
          start_date: customPeriod.startDate,
          end_date: customPeriod.endDate
        };
      } else if (period === 'current_month') {
        // Para mês atual, usar do dia 1 do mês até hoje
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        customDates = {
          start_date: firstDayOfMonth.toISOString().split('T')[0],
          end_date: today.toISOString().split('T')[0]
        };
      } else if (period && period !== 'custom') {
        // Para outros períodos, usar dias
        const periodToDays = {
          '7d': 7,
          '30d': 30,
          '60d': 60,
          '90d': 90
        };
        days = periodToDays[period] || 30;
      }
      
      // Buscar dados de vendas com o período correto
      // IMPORTANTE: Para comparação correta com dashboard de vendas, 
      // não aplicar filtro de fonte nos dados de leads por corretor
      const salesData = await GranularAPI.loadSalesDashboard(
        days,
        null, // Não filtrar por fonte para manter consistência com dashboard de vendas
        null, // Corretor (não usado no marketing)
        customDates
      );
      
      console.log('📊 Parâmetros enviados para API de vendas:', {
        days,
        fonte: null, // Removido filtro de fonte
        corretor: null,
        customDates,
        periodo: period
      });
      
      setPeriodSalesData(salesData);
      
      console.log('✅ Dados de vendas carregados para o período:', {
        period,
        totalLeads: salesData.totalLeads,
        leadsByUserCount: salesData.leadsByUser?.length,
        leadsByUserSample: salesData.leadsByUser?.slice(0, 2), // Mostrar primeiros 2 para debug
        days,
        customDates
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados de vendas para o período:', error);
      setPeriodSalesData(null);
    } finally {
      setLoadingPeriodSales(false);
    }
  }, [period, customPeriod?.startDate, customPeriod?.endDate]); // Removido selectedSource das dependencies

  // ✅ HELPER: Processar dados de vendas para gráficos (similar ao DashboardSales)
  const sortedSalesChartsData = useMemo(() => {
    if (!periodSalesData?.leadsByUser || periodSalesData.leadsByUser.length === 0) {
      return {
        sortedLeadsData: [],
        sortedMeetingsData: []
      };
    }

    console.log('🔄 Processando dados de vendas para gráficos (MARKETING):', {
      originalData: periodSalesData.leadsByUser,
      totalUsers: periodSalesData.leadsByUser.length,
      sampleUser: periodSalesData.leadsByUser[0],
      periodo: period,
      customPeriod: customPeriod,
      fonte: selectedSource
    });

    return {
      // Ordenar por total de leads (value) - decrescente
      sortedLeadsData: [...periodSalesData.leadsByUser]
        .filter(user => user.name !== 'SA IMOB')
        .sort((a, b) => (b.value || 0) - (a.value || 0)),
        
      // Ordenar por reuniões - decrescente  
      sortedMeetingsData: [...periodSalesData.leadsByUser]
        .filter(user => user.name !== 'SA IMOB')
        .map(user => ({
          ...user,
          meetingsHeld: user.meetingsHeld || user.meetings || 0
        }))
        .sort((a, b) => (b.meetingsHeld || 0) - (a.meetingsHeld || 0))
    };
  }, [periodSalesData?.leadsByUser]);

  // ✅ FUNÇÃO: Abrir modal de detalhes por corretor (IDÊNTICA ao DashboardSales)
  const openModalByCorretor = async (type, corretorName) => {
    const titles = {
      'leads': `Leads de ${corretorName}`,
      'reunioes': `Reuniões de ${corretorName}`,
      'vendas': `Vendas de ${corretorName}`
    };

    modalStateRef.current = {
      isOpen: true,
      type,
      title: titles[type] || `Dados de ${corretorName}`,
      isLoading: true,
      data: [],
      error: null
    };
    
    setModalForceUpdate(prev => prev + 1);

    try {
      // Preparar parâmetros extras para incluir período
      let extraParams = {};
      
      if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
        extraParams.start_date = customPeriod.startDate;
        extraParams.end_date = customPeriod.endDate;
      } else if (period === 'current_month') {
        // Para mês atual, usar do dia 1 do mês até hoje
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        extraParams.start_date = firstDayOfMonth.toISOString().split('T')[0];
        extraParams.end_date = today.toISOString().split('T')[0];
      } else if (period && period !== 'custom') {
        const periodToDays = {
          '7d': 7,
          '30d': 30,
          '60d': 60,
          '90d': 90
        };
        extraParams.days = periodToDays[period] || 30;
      }

      // Usar o corretor específico clicado e o filtro de fonte selecionado
      const tablesData = await KommoAPI.getDetailedTables(corretorName, selectedSource || '', extraParams);
      
      const dataMap = {
        'leads': tablesData.leadsDetalhes || [], // Usar leadsDetalhes direto do backend
        'reunioes': tablesData.reunioesDetalhes || [],
        'vendas': tablesData.vendasDetalhes || []
      };

      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        data: dataMap[type]
      };
      
      setModalForceUpdate(prev => prev + 1);
    } catch (error) {
      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        error: error.message
      };
      
      setModalForceUpdate(prev => prev + 1);
    }
  };

  // Função para fechar modal (igual ao DashboardSales)
  const closeModal = () => {
    modalStateRef.current = {
      isOpen: false,
      type: '',
      title: '',
      isLoading: false,
      data: [],
      error: null
    };
    
    setModalForceUpdate(prev => prev + 1);
  };

  // ✅ Effect para carregar dados geográficos - TEMPORARIAMENTE DESABILITADO
  // useEffect(() => {
  //   loadGeographicData();
  // }, [loadGeographicData]);

  // ✅ Effect para carregar dados de vendas quando período mudar
  useEffect(() => {
    loadPeriodSalesData();
  }, [loadPeriodSalesData]);

  // Atualizar dados quando recebidos do cache
  useEffect(() => {
    if (data) {
      setMarketingData(data);
      setFilteredData(data);
    }
  }, [data]);

  // Effect para atualizar insights quando o período muda (se há campanhas selecionadas)
  useEffect(() => {
    console.log('🔍 Effect período mudou:', {
      initialDataLoaded: initialDataLoadedRef.current,
      period,
      customPeriod,
      selectedCampaignsCount: selectedCampaigns.length,
      willExecute: initialDataLoadedRef.current && selectedCampaigns.length > 0 && period
    });
    
    // Skip se os dados iniciais ainda não foram carregados para evitar requisição duplicada
    if (!initialDataLoadedRef.current) return;
    
    // Só executar se há campanhas selecionadas e o período mudou
    if (selectedCampaigns.length > 0 && period) {
      // Cancelar requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Criar novo AbortController
      abortControllerRef.current = new AbortController();
      
      // Função assíncrona para atualizar insights sem mostrar loading
      const updateInsightsSilently = async () => {
        try {
          // Preparar range de datas baseado no período selecionado
          let dateRange;
          if (period === 'current_month') {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            dateRange = {
              start: firstDayOfMonth.toISOString().split('T')[0],
              end: today.toISOString().split('T')[0]
            };
          } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
          } else {
            // Calcular datas baseado no período
            const endDate = new Date();
            const startDate = new Date();
            
            switch (period) {
              case '7d':
                startDate.setDate(endDate.getDate() - 7);
                break;
              case '30d':
                startDate.setDate(endDate.getDate() - 30);
                break;
              case '60d':
                startDate.setDate(endDate.getDate() - 60);
                break;
              case '90d':
                startDate.setDate(endDate.getDate() - 90);
                break;
              default:
                startDate.setDate(endDate.getDate() - 30);
            }
            
            dateRange = {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0]
            };
          }
          
          // Filtrar adsets selecionados pelas campanhas selecionadas
          const validAdsets = selectedAdsets.filter(adsetId => {
            const adset = adsets.find(a => a.id === adsetId);
            return adset && selectedCampaigns.includes(adset.campaign_id);
          });
          
          console.log('🎯 Insights: usando adsets filtrados para campanhas selecionadas:', {
            selectedCampaigns,
            selectedAdsets,
            validAdsets,
            selectedAds
          });
          
          // Carregar insights sem mostrar loading (similar ao auto-refresh)
          const insights = await GranularAPI.getFacebookCampaignInsights(
            selectedCampaigns, 
            dateRange, 
            validAdsets, 
            selectedAds
          );
          
          // Verificar se a requisição não foi cancelada
          if (!abortControllerRef.current.signal.aborted) {
            setCampaignInsights(insights);
          }
        } catch (error) {
          // Error handled silently
        }
      };
      
      updateInsightsSilently();
    }
  }, [period, customPeriod?.startDate, customPeriod?.endDate, selectedCampaigns, selectedAdsets, selectedAds, adsets]); // Monitorar mudanças no período e filtros
  
  // Effect para carregar dados demográficos
  useEffect(() => {
    // Skip se não há campanhas selecionadas
    if (selectedCampaigns.length === 0) {
      setDemographicData({ genderData: [], cityData: [] });
      return;
    }
    
    const loadDemographicData = async () => {
      setLoadingDemographics(true);
      try {
        let dateRange;
        if (period === 'current_month') {
          const today = new Date();
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          dateRange = {
            start: firstDayOfMonth.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
          };
        } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
          dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
        } else {
          const endDate = new Date();
          const startDate = new Date();
          
          switch (period) {
            case '7d':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(endDate.getDate() - 30);
              break;
            case '60d':
              startDate.setDate(endDate.getDate() - 60);
              break;
            case '90d':
              startDate.setDate(endDate.getDate() - 90);
              break;
            default:
              startDate.setDate(endDate.getDate() - 30);
          }
          
          dateRange = {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          };
        }
        
        // Buscar dados demográficos (gênero real, cidade mockada)
        const demographics = await GranularAPI.getFacebookInsightsWithBreakdowns(
          selectedCampaigns,
          dateRange
        );
        
        setDemographicData(demographics);
      } catch (error) {
        // Error handled, fallback to mock data
        // Em caso de erro, usar dados mockados apenas para gênero
        setDemographicData({
          genderData: [
            { name: 'Masculino', value: 427 },
            { name: 'Feminino', value: 358 },
            { name: 'Não informado', value: 62 }
          ],
          cityData: [] // Não usar dados de cidade
        });
      } finally {
        setLoadingDemographics(false);
      }
    };
    
    loadDemographicData();
  }, [period, customPeriod?.startDate, customPeriod?.endDate, selectedCampaigns]);

  // Filtrar dados dinamicamente sem recarregar da API
  useEffect(() => {
    if (!marketingData) return;

    if (!selectedSource || selectedSource === '') {
      // Sem filtro - mostrar todos os dados
      setFilteredData(marketingData);
    } else {
      // Filtrar dados por fonte selecionada, mas preservar métricas do Facebook
      const filteredLeadsBySource = marketingData.leadsBySource?.filter(source => 
        source.name === selectedSource
      ) || [];
      
      const selectedSourceLeads = marketingData.leadsBySource?.find(source => 
        source.name === selectedSource
      );

      const filtered = {
  ...marketingData, // Preservar todas as métricas originais (Facebook, etc)
  leadsBySource: filteredLeadsBySource,
  totalLeads: selectedSourceLeads?.value || 0,
  activeLeads: selectedSourceLeads?.active || 0, // Adicione esta linha
  // Preservar leadsByAd se existir para a fonte específica
  leadsByAd: marketingData.leadsByAd?.filter(ad => 
    ad.source === selectedSource || !ad.source
  ) || marketingData.leadsByAd || []
};
      
      setFilteredData(filtered);
    }
  }, [marketingData, selectedSource]);

  // Helpers responsivos
  const getChartHeight = (size = 'medium') => {
    if (size === 'small') {
      return isMobile ? '280px' : '320px';
    } else if (size === 'medium') {
      return isMobile ? '320px' : '380px';
    } else {
      return isMobile ? '380px' : '420px';
    }
  };

  // Função para aplicar filtros de campanha (otimizada para evitar re-renders desnecessários)
  const handleCampaignFilterChange = useCallback(async (newFilters) => {
    setCampaignFilters(newFilters);
    
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Se houver campanhas selecionadas, carregar insights específicos
    if (newFilters.campaignIds.length > 0) {
      // Criar novo AbortController
      abortControllerRef.current = new AbortController();
      
      setLoadingInsights(true);
      try {
        // Preparar range de datas baseado no período selecionado
        let dateRange;
        if (period === 'current_month') {
          const today = new Date();
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          dateRange = {
            start: firstDayOfMonth.toISOString().split('T')[0],
            end: today.toISOString().split('T')[0]
          };
        } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
          dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
        } else {
          // Calcular datas baseado no período
          const endDate = new Date();
          const startDate = new Date();
          
          switch (period) {
            case '7d':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(endDate.getDate() - 30);
              break;
            case '60d':
              startDate.setDate(endDate.getDate() - 60);
              break;
            case '90d':
              startDate.setDate(endDate.getDate() - 90);
              break;
            default:
              startDate.setDate(endDate.getDate() - 30);
          }
          
          dateRange = {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          };
        }
        
        // Filtrar adsets selecionados pelas campanhas selecionadas
        const validAdsets = newFilters.adsetIds.filter(adsetId => {
          const adset = adsets.find(a => a.id === adsetId);
          return adset && newFilters.campaignIds.includes(adset.campaign_id);
        });
        
        console.log('🎯 handleCampaignFilterChange: enviando requisição para API:', {
          campaignIds: newFilters.campaignIds,
          requestedAdsets: newFilters.adsetIds,
          validAdsets,
          adIds: newFilters.adIds,
          dateRange,
          url: `${import.meta.env.VITE_API_URL}/facebook-ads/campaigns/insights`
        });
        
        const insights = await GranularAPI.getFacebookCampaignInsights(
          newFilters.campaignIds, 
          dateRange, 
          validAdsets, 
          newFilters.adIds
        );
        
        console.log('📊 Resposta da API recebida:', {
          hasData: !!insights,
          structure: insights ? Object.keys(insights) : null,
          totalLeads: insights?.totalLeads || 0,
          totalSpend: insights?.totalSpend || 0,
          totalImpressions: insights?.totalImpressions || 0,
          campaignsCount: insights?.campaigns?.length || 0
        });
        
        // Verificar se a requisição não foi cancelada
        if (!abortControllerRef.current.signal.aborted) {
          setCampaignInsights(insights);
        }
        
        // REMOVIDO: onDataRefresh para evitar re-render desnecessário
        // Os insights já são suficientes para mostrar os dados filtrados
      } catch (error) {
        console.error('❌ Erro ao buscar insights das campanhas:', {
          error: error.message,
          filters: newFilters,
          wasAborted: abortControllerRef.current?.signal?.aborted
        });
        
        if (!abortControllerRef.current.signal.aborted) {
          setCampaignInsights(null);
          // Relançar o erro para que seja capturado pelo handleApplyFilters
          throw error;
        }
      } finally {
        if (!abortControllerRef.current.signal.aborted) {
          setLoadingInsights(false);
        }
      }
    } else {
      // Se não há campanhas selecionadas, apenas limpar insights
      setCampaignInsights(null);
    }
  }, [period, customPeriod]);

  // Handler para seleção de campanhas (apenas atualiza estado, não aplica filtro)
  const handleCampaignSelect = useCallback((campaignId) => {
    const newSelectedCampaigns = selectedCampaigns.includes(campaignId)
      ? selectedCampaigns.filter(id => id !== campaignId)
      : [...selectedCampaigns, campaignId];
    
    setSelectedCampaigns(newSelectedCampaigns);
    
    // Se uma campanha foi deselecionada, remover adsets que pertencem a ela
    let newSelectedAdsets = selectedAdsets;
    if (selectedCampaigns.includes(campaignId) && !newSelectedCampaigns.includes(campaignId)) {
      // Campanha foi deselecionada, remover adsets que pertencem a ela
      newSelectedAdsets = selectedAdsets.filter(adsetId => {
        const adset = adsets.find(a => a.id === adsetId);
        return adset && adset.campaign_id !== campaignId;
      });
      setSelectedAdsets(newSelectedAdsets);
      
      console.log('🎯 Campanha deselecionada, removendo adsets:', {
        campaignId,
        removedAdsets: selectedAdsets.filter(adsetId => {
          const adset = adsets.find(a => a.id === adsetId);
          return adset && adset.campaign_id === campaignId;
        }),
        newSelectedAdsets
      });
    }
  }, [selectedCampaigns, selectedAdsets, adsets]);

  // Handler para seleção de conjuntos de anúncios (apenas atualiza estado)
  const handleAdsetSelect = useCallback((adsetId) => {
    const newSelectedAdsets = selectedAdsets.includes(adsetId)
      ? selectedAdsets.filter(id => id !== adsetId)
      : [...selectedAdsets, adsetId];
    
    setSelectedAdsets(newSelectedAdsets);
    
    // Verificar se o adset pertence às campanhas selecionadas
    const adset = adsets.find(a => a.id === adsetId);
    const validSelection = adset && selectedCampaigns.includes(adset.campaign_id);
    
    console.log('🎯 Adset selecionado:', {
      adsetId,
      belongsToCampaign: adset?.campaign_id,
      selectedCampaigns,
      validSelection,
      newSelectedAdsets
    });
  }, [selectedAdsets, selectedCampaigns, adsets]);

  // Handler para seleção de anúncios (apenas atualiza estado)
  const handleAdSelect = useCallback((adId) => {
    const newSelectedAds = selectedAds.includes(adId)
      ? selectedAds.filter(id => id !== adId)
      : [...selectedAds, adId];
    
    setSelectedAds(newSelectedAds);
  }, [selectedAds]);

  // ✅ FUNÇÃO HELPER: Calcular leads em remarketing corretamente
  const getLeadsEmRemarketing = useCallback((pipelineStatus) => {
    if (!pipelineStatus || !Array.isArray(pipelineStatus)) {
      console.warn('⚠️ pipelineStatus inválido:', pipelineStatus);
      return 0;
    }
    
    const remarketingStages = ["Lead Novo", "Contato Feito", "Acompanhamento"];
    const result = pipelineStatus
      .filter(stage => remarketingStages.includes(stage.name))
      .reduce((sum, stage) => sum + (stage.value || 0), 0);
    
    console.log('📊 getLeadsEmRemarketing calculado:', {
      totalStages: pipelineStatus.length,
      remarketingStagesEncontrados: pipelineStatus.filter(stage => remarketingStages.includes(stage.name)),
      resultado: result
    });
    
    return result;
  }, []);

  // ✅ FUNÇÃO HELPER: Atualizar filtro geográfico
  const updateGeographicFilter = useCallback((type, value) => {
    setGeographicData(prev => ({
      ...prev,
      selectedFilters: {
        ...prev.selectedFilters,
        [type]: value
      }
    }));
    
    console.log('🌍 Filtro geográfico atualizado:', { type, value });
  }, []);

  // ✅ FUNÇÃO HELPER: Buscar dados de cidades com filtros
  const getCitiesData = useCallback(async (filters = {}) => {
    try {
      console.log('🏙️ Buscando dados de cidades com filtros:', filters);
      
      // Criar objeto de range de data baseado no período
      let dateRange = null;
      if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
        dateRange = { start: customPeriod.startDate, end: customPeriod.endDate };
      }
      
      const citiesData = await GranularAPI.getCitiesData(dateRange);
      
      // Aplicar filtros se houver
      let filteredCities = citiesData.cities;
      
      if (filters.city) {
        filteredCities = filteredCities.filter(city => city.name === filters.city);
      }
      
      console.log('📊 Dados de cidades processados:', {
        totalCities: citiesData.cities.length,
        filteredCities: filteredCities.length,
        totalLeads: filteredCities.reduce((sum, city) => sum + city.value, 0),
        dateRange
      });
      
      return {
        ...citiesData,
        cities: filteredCities
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar dados de cidades:', error);
      return { cities: [], totalCities: 0, totalLeads: 0 };
    }
  }, [period, customPeriod?.startDate, customPeriod?.endDate]);

  // Handler para aplicar filtros (botão)
  const handleApplyFilters = useCallback(async () => {
    // Verificar se há campanhas selecionadas
    if (selectedCampaigns.length === 0) {
      console.warn('⚠️ Nenhuma campanha selecionada para aplicar filtros');
      alert('Por favor, selecione pelo menos uma campanha antes de aplicar os filtros.');
      return;
    }

    // Filtrar adsets selecionados pelas campanhas selecionadas
    const validAdsets = selectedAdsets.filter(adsetId => {
      const adset = adsets.find(a => a.id === adsetId);
      return adset && selectedCampaigns.includes(adset.campaign_id);
    });

    // Validar se adsets selecionados pertencem às campanhas
    const invalidAdsets = selectedAdsets.filter(adsetId => {
      const adset = adsets.find(a => a.id === adsetId);
      return adset && !selectedCampaigns.includes(adset.campaign_id);
    });

    if (invalidAdsets.length > 0) {
      console.warn('⚠️ Alguns adsets selecionados não pertencem às campanhas selecionadas:', invalidAdsets);
    }

    const newFilters = {
      ...campaignFilters,
      campaignIds: selectedCampaigns,
      adsetIds: validAdsets,
      adIds: selectedAds
    };

    console.log('🎯 Aplicando filtros:', {
      totalCampaigns: campaigns.length,
      selectedCampaigns: selectedCampaigns.length,
      totalAdsets: adsets.length,
      selectedAdsets: selectedAdsets.length,
      validAdsets: validAdsets.length,
      invalidAdsets: invalidAdsets.length,
      selectedAds: selectedAds.length,
      geographicFilters: geographicData.selectedFilters,
      filtersToApply: newFilters
    });

    // Aplicar filtros imediatamente
    try {
      await handleCampaignFilterChange(newFilters);
      console.log('✅ Filtros aplicados com sucesso');
    } catch (error) {
      console.error('❌ Erro ao aplicar filtros:', error);
      alert('Erro ao aplicar filtros. Verifique a conexão e tente novamente.');
    }
  }, [selectedCampaigns, selectedAdsets, selectedAds, adsets, campaigns, campaignFilters, handleCampaignFilterChange]);

  // Effect para fechar dropdowns quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adsetDropdownRef.current && !adsetDropdownRef.current.contains(event.target)) {
        setShowAdsetDropdown(false);
      }
      if (adDropdownRef.current && !adDropdownRef.current.contains(event.target)) {
        setShowAdDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Componente para exibir indicador de tendência (mesmo do DashboardSales)
  const TrendIndicator = ({ value, showZero = false }) => {
    // Se o valor for null, undefined ou 0 e showZero for false, não exibir nada
    if ((value === null || value === undefined || (value === 0 && !showZero))) {
      return null;
    }
    
    // Determinar se o valor é positivo, negativo ou zero
    const isPositive = value > 0;
    
    // Estilo para o indicador de tendência com setas diagonais
    const style = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      padding: '4px 10px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600',
      backgroundColor: isPositive 
        ? 'rgba(76, 224, 179, 0.15)'  // Verde claro para positivo
        : 'rgba(255, 58, 94, 0.15)',  // Vermelho claro para negativo
      color: isPositive 
        ? '#4ce0b3' // Verde para positivo
        : '#ff3a5e', // Vermelho para negativo
      marginLeft: '8px'
    };
    
    return (
      <div style={style} className="trend-indicator-square">
        {isPositive ? '↗' : '↘'} {isPositive ? '+' : ''}{Math.abs(value).toFixed(1)}%
      </div>
    );
  };

  // Mini Metric Card Component
  const MiniMetricCard = ({ title, value, subtitle, color = COLORS.primary }) => (
    <div className="mini-metric-card">
      <div className="mini-metric-value" style={{ color }}>{value}</div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

  // Mini Metric Card com TrendIndicator (versão simples)
  const MiniMetricCardWithTrend = ({ title, value, trendValue, color = COLORS.primary, subtitle }) => (
    <div className="mini-metric-card">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="mini-metric-value" style={{ color }}>{value}</div>
        <TrendIndicator value={trendValue} />
      </div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

  // Enhanced Compact Chart Component with Dynamic Updates (ECharts Strategy)
  const CompactChart = memo(({ data, type, config, style, loading = false, onBarClick = null }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // Inicializar chart com configuração vazia (eixos vazios)
    useEffect(() => {
      if (!chartRef.current) return;

      if (!chartInstance.current) {
        chartInstance.current = echarts.init(chartRef.current);
        
        // Mostrar chart vazio inicialmente com estrutura definida
        let emptyOption = {};
        
        if (type === 'bar') {
          emptyOption = {
            grid: { 
              top: isMobile ? 30 : 20, 
              right: isMobile ? 10 : 20, 
              bottom: isMobile ? 80 : 40, 
              left: isMobile ? 50 : 60 
            },
            xAxis: {
              type: 'category',
              data: [], // Eixo vazio inicialmente
              axisLabel: { 
                fontSize: isMobile ? 11 : 12,
                rotate: isMobile ? 45 : 0,
                interval: 0, // Força mostrar todos os labels
                overflow: 'none',
                width: isMobile ? 80 : 100,
                rich: {
                  a: {
                    fontSize: isMobile ? 10 : 12,
                    fontWeight: 'normal'
                  }
                }
              },
              axisLine: {
                show: true
              }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              name: config.name || 'Data',
              data: [], // Dados vazios inicialmente
              type: 'bar',
              itemStyle: { color: config.color },
              barWidth: isMobile ? '50%' : '70%',
              label: {
                show: true,
                position: 'top',
                fontSize: isMobile ? 8 : 14,
                fontWeight: 'bold',
                color: '#2d3748',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: [2, 6],
                borderRadius: 4,
                formatter: function(params) {
                  return params.value;
                }
              }
            }],
            tooltip: {
              trigger: 'axis',
              formatter: function(params) {
                const item = params[0];
                return `${item.name}: ${item.value}`;
              }
            }
          };
        } else if (type === 'pie') {
          emptyOption = {
            tooltip: {
              trigger: 'item',
              formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
              orient: isMobile ? 'horizontal' : 'vertical',
              left: isMobile ? 'center' : 'left',
              bottom: isMobile ? 0 : 'auto',
              textStyle: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              name: config.name || 'Data',
              type: 'pie',
              radius: isMobile ? ['20%', '50%'] : ['25%', '60%'],
              center: isMobile ? ['50%', '40%'] : ['50%', '50%'],
              data: [], // Dados vazios inicialmente
              label: {
                fontSize: isMobile ? 10 : 12,
                formatter: '{b}: {c} ({d}%)'
              },
              tooltip: {
                formatter: '{b}: {c} ({d}%)'
              }
            }]
          };
        } else if (type === 'line') {
          emptyOption = {
            grid: { top: 20, right: 20, bottom: 40, left: 60 },
            xAxis: {
              type: 'category',
              data: [],
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              data: [],
              type: 'line',
              itemStyle: { color: config.color },
              lineStyle: { color: config.color, width: 2 },
              symbol: 'circle',
              symbolSize: 6
            }],
            tooltip: {
              trigger: 'axis',
              formatter: function(params) {
                const item = params[0];
                return `${item.name}: ${item.value}`;
              }
            }
          };
        }
        
        chartInstance.current.setOption(emptyOption);
      }
    }, [type, config, isMobile]);

    // Controlar loading animation - APENAS no carregamento inicial, não em mudanças de filtro
    useEffect(() => {
      if (!chartInstance.current) return;
      
      // Só mostrar loading se for carregamento inicial (sem dados ainda)
      if (loading && (!data || data.length === 0)) {
        chartInstance.current.showLoading({
          text: 'Carregando...',
          color: config.color,
          textColor: '#666',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          zlevel: 0
        });
        return;
      } else {
        chartInstance.current.hideLoading();
      }
    }, [loading, data, config.color]);

    // Atualizar dados dinamicamente quando mudam (ASYNC UPDATE) - SEM LOADING
    useEffect(() => {
      if (!chartInstance.current || !data || data.length === 0) return;

      // ECharts will automatically animate transitions between data updates
      let updateOption = {};

      if (type === 'bar') {
        updateOption = {
          xAxis: {
            data: data.map(item => item[config.xKey])
          },
          series: [{
            name: config.name || 'Data', // Use name for navigation
            data: data.map(item => item[config.yKey]),
            label: {
              show: true,
              position: 'top',
              fontSize: isMobile ? 10 : 14,
              fontWeight: 'bold',
              color: '#2d3748',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: [2, 6],
              borderRadius: 4,
              formatter: function(params) {
                return params.value;
              }
            }
          }]
        };
      } else if (type === 'pie') {
        // Preparar dados com cores personalizadas para pie
        const pieData = data.map((item, index) => ({
          name: item.name,
          value: item.value,
          itemStyle: { 
            color: config.colors ? config.colors[index % config.colors.length] : config.color 
          }
        }));
        
        updateOption = {
          series: [{
            name: config.name || 'Data',
            data: pieData
          }]
        };
      } else if (type === 'line') {
        updateOption = {
          xAxis: {
            data: data.map(item => item[config.xKey])
          },
          series: [{
            name: config.name || 'Data',
            data: data.map(item => item[config.yKey])
          }]
        };
      }

      // Use setOption to update data dynamically (ECharts finds differences automatically)
      chartInstance.current.setOption(updateOption, false); // false = merge mode
      
    }, [data, type, config]);

    // Add click event handler for bar charts when onBarClick is provided
    useEffect(() => {
      if (!chartInstance.current || !onBarClick || type !== 'bar') return;
      
      // Remove existing click handler
      chartInstance.current.off('click');
      
      // Add click handler
      chartInstance.current.on('click', function (params) {
        console.log('🔍 Bar clicked:', params);
        onBarClick(params.name, params.value, params);
      });
      
      // Cleanup
      return () => {
        if (chartInstance.current) {
          chartInstance.current.off('click');
        }
      };
    }, [onBarClick, type]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }, []);

    return <div ref={chartRef} style={style} />;
  });

  // Se está carregando E não tem dados, mostrar loading spinner
  if (isLoading && !marketingData) {
    return <LoadingSpinner message="🔄 Atualizando dados de marketing..." />;
  }

  // Se não tem dados E não está carregando, mostrar erro
  if (!marketingData) {
    return (
      <div className="dashboard-content">
        <div className="error-message">
          Dados de marketing não disponíveis.
        </div>
      </div>
    );
  }

  // Debug: Log da fonte dos dados
  console.log('🔍 Fonte dos dados para métricas:', {
    hasCampaignInsights: !!campaignInsights,
    selectedCampaignsCount: selectedCampaigns.length,
    hasFilteredData: !!filteredData?.facebookMetrics,
    dataSource: campaignInsights && selectedCampaigns.length > 0 ? 'campaignInsights' : 'filteredData.facebookMetrics'
  });

  // Usar insights das campanhas selecionadas se disponível, senão usar dados gerais
  const facebookMetrics = campaignInsights && selectedCampaigns.length > 0 ? {
    costPerLead: campaignInsights.costPerLead || 0,
    ctr: campaignInsights.averageCTR || 0,
    cpc: campaignInsights.averageCPC || 0,
    cpm: campaignInsights.averageCPM || 0,
    impressions: campaignInsights.totalImpressions || 0,
    reach: campaignInsights.totalReach || 0,
    clicks: campaignInsights.totalClicks || 0,
    spend: campaignInsights.totalSpend || 0,
    inlineLinkClicks: campaignInsights.totalInlineLinkClicks || 0,
    inlineLinkClickCtr: campaignInsights.inlineLinkClickCTR || 0,
    costPerInlineLinkClick: campaignInsights.costPerInlineLinkClick || 0,
    engagement: {
      likes: campaignInsights.totalPostReactions || 0,
      comments: campaignInsights.totalComments || 0,
      shares: 0, // Não disponível na estrutura atual
      videoViews: 0, // Não disponível na estrutura atual
      profileVisits: filteredData?.profileVisits || 0,
      pageEngagement: campaignInsights.totalPageEngagement || 0,
      postEngagement: campaignInsights.totalPostEngagement || 0
    }
  } : filteredData?.facebookMetrics || {
    costPerLead: 0,
    ctr: 0,
    cpc: 0,
    cpm: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    spend: 0,
    inlineLinkClicks: 0,
    inlineLinkClickCtr: 0,
    costPerInlineLinkClick: 0,
    engagement: {
      likes: 0,
      comments: 0,
      shares: 0,
      videoViews: 0,
      profileVisits: filteredData?.profileVisits || 0,
      pageEngagement: 0,
      postEngagement: 0
    }
  };

  // Debug: Log das métricas finais
  console.log('📊 Métricas finais para exibição:', {
    source: campaignInsights && selectedCampaigns.length > 0 ? 'insights filtrados' : 'dados gerais',
    whatsappConversations: filteredData?.whatsappConversations,
    profileVisits: filteredData?.profileVisits,
    facebookMetricsProfileVisits: filteredData?.facebookMetrics?.profileVisits,
    metrics: {
      reach: facebookMetrics.reach,
      impressions: facebookMetrics.impressions,
      clicks: facebookMetrics.clicks,
      spend: facebookMetrics.spend,
      costPerLead: facebookMetrics.costPerLead,
      cpc: facebookMetrics.cpc,
      cpm: facebookMetrics.cpm
    }
  });

  // ✅ COMPONENTE: Gráfico de Cidades
  const CityChart = memo(() => {
    const [citiesData, setCitiesData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Carregar dados de cidades quando filtros mudarem
    useEffect(() => {
      const loadCitiesData = async () => {
        setLoading(true);
        try {
          const data = await getCitiesData(geographicData.selectedFilters);
          setCitiesData(data.cities || []);
        } catch (error) {
          console.error('Erro ao carregar dados de cidades:', error);
          setCitiesData([]);
        } finally {
          setLoading(false);
        }
      };

      loadCitiesData();
    }, [geographicData.selectedFilters, getCitiesData]);

    if (loading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: getChartHeight('medium'),
          color: COLORS.secondary 
        }}>
          <span>Carregando cidades...</span>
        </div>
      );
    }

    if (citiesData.length === 0) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: getChartHeight('medium'),
          color: COLORS.light 
        }}>
          <span>Nenhum dado de cidade disponível</span>
        </div>
      );
    }

    return (
      <CompactChart 
        type="bar" 
        data={citiesData.slice(0, 8)} // Top 8 cidades
        config={{ 
          name: 'Leads por Cidade',
          color: COLORS.secondary,
          xKey: 'name',
          yKey: 'value'
        }}
        style={{ height: getChartHeight('medium') }}
        loading={loading}
      />
    );
  });

  // ✅ COMPONENTE: Filtros Geográficos
  const GeographicFilters = memo(() => {
    if (loadingGeographics) {
      return (
        <div className="geographic-filters-loading">
          <span>Carregando localizações...</span>
        </div>
      );
    }

    return (
      <div className="geographic-filters">
        {/* Filtro por Cidade */}
        <div className="geographic-filter">
          <label className="filter-label">Cidade:</label>
          <select
            value={geographicData.selectedFilters.city || ''}
            onChange={(e) => updateGeographicFilter('city', e.target.value || null)}
            className="geographic-select"
          >
            <option value="">Todas as Cidades</option>
            {geographicData.cities.map((city) => (
              <option key={city.value} value={city.value}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Região */}
        <div className="geographic-filter">
          <label className="filter-label">Região:</label>
          <select
            value={geographicData.selectedFilters.region || ''}
            onChange={(e) => updateGeographicFilter('region', e.target.value || null)}
            className="geographic-select"
          >
            <option value="">Todas as Regiões</option>
            {geographicData.regions.map((region) => (
              <option key={region.value} value={region.value}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por País */}
        <div className="geographic-filter">
          <label className="filter-label">País:</label>
          <select
            value={geographicData.selectedFilters.country || ''}
            onChange={(e) => updateGeographicFilter('country', e.target.value || null)}
            className="geographic-select"
          >
            <option value="">Todos os Países</option>
            {geographicData.countries.map((country) => (
              <option key={country.value} value={country.value}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  });

  return (
    <div className={`dashboard-content ${isUpdating ? 'updating' : ''}`}>
      {/* CSS para os novos estilos de filtros e botões de período */}
      <style>{`
        /* Estilos para o indicador de tendência */
        .trend-indicator {
          display: inline-flex;
          align-items: center;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-left: 8px;
        }
        
        .trend-indicator.positive {
          background-color: rgba(0, 200, 83, 0.15);
          color: #00c853;
        }
        
        .trend-indicator.negative {
          background-color: rgba(255, 82, 82, 0.15);
          color: #ff5252;
        }
        
        .trend-indicator.neutral {
          background-color: rgba(158, 158, 158, 0.15);
          color: #9e9e9e;
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        
        .trend-tag-square:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
        }
        
        .trend-tag-square {
          cursor: default;
          user-select: none;
          flex-shrink: 0;
        }
        
        .trend-indicator-square {
          background-color: rgba(255, 82, 82, 0.15);
          color: #ff3a5e;
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          display: inline-block;
          text-align: center;
        }

        /* Estilização moderna dos controles de período */
        .period-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: flex-end;
          position: relative;
        }

        .period-selector {
          display: flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.9);
          padding: 6px;
          border-radius: 12px;
          border: 1px solid #e0e6ed;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(10px);
        }

        .period-selector button {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          position: relative;
          overflow: hidden;
        }

        .period-selector button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s ease;
        }

        .period-selector button:hover::before {
          left: 100%;
        }

        .period-selector button:hover {
          background: rgba(78, 88, 89, 0.1);
          color: #4E5859;
          transform: translateY(-1px);
        }

        .period-selector button.active {
          background: linear-gradient(135deg, #4E5859 0%, #96856F 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(78, 88, 89, 0.3);
          transform: translateY(-1px);
        }

        .period-selector button.active:hover {
          background: linear-gradient(135deg, #3a4344 0%, #7a6b5a 100%);
          transform: translateY(-2px);
        }

        /* Estilos para MultiSelectFilter */
        .multi-select-container {
          display: flex;
          gap: 4px;
          position: relative;
          min-width: 200px;
          align-items: center;
        }

        .multi-select-wrapper {
          position: relative;
        }

        .multi-select-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #2d3748;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 42px;
        }

        .multi-select-button:hover {
          border-color: #4E5859;
          box-shadow: 0 0 0 1px rgba(78, 88, 89, 0.1);
        }

        .multi-select-button:focus {
          outline: none;
          border-color: #4E5859;
          box-shadow: 0 0 0 3px rgba(78, 88, 89, 0.1);
        }

        .multi-select-text {
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .multi-select-arrow {
          margin-left: 8px;
          font-size: 12px;
          transition: transform 0.2s ease;
          transform-origin: center;
        }

        .multi-select-arrow.open {
          transform: rotate(180deg);
        }

        .multi-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 250px;
          overflow-y: auto;
          margin-top: 2px;
        }

        .multi-select-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          cursor: pointer;
          transition: background-color 0.15s ease;
          font-size: 14px;
        }

        .multi-select-option:hover {
          background-color: #f7fafc;
        }

        .multi-select-option.selected {
          background-color: rgba(78, 88, 89, 0.1);
          color: #4E5859;
          font-weight: 500;
        }

        .multi-select-option.select-all {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #4E5859;
          border-bottom: 1px solid #e2e8f0;
        }

        .multi-select-option.select-all:hover {
          background-color: #e9ecef;
        }

        .multi-select-divider {
          height: 1px;
          background-color: #e2e8f0;
          margin: 0;
        }

        .multi-select-option input[type="checkbox"] {
          margin: 0;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .multi-select-option span {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Estilos para filtro de campanha */
        .campaign-filter-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #2d3748;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 42px;
        }

        .campaign-filter-button:hover {
          border-color: #4E5859;
          box-shadow: 0 0 0 1px rgba(78, 88, 89, 0.1);
        }

        .dropdown-arrow {
          margin-left: 8px;
          font-size: 12px;
          transition: transform 0.2s ease;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .campaign-dropdown {
          position: absolute; !important
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 0;
          overflow: hidden;
          opacity: 0;
          transition: max-height 0.3s ease, opacity 0.2s ease, margin-top 0.2s ease;
          margin-top: 0;
          transform: none; !important
        }

        .campaign-dropdown.show {
          max-height: 350px;
          overflow-y: auto;
          opacity: 1;
          margin-top: 2px;
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .period-selector {
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .period-selector button {
            padding: 8px 12px;
            font-size: 13px;
          }
          
          .multi-select-container {
            min-width: 150px;
          }
          
          .multi-select-button {
            padding: 8px 10px;
            font-size: 13px;
            min-height: 38px;
          }
          
          .multi-select-option {
            padding: 8px 10px;
            font-size: 13px;
          }
          
          .multi-select-dropdown {
            max-height: 200px;
          }
        }

        @media (max-width: 480px) {
          .filters-group {
            flex-direction: column;
            gap: 12px;
          }
          
          .multi-select-container {
            min-width: unset;
          }
          
          .period-selector {
            width: 100%;
          }
        }

        /* Estilos padronizados para todos os dropdowns do Facebook */
        .campaign-selector,
        .adset-selector,
        .ad-selector {
          /* Removido flex-direction: column para manter alinhamento horizontal */
          min-width: 220px;
        }

        .campaign-filter-container,
        .adset-filter-container,
        .ad-filter-container {
          position: relative;
        }

        .campaign-filter-button,
        .adset-filter-button,
        .ad-filter-button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 16px;
          background-color: #f8f9fa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          color: #333;
          min-height: 44px;
          transition: all 0.2s ease;
        }

        .campaign-filter-button:hover,
        .adset-filter-button:hover,
        .ad-filter-button:hover {
          background-color: #f0f0f0;
          border-color: #4E5859;
        }

        .dropdown-arrow {
          transition: transform 0.2s;
          font-size: 12px;
          color: #666;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .campaign-dropdown,
        .adset-dropdown,
        .ad-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background-color: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          max-height: 400px;
          overflow: hidden;
          display: none;
          margin-top: 4px;
        }

        .campaign-dropdown.show,
        .adset-dropdown.show,
        .ad-dropdown.show {
          display: block;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .campaign-search {
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
        }

        .campaign-search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          font-size: 14px;
        }

        .campaign-search-input:focus {
          outline: none;
          border-color: #4E5859;
        }

        .campaign-actions,
        .adset-actions,
        .ad-actions {
          display: flex;
          gap: 8px;
          padding: 12px;
          border-bottom: 1px solid #e0e0e0;
          background-color: #f8f9fa;
        }

        .select-all-btn,
        .clear-all-btn {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background-color: white;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .select-all-btn:hover {
          background-color: #4E5859;
          color: white;
          border-color: #4E5859;
        }

        .clear-all-btn:hover {
          background-color: #ff3a5e;
          color: white;
          border-color: #ff3a5e;
        }

        .campaign-list,
        .adset-list,
        .ad-list {
          max-height: 250px;
          overflow-y: auto;
          padding: 8px;
        }

        .campaign-item,
        .adset-item,
        .ad-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.2s;
          margin-bottom: 4px;
        }

        .campaign-item:hover,
        .adset-item:hover,
        .ad-item:hover {
          background-color: #f8f9fa;
        }

        .campaign-item input[type="checkbox"],
        .adset-item input[type="checkbox"],
        .ad-item input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .campaign-name,
        .adset-name,
        .ad-name {
          flex: 1;
          font-size: 14px;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .campaign-status,
        .adset-status,
        .ad-status {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 500;
          white-space: nowrap;
        }

        .campaign-status.active,
        .adset-status.active,
        .ad-status.active {
          background-color: #d4edda;
          color: #155724;
        }

        .campaign-status.paused,
        .adset-status.paused,
        .ad-status.paused {
          background-color: #f8d7da;
          color: #721c24;
        }

        .campaign-loading,
        .adset-loading,
        .ad-loading {
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        /* Scrollbar personalizada */
        .campaign-list::-webkit-scrollbar,
        .adset-list::-webkit-scrollbar,
        .ad-list::-webkit-scrollbar {
          width: 6px;
        }

        .campaign-list::-webkit-scrollbar-thumb,
        .adset-list::-webkit-scrollbar-thumb,
        .ad-list::-webkit-scrollbar-thumb {
          background-color: #ddd;
          border-radius: 3px;
        }

        .campaign-list::-webkit-scrollbar-thumb:hover,
        .adset-list::-webkit-scrollbar-thumb:hover,
        .ad-list::-webkit-scrollbar-thumb:hover {
          background-color: #ccc;
        }

        /* Botão Aplicar Filtros usa estilos do Dashboard.css */

        /* Badges indicadores de status */
        .filtered-badge, .unfiltered-badge, .corrected-badge {
          display: inline-block;
          margin-left: 8px;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .filtered-badge {
          background-color: rgba(76, 224, 179, 0.15);
          color: #4ce0b3;
          border: 1px solid rgba(76, 224, 179, 0.3);
        }

        .unfiltered-badge {
          background-color: rgba(150, 133, 111, 0.15);
          color: #96856F;
          border: 1px solid rgba(150, 133, 111, 0.3);
        }

        .corrected-badge {
          background-color: rgba(0, 200, 83, 0.15);
          color: #00c853;
          border: 1px solid rgba(0, 200, 83, 0.3);
          animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
          from { box-shadow: 0 0 2px rgba(0, 200, 83, 0.3); }
          to { box-shadow: 0 0 8px rgba(0, 200, 83, 0.6); }
        }

        .loading-indicator {
          color: #ff9800;
          font-weight: 500;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Indicador de status global */
        .global-status-indicator {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          background: linear-gradient(135deg, #4E5859 0%, #96856F 100%);
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .status-text {
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
        }

        /* Estilos para Filtros Geográficos */
        .geographic-filters {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }

        .geographic-filter {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 120px;
        }

        .geographic-select {
          padding: 8px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          background-color: white;
          color: #2d3748;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 42px;
        }

        .geographic-select:hover {
          border-color: #4E5859;
          box-shadow: 0 0 0 1px rgba(78, 88, 89, 0.1);
        }

        .geographic-select:focus {
          outline: none;
          border-color: #4E5859;
          box-shadow: 0 0 0 3px rgba(78, 88, 89, 0.1);
        }

        .geographic-filters-loading {
          color: #96856F;
          font-style: italic;
          padding: 8px 12px;
        }

        @media (max-width: 768px) {
          .geographic-filters {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          
          .geographic-filter {
            min-width: 100%;
          }
        }

        /* ✅ Modal customizado removido - usando SimpleModal padrão */
      `}</style>

      {/* Indicador de Status Geral */}
      {(isLoading || isUpdating || loadingInsights || loadingCampaigns || loadingAdsets || loadingAds || loadingPeriodSales) && (
        <div className="global-status-indicator">
          <div className="status-content">
            <span className="status-icon">🔄</span>
            <span className="status-text">
              {isLoading ? 'Carregando dados do dashboard...' :
               isUpdating ? 'Atualizando dados gerais...' :
               loadingInsights ? 'Aplicando filtros de campanhas...' :
               loadingCampaigns ? 'Carregando campanhas...' :
               loadingAdsets ? 'Carregando conjuntos de anúncios...' :
               loadingAds ? 'Carregando anúncios...' :
               loadingPeriodSales ? 'Carregando dados de vendas do período...' : 'Atualizando...'}
            </span>
          </div>
        </div>
      )}

      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Marketing</h2>
          <div className="dashboard-controls">
            <div className="filters-group">
              <MultiSelectFilter 
                label="Fonte"
                options={sourceOptions}
                selectedValues={selectedSource ? (selectedSource.includes(',') ? selectedSource.split(',') : [selectedSource]) : []}
                onChange={(values) => setSelectedSource(values.length === 0 ? '' : values.join(','))}
                placeholder="Todas as Fontes"
              />

              {/* Filtros Geográficos - TEMPORARIAMENTE DESABILITADO */}
              {/* <GeographicFilters /> */}

              {/* Filtro de Campanhas Facebook */}
              {showCampaignFilter && (
                <div className="multi-select-container">
                  <label className="filter-label">Campanhas:</label>
                  <div className="multi-select-wrapper">
                    {loadingCampaigns ? (
                      <div className="campaign-loading">Carregando campanhas...</div>
                    ) : (
                      <div ref={dropdownRef} style={{ width: '100%' }}>
                        <button 
                          className="multi-select-button"
                          onClick={() => setShowDropdown(!showDropdown)}
                        >
                          <span className="multi-select-text">
                            {selectedCampaigns.length === 0 
                              ? 'Selecionar campanhas' 
                              : selectedCampaigns.length === campaigns.length 
                                ? `Todas as campanhas (${selectedCampaigns.length})`
                                : `${selectedCampaigns.length} campanha(s) selecionada(s)`}
                          </span>
                          <span className={`multi-select-arrow ${showDropdown ? 'open' : ''}`}>▼</span>
                        </button>
                        
                        {showDropdown && (
                          <div className="multi-select-dropdown">
                            <div className="campaign-search">
                              <input
                                type="text"
                                placeholder="Buscar campanhas..."
                                value={campaignFilters.searchTerm}
                                onChange={(e) => setCampaignFilters({
                                  ...campaignFilters,
                                  searchTerm: e.target.value
                                })}
                                className="campaign-search-input"
                              />
                            </div>
                            
                            <div className="campaign-actions">
                              <button 
                                className="select-all-btn"
                                onClick={() => {
                                  if (selectedCampaigns.length === campaigns.length) {
                                    // Se todas estão selecionadas, desmarcar todas (SEM recarregar dados)
                                    setSelectedCampaigns([]);
                                    const newFilters = {
                                      ...campaignFilters,
                                      campaignIds: []
                                    };
                                    setCampaignFilters(newFilters);
                                    setCampaignInsights(null); // Limpar insights apenas
                                  } else {
                                    // Se nem todas estão selecionadas, selecionar todas
                                    const allCampaignIds = campaigns.map(c => c.id);
                                    setSelectedCampaigns(allCampaignIds);
                                  }
                                }}
                              >
                                {selectedCampaigns.length === campaigns.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                              </button>
                              <button 
                                className="clear-all-btn"
                                onClick={() => {
                                  // Limpar sem recarregar dados
                                  setSelectedCampaigns([]);
                                  setSelectedAdsets([]); // Limpar adsets também
                                  setSelectedAds([]); // Limpar ads também
                                }}
                              >
                                Limpar
                              </button>
                            </div>
                            
                            <div className="campaign-list">
                              {campaigns
                                .filter(campaign => 
                                  !campaignFilters.searchTerm || 
                                  campaign.name.toLowerCase().includes(campaignFilters.searchTerm.toLowerCase())
                                )
                                .map(campaign => (
                                  <label key={campaign.id} className="campaign-item">
                                    <input
                                      type="checkbox"
                                      checked={selectedCampaigns.includes(campaign.id)}
                                      onChange={() => handleCampaignSelect(campaign.id)}
                                    />
                                    <span className="campaign-name" title={campaign.name}>{campaign.name}</span>
                                    <span className={`campaign-status ${campaign.status?.toLowerCase()}`}>
                                      {campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                                    </span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filtro de Conjuntos de Anúncios */}
              <div className="multi-select-container">
                <label className="filter-label">Conjuntos de Anúncios:</label>
                <div className="multi-select-wrapper">
                  {loadingAdsets ? (
                    <div className="adset-loading">Carregando conjuntos...</div>
                  ) : (
                    <div ref={adsetDropdownRef} style={{ width: '100%' }}>
                      <button 
                        className="multi-select-button"
                        onClick={() => setShowAdsetDropdown(!showAdsetDropdown)}
                      >
                        <span className="multi-select-text">
                          {selectedAdsets.length === 0 
                            ? `Selecionar conjuntos ${getFilteredAdsets.length < adsets.length ? `(${getFilteredAdsets.length} disponíveis)` : ''}` 
                            : selectedAdsets.length === getFilteredAdsets.length 
                              ? `Todos os conjuntos (${selectedAdsets.length})`
                              : `${selectedAdsets.length} de ${getFilteredAdsets.length} selecionado(s)`}
                        </span>
                        <span className={`multi-select-arrow ${showAdsetDropdown ? 'open' : ''}`}>▼</span>
                      </button>
                      
                      {showAdsetDropdown && (
                        <div className="multi-select-dropdown">
                          <div className="adset-actions">
                            <button 
                              className="select-all-btn"
                              onClick={() => {
                                const filteredIds = getFilteredAdsets.map(a => a.id);
                                if (selectedAdsets.length === filteredIds.length) {
                                  setSelectedAdsets([]);
                                  const newFilters = {
                                    ...campaignFilters,
                                    adsetIds: []
                                  };
                                  setCampaignFilters(newFilters);
                                } else {
                                  setSelectedAdsets(filteredIds);
                                }
                              }}
                            >
                              {selectedAdsets.length === getFilteredAdsets.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </button>
                            <button 
                              className="clear-all-btn"
                              onClick={() => {
                                setSelectedAdsets([]);
                              }}
                            >
                              Limpar
                            </button>
                          </div>
                          
                          <div className="adset-list">
                            {getFilteredAdsets.map(adset => (
                              <label key={adset.id} className="adset-item">
                                <input
                                  type="checkbox"
                                  checked={selectedAdsets.includes(adset.id)}
                                  onChange={() => handleAdsetSelect(adset.id)}
                                />
                                <span className="adset-name" title={adset.name}>{adset.name}</span>
                                <span className={`adset-status ${adset.status?.toLowerCase()}`}>
                                  {adset.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Filtro de Anúncios */}
              <div className="multi-select-container">
                <label className="filter-label">Anúncios:</label>
                <div className="multi-select-wrapper">
                  {loadingAds ? (
                    <div className="ad-loading">Carregando anúncios...</div>
                  ) : (
                    <div ref={adDropdownRef} style={{ width: '100%' }}>
                      <button 
                        className="multi-select-button"
                        onClick={() => setShowAdDropdown(!showAdDropdown)}
                      >
                        <span className="multi-select-text">
                          {selectedAds.length === 0 
                            ? `Selecionar anúncios ${getFilteredAds.length < ads.length ? `(${getFilteredAds.length} disponíveis)` : ''}` 
                            : selectedAds.length === getFilteredAds.length 
                              ? `Todos os anúncios (${selectedAds.length})`
                              : `${selectedAds.length} de ${getFilteredAds.length} selecionado(s)`}
                        </span>
                        <span className={`multi-select-arrow ${showAdDropdown ? 'open' : ''}`}>▼</span>
                      </button>
                      
                      {showAdDropdown && (
                        <div className="multi-select-dropdown">
                          <div className="ad-actions">
                            <button 
                              className="select-all-btn"
                              onClick={() => {
                                const filteredIds = getFilteredAds.map(a => a.id);
                                if (selectedAds.length === filteredIds.length) {
                                  setSelectedAds([]);
                                  const newFilters = {
                                    ...campaignFilters,
                                    adIds: []
                                  };
                                  setCampaignFilters(newFilters);
                                } else {
                                  setSelectedAds(filteredIds);
                                }
                              }}
                            >
                              {selectedAds.length === getFilteredAds.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                            </button>
                            <button 
                              className="clear-all-btn"
                              onClick={() => {
                                setSelectedAds([]);
                              }}
                            >
                              Limpar
                            </button>
                          </div>
                          
                          <div className="ad-list">
                            {getFilteredAds.map(ad => (
                              <label key={ad.id} className="ad-item">
                                <input
                                  type="checkbox"
                                  checked={selectedAds.includes(ad.id)}
                                  onChange={() => handleAdSelect(ad.id)}
                                />
                                <span className="ad-name" title={ad.name}>{ad.name}</span>
                                <span className={`ad-status ${ad.status?.toLowerCase()}`}>
                                  {ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão Aplicar Filtros - Mostrar apenas quando há mudanças nos filtros */}
              {((selectedCampaigns.length > 0 && selectedCampaigns.length < campaigns.length) || 
                selectedAdsets.length > 0 || 
                selectedAds.length > 0) && (
                <button 
                  className="apply-filters-btn"
                  onClick={handleApplyFilters}
                  disabled={loadingInsights}
                  title="Aplicar filtros selecionados"
                >
                  {loadingInsights ? 'Aplicando...' : 'Aplicar Filtros'}
                </button>
              )}
            </div>
            <div className="period-controls" style={{ position: 'relative' }}>
              <div className="period-selector">
                <button 
                  className={period === 'current_month' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('current_month')}
                >
                  Mês Atual
                </button>
                <button 
                  className={period === '7d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('7d')}
                >
                  7 Dias
                </button>
                <button 
                  className={period === '30d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('30d')}
                >
                  30 Dias
                </button>
                <button 
                  className={period === '60d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('60d')}
                >
                  60 Dias
                </button>
                <button 
                  className={period === '90d' ? 'active' : ''} 
                  onClick={() => handlePeriodChange('90d')}
                >
                  90 Dias
                </button>
                <button 
                  className={period === 'custom' ? 'active' : ''} 
                  onClick={() => {
                    console.log('🔍 Clicando em Personalizado no dashboard de marketing');
                    handlePeriodChange('custom');
                  }}
                >
                  Personalizado
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QUADRO 1: Métricas Principais */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group">
          <div className="card-title">Métricas Principais</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="TOTAL DE LEADS"
              value={filteredData.totalLeads || 0}
              trendValue={25.8}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="TOTAL DE VISITAS AO PERFIL"
              value={filteredData?.profileVisits?.toLocaleString() || "0"}
              trendValue={null} // Trend não disponível ainda
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="CONVERSAS PELO WHATSAPP"
              value={filteredData?.whatsappConversations?.toLocaleString() || "0"}
              trendValue={null} // Trend não disponível ainda
              color={COLORS.success}
            />
          </div>
        </div>
      </div>

      {/* QUADRO 2: Métricas de Performance */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">
            {campaignInsights && selectedCampaigns.length > 0 ? (
              <>
                Métricas de Performance - {selectedCampaigns.length} Campanha(s)
                {selectedAdsets.length > 0 && (
                  <>, {selectedAdsets.filter(adsetId => {
                    const adset = adsets.find(a => a.id === adsetId);
                    return adset && selectedCampaigns.includes(adset.campaign_id);
                  }).length} Conjunto(s) de Anúncios</>
                )}
                {selectedAds.length > 0 && (
                  <>, {selectedAds.length} Anúncio(s)</>
                )}
                {' '}Filtrada(s)
              </>
            ) : (
              <>
                Métricas de Performance
                <span className="unfiltered-badge">📈 DADOS GERAIS</span>
              </>
            )}
            {loadingInsights && <span className="loading-indicator"> 🔄 Atualizando...</span>}
          </div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="ALCANCE"
              value={(facebookMetrics.reach || 0).toLocaleString()}
              trendValue={6.8}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="IMPRESSÕES"
              value={(facebookMetrics.impressions || 0).toLocaleString()}
              trendValue={12.4}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="CUSTO POR LEAD"
              value={`R$ ${facebookMetrics.costPerLead?.toFixed(2) || '0,00'}`}
              trendValue={-15.5}
              color={COLORS.tertiary}
            />
            <MiniMetricCardWithTrend
              title="CUSTO POR CLIQUE"
              value={`R$ ${facebookMetrics.cpc?.toFixed(2) || '0,00'}`}
              trendValue={-8.2}
              color={COLORS.dark}
            />
            <MiniMetricCardWithTrend
              title="CPM"
              value={`R$ ${(facebookMetrics.cpm || 0).toFixed(2)}`}
              trendValue={-5.7}
              color={COLORS.warning}
            />
            <MiniMetricCardWithTrend
              title="CLIQUES"
              value={(facebookMetrics.clicks || 0).toLocaleString()}
              trendValue={18.9}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="CLIQUES NO LINK"
              value={(facebookMetrics.inlineLinkClicks || 0).toLocaleString()}
              trendValue={22.7}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="VALOR INVESTIDO"
              value={`R$ ${(facebookMetrics.spend || 0).toFixed(2)}`}
              trendValue={-3.2}
              color={COLORS.secondary}
            />
          </div>
        </div>
      </div>

      {/* QUADRO 3: Métricas de Engajamento */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group">
          <div className="card-title">Métricas de Engajamento</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="ENGAJAMENTO COM A PÁGINA"
              value={(facebookMetrics.engagement?.pageEngagement || 0).toLocaleString()}
              trendValue={14.3}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="REAÇÕES"
              value={(facebookMetrics.engagement?.likes || 0).toLocaleString()}
              trendValue={9.6}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="COMENTÁRIOS"
              value={(facebookMetrics.engagement?.comments || 0).toLocaleString()}
              trendValue={-2.1}
              color={COLORS.warning}
            />
          </div>
        </div>
      </div>

      {/* Linha 3: Gráficos - Primeira linha com 2 gráficos pie */}
      <div className="dashboard-row">
        {/* Status dos Leads CRM - movido do dashboard de vendas */}
        <div className="card card-lg">
          <div className="card-title">
            Status dos Leads CRM
            {loadingPeriodSales && <span className="loading-indicator"> - Carregando...</span>}
          </div>
          <CompactChart 
            type="pie" 
            data={(() => {
              // ✅ CORREÇÃO IMPLEMENTADA: Conforme análise detalhada
              // 
              // PROBLEMA ANTERIOR:
              // - Buscava stage específico "Leads em Remarketing" que NÃO existe
              // - Resultado era sempre 0, dados incorretos
              //
              // SOLUÇÃO IMPLEMENTADA:
              // - Mapeia stages existentes que representam remarketing
              // - Soma múltiplos stages: "Lead Novo" + "Contato Feito" + "Acompanhamento"
              // - Dados reais esperados: ~87 leads em remarketing
              
              // ✅ USAR DADOS DO PERÍODO: Trocar salesData por periodSalesData para respeitar filtro de período
              
              // 1. Leads em Negociação (usar dados do período)
              const leadsEmNegociacao = periodSalesData?.activeLeads || 
                (periodSalesData?.leadsByUser ? periodSalesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0);
              
              // 2. ✅ CORREÇÃO: Leads em Remarketing - usar dados do período
              const leadsEmRemarketing = getLeadsEmRemarketing(periodSalesData?.pipelineStatus);
              
              // 3. Leads Reativados (manter como 0 por enquanto)
              const leadsReativados = 0;
              
              // Debug: Comparação antes/depois da correção
              const antesCorrecao = periodSalesData?.pipelineStatus?.find(stage => stage.name === 'Leads em Remarketing')?.value || 0;
              
              console.log('🎯 Correção CRM Leads - ANTES vs DEPOIS:', {
                antes: {
                  leadsEmRemarketing: antesCorrecao,
                  metodo: 'Busca stage específico "Leads em Remarketing"'
                },
                depois: {
                  leadsEmNegociacao,
                  leadsEmRemarketing,
                  leadsReativados,
                  metodo: 'Soma stages: Lead Novo + Contato Feito + Acompanhamento'
                },
                detalhes: {
                  stagesDisponiveis: periodSalesData?.pipelineStatus?.map(s => `${s.name}: ${s.value}`) || [],
                  stagesUsados: periodSalesData?.pipelineStatus?.filter(stage => ["Lead Novo", "Contato Feito", "Acompanhamento"].includes(stage.name))?.map(s => `${s.name}: ${s.value}`) || [],
                  diferencaEncontrada: leadsEmRemarketing - antesCorrecao
                }
              });
              
              return [
                {
                  name: 'Leads em Negociação',
                  value: leadsEmNegociacao
                },
                {
                  name: 'Leads em Remarketing',
                  value: leadsEmRemarketing
                },
                {
                  name: 'Leads Reativados',
                  value: leadsReativados
                }
              ].filter(item => item.value > 0);
            })()} 
            config={{ 
              name: 'Status dos Leads CRM',
              colors: [COLORS.primary, COLORS.secondary, COLORS.success]
            }}
            style={{ height: getChartHeight('medium') }}
            loading={loadingPeriodSales}
          />
        </div>

        {filteredData.leadsBySource && filteredData.leadsBySource.length > 0 && (
          <div className="card card-lg">
            <div className="card-title">Leads por Fonte</div>
            <CompactChart 
              type="pie" 
              data={filteredData.leadsBySource} 
              config={{ name: 'Leads por Fonte', colors: [COLORS.primary, COLORS.secondary, COLORS.tertiary, COLORS.success, COLORS.warning] }}
              style={{ height: getChartHeight('medium') }}
              loading={false}
            />
          </div>
        )}
      </div>

      {/* Linha 4: Segunda linha com gráfico de barras */}
      {filteredData.leadsByAd && filteredData.leadsByAd.length > 0 && (
        <div className="dashboard-row">
          <div className="card card-full">
            <div className="card-title">Leads por Anúncio</div>
            <CompactChart 
              type="bar" 
              data={filteredData.leadsByAd} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.tertiary }}
              style={{ height: getChartHeight('medium') }}
              loading={false}
            />
          </div>
        </div>
      )}

      {/* Linha 5: Leads por Corretor */}
      {((sortedSalesChartsData.sortedLeadsData && sortedSalesChartsData.sortedLeadsData.length > 0) || loadingPeriodSales) && (
        <div className="dashboard-row">
          <div className="card card-full">
            <div className="card-title">
              Leads criados no período
              {loadingPeriodSales && <span className="loading-indicator"> - Carregando...</span>}
            </div>
            <CompactChart 
              type="bar" 
              data={sortedSalesChartsData.sortedLeadsData || []} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
              style={{ height: getChartHeight('medium') }}
              loading={loadingPeriodSales}
              onBarClick={(corretorName) => openModalByCorretor('leads', corretorName)}
            />
          </div>
        </div>
      )}

      {/* Linha 6: Rank Corretores - Reuniões */}
      {((sortedSalesChartsData.sortedMeetingsData && sortedSalesChartsData.sortedMeetingsData.length > 0) || loadingPeriodSales) && (
        <div className="dashboard-row">
          <div className="card card-full">
            <div className="card-title">
              Rank Corretores - Reunião
              {loadingPeriodSales && <span className="loading-indicator"> - Carregando...</span>}
            </div>
            <CompactChart 
              type="bar" 
              data={sortedSalesChartsData.sortedMeetingsData || []} 
              config={{ xKey: 'name', yKey: 'meetingsHeld', color: COLORS.secondary }}
              style={{ height: getChartHeight('medium') }}
              loading={loadingPeriodSales}
              onBarClick={(corretorName) => openModalByCorretor('meetings', corretorName)}
            />
          </div>
        </div>
      )}

      {/* Linha 7: Tendência e métricas do Facebook */}
      <div className="dashboard-row">
        {filteredData.metricsTrend && filteredData.metricsTrend.length > 0 && (
          <div className="card card-lg">
            <div className="card-title">Tendência de Leads</div>
            <CompactChart 
              type="line" 
              data={filteredData.metricsTrend} 
              config={{ xKey: 'month', yKey: 'leads', color: COLORS.primary }}
              style={{ height: getChartHeight('large') }}
              loading={false}
            />
          </div>
        )}
      </div>

      {/* Linha 7: Demografia - Gênero */}
      <div className="dashboard-row">
        <div className="card card-lg">
          <div className="card-title">
            Leads por Gênero
            {loadingDemographics && <span className="loading-indicator"> - Carregando...</span>}
          </div>
          <CompactChart 
            type="pie" 
            data={(() => {
              console.log('🎯 Estado demographicData no gráfico:', {
                genderDataLength: demographicData.genderData.length,
                genderData: demographicData.genderData,
                willShowData: demographicData.genderData.length > 0
              });
              return demographicData.genderData.length > 0 ? demographicData.genderData : [
                { name: 'Sem dados', value: 1 }
              ];
            })()} 
            config={{ 
              name: 'Leads por Gênero',
              colors: demographicData.genderData.length > 0 ? 
                [COLORS.primary, COLORS.secondary, COLORS.light] : 
                [COLORS.light]
            }}
            style={{ height: getChartHeight('medium') }}
            loading={loadingDemographics}
          />
        </div>
      </div>

      {/* Linha 8: Top Cidades - TEMPORARIAMENTE DESABILITADO */}
      {/* 
      <div className="dashboard-row">
        <div className="card card-lg">
          <div className="card-title">
            Top Cidades por Leads
            Loading indicator here...
          </div>
          <CityChart />
        </div>
      </div> 
      */}
      
      {/* ✅ Modal de Período Personalizado - CORRIGIDO */}
      {/* Agora usa SimpleModal (igual ao dashboard de vendas) ao invés do modal customizado */}
      <SimpleModal
        isOpen={showCustomPeriod}
        onClose={() => {
          setShowCustomPeriod(false);
        }}
      >
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Campos de Data com Design Melhorado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>📅</span> Data Inicial
              </label>
              <input
                type="date"
                value={customPeriod?.startDate || ''}
                onChange={(e) => setCustomPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '2px solid #e2e8f0', 
                  width: '100%',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#fafbfc'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4E5859';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(78, 88, 89, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = '#fafbfc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#4a5568',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🏁</span> Data Final
              </label>
              <input
                type="date"
                value={customPeriod?.endDate || ''}
                onChange={(e) => setCustomPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '8px', 
                  border: '2px solid #e2e8f0', 
                  width: '100%',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#fafbfc'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4E5859';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(78, 88, 89, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = '#fafbfc';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Preview do Período Selecionado */}
          {customPeriod?.startDate && customPeriod?.endDate && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#0369a1'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📊</span> Período Selecionado
              </div>
              <div>
                {new Date(customPeriod.startDate + 'T12:00:00').toLocaleDateString('pt-BR')} até {' '}
                {new Date(customPeriod.endDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                {' '}({Math.ceil((new Date(customPeriod.endDate + 'T12:00:00') - new Date(customPeriod.startDate + 'T12:00:00')) / (1000 * 60 * 60 * 24)) + 1} dias)
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
            <button 
              onClick={() => setShowCustomPeriod(false)}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: '#f7fafc', 
                color: '#4a5568',
                border: '2px solid #e2e8f0', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#edf2f7';
                e.target.style.borderColor = '#cbd5e0';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f7fafc';
                e.target.style.borderColor = '#e2e8f0';
              }}
            >
              Cancelar
            </button>
            <button 
              onClick={() => {
                console.log('🎯 Marketing - Aplicando período personalizado:', {
                  customPeriod,
                  startDate: customPeriod?.startDate,
                  endDate: customPeriod?.endDate
                });
                
                if (!customPeriod?.startDate || !customPeriod?.endDate) {
                  alert('Por favor, selecione ambas as datas');
                  return;
                }
                
                const startDate = new Date(customPeriod.startDate + 'T12:00:00');
                const endDate = new Date(customPeriod.endDate + 'T12:00:00');
                
                if (startDate > endDate) {
                  alert('A data inicial deve ser anterior à data final');
                  return;
                }
                
                const diffInDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                if (diffInDays > 365) {
                  alert('O período não pode ser maior que 365 dias');
                  return;
                }
                
                console.log('✅ Marketing - Período válido, aplicando:', {
                  periodo: { startDate: customPeriod.startDate, endDate: customPeriod.endDate },
                  diasCalculados: diffInDays,
                  estadoAntesDeAplicar: {
                    selectedCampaigns: selectedCampaigns.length,
                    selectedAdsets: selectedAdsets.length,
                    selectedAds: selectedAds.length,
                    campaigns: campaigns.length,
                    adsets: adsets.length,
                    ads: ads.length
                  }
                });
                
                // ✅ Preservar seleções antes de aplicar período
                preserveDropdownSelections();
                
                applyCustomPeriod();
                
                // Debug: Verificar estado após aplicar e restaurar se necessário
                setTimeout(() => {
                  console.log('🔍 Estado após aplicar período personalizado:', {
                    selectedCampaigns: selectedCampaigns.length,
                    selectedAdsets: selectedAdsets.length,
                    selectedAds: selectedAds.length,
                    campaigns: campaigns.length,
                    adsets: adsets.length,
                    ads: ads.length
                  });
                  
                  // Se as seleções foram perdidas, tentar restaurar
                  if (selectedCampaigns.length === 0 && campaigns.length > 0) {
                    console.log('🔧 Detectado reset dos dropdowns, tentando restaurar...');
                    restoreDropdownSelections();
                  }
                }, 1000);
              }}
              style={{ 
                padding: '12px 24px', 
                background: 'linear-gradient(135deg, #4E5859 0%, #96856F 100%)', 
                color: 'white',
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(78, 88, 89, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #3a4344 0%, #7a6b5a 100%)';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(78, 88, 89, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, #4E5859 0%, #96856F 100%)';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(78, 88, 89, 0.3)';
              }}
            >
              Aplicar Período
            </button>
          </div>
        </div>
      </SimpleModal>

      {/* ✅ Modal para tabelas detalhadas - IDÊNTICO ao DashboardSales */}
      <DetailModal
        isOpen={modalStateRef.current.isOpen}
        onClose={closeModal}
        type={modalStateRef.current.type}
        title={modalStateRef.current.title}
        isLoading={modalStateRef.current.isLoading}
        data={modalStateRef.current.data}
        error={modalStateRef.current.error}
      />
    </div>
  );
}

export default DashboardMarketing;