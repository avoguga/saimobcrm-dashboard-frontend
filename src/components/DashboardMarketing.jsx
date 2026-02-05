import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import * as echarts from 'echarts';
import Select from 'react-select';
import SimpleModal from './SimpleModal';
import DetailModal from './common/DetailModal';
import { COLORS } from '../constants/colors';
import GranularAPI from '../services/granularAPI';
import './Dashboard.css';

function DashboardMarketing({ period, windowSize, selectedSource, data, salesData, isLoading, isUpdating, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod, onDataRefresh }) {
  const [marketingData, setMarketingData] = useState(data);
  const [, setFilteredData] = useState(data);

  // Estados para dados do Facebook
  const [, setFacebookData] = useState(null);
  const [facebookError] = useState(null);

  // Estados para filtros do Facebook
  const [facebookFilters, setFacebookFilters] = useState({
    campaigns: '', // string separada por vírgula: "id1,id2,id3"
    adsets: '',    // string separada por vírgula: "id1,id2,id3"
    ads: ''        // string separada por vírgula: "id1,id2,id3"
  });
  const [facebookCampaigns, setFacebookCampaigns] = useState([]);
  const [facebookAdsets, setFacebookAdsets] = useState([]);
  const [facebookAds, setFacebookAds] = useState([]);

  // Converter campanhas para formato React-Select
  const campaignOptions = useMemo(() => {
    return facebookCampaigns.map(campaign => ({
      value: campaign.id,
      label: `${campaign.name} ${campaign.status === 'PAUSED' ? '(Pausada)' : ''}`.trim()
    }));
  }, [facebookCampaigns]);

  const adsetOptions = useMemo(() => {
    return facebookAdsets.map(adset => ({
      value: adset.id,
      label: `${adset.name} ${adset.status === 'PAUSED' ? '(Pausado)' : ''}`.trim()
    }));
  }, [facebookAdsets]);

  const adOptions = useMemo(() => {
    return facebookAds.map(ad => ({
      value: ad.id,
      label: `${ad.name} ${ad.status === 'PAUSED' ? '(Pausado)' : ''}`.trim()
    }));
  }, [facebookAds]);

  // Converter valores dos filtros para formato do React-Select
  const selectedCampaignValues = useMemo(() => {
    if (!facebookFilters.campaigns) return [];
    return facebookFilters.campaigns.split(',').map(value => 
      campaignOptions.find(opt => opt.value === value.trim())
    ).filter(Boolean);
  }, [facebookFilters.campaigns, campaignOptions]);

  const selectedAdsetValues = useMemo(() => {
    if (!facebookFilters.adsets) return [];
    return facebookFilters.adsets.split(',').map(value => 
      adsetOptions.find(opt => opt.value === value.trim())
    ).filter(Boolean);
  }, [facebookFilters.adsets, adsetOptions]);

  const selectedAdValues = useMemo(() => {
    if (!facebookFilters.ads) return [];
    return facebookFilters.ads.split(',').map(value => 
      adOptions.find(opt => opt.value === value.trim())
    ).filter(Boolean);
  }, [facebookFilters.ads, adOptions]);

  
  // Estados para dados demográficos
  const [, setDemographicData] = useState({
    genderData: [],
    cityData: []
  });

  // Estados de loading
  const [loadingGeographics, setLoadingGeographics] = useState(false);

  // Estado do modal usando ref
  const modalStateRef = useRef({
    isOpen: false,
    type: '',
    title: '',
    isLoading: false,
    data: [],
    error: null
  });
  
  const [, setModalForceUpdate] = useState(0);
  const [followerModalOpen, setFollowerModalOpen] = useState(false);

  // Estados para dados geográficos
  const [, setGeographicData] = useState({
    cities: [],
    regions: [],
    countries: [],
    selectedFilters: {
      city: null,
      region: null,
      country: null
    }
  });

  // Constantes de responsividade
  const isMobile = windowSize.width < 768;


  // Load real data from API
  useEffect(() => {
    console.log('🔍 Effect data mudou:', {
      hasData: !!data,
      period,
      dataKeys: data ? Object.keys(data) : [],
      hasGenderData: !!(data && data.genderData),
      genderDataLength: data?.genderData?.length || 0,
      genderDataSample: data?.genderData
    });
    
    // Use real gender data if available
    if (data && data.genderData && Array.isArray(data.genderData)) {
      console.log('📊 Usando dados de gênero reais:', data.genderData);
      setDemographicData(prev => ({
        ...prev,
        genderData: data.genderData
      }));
    } else {
      console.log('⚠️ Dados de gênero não disponíveis');
    }

    setMarketingData(data);
    setFilteredData(data);
  }, [data]);

  // Load geographic data
  const loadGeographicData = useCallback(async () => {
    if (loadingGeographics) return;

    try {
      setLoadingGeographics(true);

      // Dados geográficos reais virão da API no futuro
      const geoData = {
        cities: [],
        regions: [],
        countries: []
      };
      console.log('📍 Dados geográficos carregados:', geoData);

      if (geoData) {
        setGeographicData(prev => ({
          ...prev,
          cities: geoData.cities || [],
          regions: geoData.regions || [],
          countries: geoData.countries || []
        }));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados geográficos:', error);
    } finally {
      setLoadingGeographics(false);
    }
  }, [period, loadingGeographics]);


  // Processar dados dos gráficos de vendas usando dados reais do salesData
  const sortedSalesChartsData = useMemo(() => {
    if (!salesData?._rawTablesData) {
      return {
        sortedLeadsData: [],
        sortedMeetingsData: []
      };
    }

    const tablesData = salesData._rawTablesData;

    // Buscar todos os leads
    let allLeads = [
      ...(tablesData.leadsDetalhes || []),
      ...(tablesData.organicosDetalhes || [])
    ];

    // Buscar todas as reuniões
    let allMeetings = [
      ...(tablesData.reunioesDetalhes || []),
      ...(tablesData.reunioesOrganicasDetalhes || [])
    ];

    // Filtrar por fonte selecionada
    if (selectedSource && selectedSource !== 'todos') {
      allLeads = allLeads.filter(l =>
        (l.Fonte || '').toLowerCase() === selectedSource.toLowerCase()
      );
      allMeetings = allMeetings.filter(m =>
        (m.Fonte || '').toLowerCase() === selectedSource.toLowerCase()
      );
    }

    // Processar leads por corretor
    const leadsByCorretor = {};
    allLeads.forEach(lead => {
      const corretor = lead.Corretor || 'Sem Corretor';
      if (!leadsByCorretor[corretor]) {
        leadsByCorretor[corretor] = 0;
      }
      leadsByCorretor[corretor]++;
    });

    // Processar reuniões por corretor
    const meetingsByCorretor = {};
    allMeetings.forEach(meeting => {
      const corretor = meeting.Corretor || 'Sem Corretor';
      if (!meetingsByCorretor[corretor]) {
        meetingsByCorretor[corretor] = 0;
      }
      meetingsByCorretor[corretor]++;
    });

    // Converter para formato de gráfico
    const sortedLeadsData = Object.entries(leadsByCorretor)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const sortedMeetingsData = Object.entries(meetingsByCorretor)
      .map(([name, meetingsHeld]) => ({ name, meetingsHeld }))
      .sort((a, b) => b.meetingsHeld - a.meetingsHeld)
      .slice(0, 8);

    return {
      sortedLeadsData,
      sortedMeetingsData
    };
  }, [salesData?._rawTablesData, selectedSource]);

  // Modal functions
  const openModal = useCallback(async (type, title) => {
    const typeMap = {
      'leads': `Leads de ${selectedSource || 'Todas as Fontes'}`,
      'reunioes': 'Reuniões Realizadas'
    };

    modalStateRef.current = {
      isOpen: true,
      type: type,
      title: typeMap[type] || title,
      isLoading: true,
      data: [],
      error: null
    };
    setModalForceUpdate(prev => prev + 1);

    try {
      const extraParams = {};

      // Usar a mesma lógica dos gráficos: priorizar start_date/end_date sobre days
      if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
        extraParams.start_date = customPeriod.startDate;
        extraParams.end_date = customPeriod.endDate;
      } else if (period === 'current_month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayStr = firstDay.toISOString().split('T')[0];
        const todayStr = now.toISOString().split('T')[0];

        extraParams.start_date = firstDayStr;
        extraParams.end_date = todayStr;
      } else if (period === 'previous_month') {
        const now = new Date();
        const firstDayPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        extraParams.start_date = firstDayPreviousMonth.toISOString().split('T')[0];
        extraParams.end_date = lastDayPreviousMonth.toISOString().split('T')[0];
      } else if (period === 'year') {
        const now = new Date();
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

        extraParams.start_date = firstDayOfYear.toISOString().split('T')[0];
        extraParams.end_date = now.toISOString().split('T')[0];
      } else {
        // Para períodos predefinidos (7d), usar days
        const periodToDays = {
          '7d': 7
        };
        extraParams.days = periodToDays[period] || 30;
      }

      // Usar dados já carregados do salesData quando disponíveis
      let tablesData;

      const currentData = salesData?._rawTablesData;

      if (currentData) {
        // Usar os dados já carregados - eles já estão com o período correto
        tablesData = currentData;
      } else {
        // Só fazer requisição se não temos dados carregados
        const KommoAPI = (await import('../services/api')).default;
        tablesData = await KommoAPI.getDetailedTables('', '', extraParams);
      }

      const dataMap = {
        'leads': [
          ...(tablesData.leadsDetalhes || []),
          ...(tablesData.organicosDetalhes || [])
        ],
        'reunioes': [
          ...(tablesData.reunioesDetalhes || []),
          ...(tablesData.reunioesOrganicasDetalhes || [])
        ]
      };

      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        data: dataMap[type] || [],
        error: null
      };
      setModalForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error(`❌ Erro ao carregar dados do modal ${type}:`, error);
      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        data: [],
        error: `Erro ao carregar dados: ${error.message}`
      };
      setModalForceUpdate(prev => prev + 1);
    }
  }, [period, customPeriod, selectedSource, salesData]);

  const closeModal = useCallback(() => {
    modalStateRef.current = {
      isOpen: false,
      type: '',
      title: '',
      isLoading: false,
      data: [],
      error: null
    };
    setModalForceUpdate(prev => prev + 1);
  }, []);

  // Load data effects
  useEffect(() => {
    loadGeographicData();
  }, [loadGeographicData]);

  // Filter data by selected source
  useEffect(() => {
    if (!marketingData) return;

    if (selectedSource === 'todos') {
      setFilteredData(marketingData);
    } else {
      const filteredLeadsBySource = marketingData.leadsBySource?.filter(source => 
        source.name.toLowerCase() === selectedSource.toLowerCase()
      );

      const selectedSourceLeads = marketingData.leadsBySource?.find(source => 
        source.name.toLowerCase() === selectedSource.toLowerCase()
      );

      setFilteredData({
        ...marketingData,
        leadsBySource: filteredLeadsBySource,
        totalLeads: selectedSourceLeads?.value || 0,
        activeLeads: selectedSourceLeads?.active || 0,
        leadsByAd: marketingData.leadsByAd?.filter(ad => 
          ad.source?.toLowerCase() === selectedSource.toLowerCase()
        ) || marketingData.leadsByAd || []
      });
    }
  }, [marketingData, selectedSource]);






  // Dados do Facebook agora vêm através do loadMarketingDashboard - sem chamadas extras

  // Carregar estrutura do Facebook a partir dos dados de marketing
  const loadFacebookCampaigns = useCallback(() => {
    console.log('🔍 loadFacebookCampaigns chamado:', {
      hasData: !!data,
      hasFacebookStructure: !!(data?.facebookStructure),
      hasCampaigns: !!(data?.facebookStructure?.campaigns),
      campaignsCount: data?.facebookStructure?.campaigns?.length || 0,
      currentFilters: facebookFilters.campaigns
    });

    // Estrutura já vem carregada nos dados de marketing
    if (data && data.facebookStructure) {
      const campaigns = data.facebookStructure.campaigns || [];

      console.log('📋 Campanhas encontradas:', {
        total: campaigns.length,
        campaigns: campaigns.map(c => ({ id: c.id, name: c.name, status: c.status }))
      });

      setFacebookCampaigns(campaigns);

      // Carregar adsets da estrutura
      if (data.facebookStructure.adsets) {
        setFacebookAdsets(data.facebookStructure.adsets.map(adset => ({
          id: adset.id,
          name: adset.name,
          status: adset.status,
          ads_count: adset.ads_count || adset.ads?.length || 0,
          ads: adset.ads || []
        })));
      }

      // Não auto-selecionar nada - filtros vazios = mostrar todas as campanhas
      console.log('📋 Campanhas carregadas - filtros permanecem vazios (padrão = todas as campanhas):', {
        campanhasDisponiveis: campaigns.length,
        filtrosAtuais: facebookFilters
      });
    }
  }, [data]);

  // Os adsets já vêm carregados na estrutura, não precisa fazer nova requisição
  const loadFacebookAdsets = useCallback(() => {
    // Adsets já estão disponíveis na estrutura carregada
    // Esta função agora é apenas para compatibilidade
  }, []);

  // Função para carregar anúncios dos adsets selecionados
  const loadFacebookAds = useCallback(async (adsetIds) => {
    if (!adsetIds) {
      setFacebookAds([]);
      return;
    }
    
    try {
      // Usar estrutura já carregada dos adsets
      const selectedAdsetIds = adsetIds.split(',').map(id => id.trim());
      const allAds = [];
      
      selectedAdsetIds.forEach(adsetId => {
        const adset = facebookAdsets.find(a => a.id === adsetId);
        if (adset && adset.ads) {
          allAds.push(...adset.ads);
        }
      });
      
      if (allAds.length > 0) {
        setFacebookAds(allAds);
      } else {
        // Fallback para endpoint individual se ads não estão na estrutura
        const adPromises = selectedAdsetIds.map(id => GranularAPI.getFacebookAds(id));
        const adResults = await Promise.all(adPromises);
        
        const uniqueAds = adResults.flat().filter((ad, index, self) => 
          index === self.findIndex(a => a.id === ad.id)
        );
        
        setFacebookAds(uniqueAds);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar anúncios:', error);
      setFacebookAds([]);
    }
  }, [facebookAdsets]);

  // Handlers para mudanças nos filtros multiselect
  const updateFilter = useCallback((filterType, values) => {
    const valueString = values.length > 0 ? values.join(',') : '';

    setFacebookFilters(prev => {
      const newFilters = { ...prev };

      if (filterType === 'campaigns') {
        newFilters.campaigns = valueString;
        newFilters.adsets = ''; // Reset dependentes
        newFilters.ads = '';

        // Filtrar adsets das campanhas selecionadas
        if (valueString && data?.facebookStructure?.campaigns) {
          const selectedCampaignIds = valueString.split(',').map(id => id.trim());
          const selectedCampaigns = data.facebookStructure.campaigns.filter(
            campaign => selectedCampaignIds.includes(campaign.id)
          );
          const availableAdsets = selectedCampaigns.flatMap(campaign => campaign.adsets || []);
          setFacebookAdsets(availableAdsets);
        } else {
          setFacebookAdsets([]);
        }
        setFacebookAds([]);
      } else if (filterType === 'adsets') {
        newFilters.adsets = valueString;
        newFilters.ads = ''; // Reset dependentes

        // Filtrar ads dos adsets selecionados
        if (valueString) {
          const selectedAdsetIds = valueString.split(',').map(id => id.trim());
          const availableAds = facebookAdsets
            .filter(adset => selectedAdsetIds.includes(adset.id))
            .flatMap(adset => adset.ads || []);
          setFacebookAds(availableAds);
        } else {
          setFacebookAds([]);
        }
      } else if (filterType === 'ads') {
        newFilters.ads = valueString;
      }

      return newFilters;
    });
  }, [data?.facebookStructure?.campaigns, facebookAdsets]);

  // useEffect para carregar filtros quando dados chegarem
  useEffect(() => {
    if (data) {
      loadFacebookCampaigns();
    }
  }, [data, loadFacebookCampaigns]);

  // useEffect para carregar conjuntos de anúncios quando campanhas mudarem
  useEffect(() => {
    if (facebookFilters.campaigns) {
      loadFacebookAdsets(facebookFilters.campaigns);
    }
  }, [facebookFilters.campaigns, loadFacebookAdsets]);

  // useEffect para carregar anúncios quando conjuntos mudarem
  useEffect(() => {
    if (facebookFilters.adsets) {
      loadFacebookAds(facebookFilters.adsets);
    }
  }, [facebookFilters.adsets, loadFacebookAds]);
  
  // useEffect para atualizar dados do Facebook quando marketing data mudar
  useEffect(() => {
    if (data && data.facebookMetrics) {
      // Usar dados que já vêm do loadMarketingDashboard
      setFacebookData({
        success: true,
        rawMetrics: data.facebookRawMetrics || {},
        metricsData: data.facebookMetrics || {},
        structure: data.facebookStructure || {},
        formattedMetrics: data.facebookFormattedMetrics || []
      });
    }
  }, [data]);
  
  // Calcular métricas filtradas com base nos filtros selecionados
  const getFilteredMetrics = useMemo(() => {
    if (!data?.facebookStructure?.campaigns) {
      return null;
    }

    console.log('🔍 Calculando métricas filtradas:', {
      totalCampaigns: data.facebookStructure.campaigns.length,
      campaignIds: data.facebookStructure.campaigns.map(c => c.id),
      currentFilters: facebookFilters
    });

    let filteredCampaigns = data.facebookStructure.campaigns;

    // Aplicar filtro de campanhas
    if (facebookFilters.campaigns && facebookFilters.campaigns.trim() !== '') {
      const selectedCampaignIds = facebookFilters.campaigns.split(',').map(id => id.trim()).filter(id => id !== '');
      filteredCampaigns = filteredCampaigns.filter(campaign =>
        selectedCampaignIds.includes(campaign.id)
      );
      console.log('📊 Campanhas filtradas:', {
        selectedIds: selectedCampaignIds,
        filteredCount: filteredCampaigns.length,
        filteredCampaigns: filteredCampaigns.map(c => ({ id: c.id, name: c.name }))
      });
    } else {
      // Filtros vazios = mostrar todas as campanhas
      console.log('📊 Filtros vazios - usando todas as campanhas:', {
        totalCampaigns: filteredCampaigns.length,
        allCampaigns: filteredCampaigns.map(c => ({ id: c.id, name: c.name }))
      });
    }

    // Aplicar filtro de adsets
    if (facebookFilters.adsets && facebookFilters.adsets.trim() !== '') {
      const selectedAdsetIds = facebookFilters.adsets.split(',').map(id => id.trim()).filter(id => id !== '');
      filteredCampaigns = filteredCampaigns.map(campaign => ({
        ...campaign,
        adsets: (campaign.adsets || []).filter(adset =>
          selectedAdsetIds.includes(adset.id)
        )
      })).filter(campaign => campaign.adsets.length > 0);
    }

    // Aplicar filtro de ads
    if (facebookFilters.ads && facebookFilters.ads.trim() !== '') {
      const selectedAdIds = facebookFilters.ads.split(',').map(id => id.trim()).filter(id => id !== '');
      filteredCampaigns = filteredCampaigns.map(campaign => ({
        ...campaign,
        adsets: campaign.adsets?.map(adset => ({
          ...adset,
          ads: (adset.ads || []).filter(ad =>
            selectedAdIds.includes(ad.id)
          )
        })).filter(adset => adset.ads.length > 0)
      })).filter(campaign => campaign.adsets?.length > 0);
    }

    // Somar métricas dos elementos filtrados
    let totalMetrics = {
      leads: 0,
      profile_visits: 0,
      whatsapp_conversations: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      link_clicks: 0,
      spend: 0,
      page_engagement: 0,
      reactions: 0,
      comments: 0
    };

    filteredCampaigns.forEach(campaign => {
      if (facebookFilters.ads && facebookFilters.ads.trim() !== '') {
        // Se filtrado por ads, somar apenas métricas dos ads
        campaign.adsets?.forEach(adset => {
          adset.ads?.forEach(ad => {
            Object.keys(totalMetrics).forEach(key => {
              totalMetrics[key] += ad.metrics?.[key] || 0;
            });
          });
        });
      } else if (facebookFilters.adsets && facebookFilters.adsets.trim() !== '') {
        // Se filtrado por adsets, somar métricas dos adsets
        campaign.adsets?.forEach(adset => {
          Object.keys(totalMetrics).forEach(key => {
            totalMetrics[key] += adset.metrics?.[key] || 0;
          });
        });
      } else {
        // Se sem filtros específicos de ads/adsets, usar métricas das campanhas
        Object.keys(totalMetrics).forEach(key => {
          totalMetrics[key] += campaign.metrics?.[key] || 0;
        });
      }
    });

    // Calcular métricas derivadas
    totalMetrics.cost_per_lead = totalMetrics.leads > 0 ? totalMetrics.spend / totalMetrics.leads : 0;
    totalMetrics.cpc = totalMetrics.clicks > 0 ? totalMetrics.spend / totalMetrics.clicks : 0;
    totalMetrics.cpm = totalMetrics.impressions > 0 ? (totalMetrics.spend / totalMetrics.impressions) * 1000 : 0;
    totalMetrics.ctr = totalMetrics.impressions > 0 ? (totalMetrics.clicks / totalMetrics.impressions) * 100 : 0;

    console.log('💰 Métricas totais calculadas:', {
      campaignsProcessed: filteredCampaigns.length,
      totalMetrics: {
        leads: totalMetrics.leads,
        spend: totalMetrics.spend,
        impressions: totalMetrics.impressions,
        clicks: totalMetrics.clicks
      }
    });

    return totalMetrics;
  }, [data?.facebookStructure?.campaigns, facebookFilters]);

  // Usar dados filtrados se disponíveis, senão usar dados totais
  const facebookMetrics = (() => {
    const metrics = getFilteredMetrics || data?.facebookRawMetrics;

    if (metrics) {
      return {
        reach: metrics.reach || 0,
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        spend: metrics.spend || 0,
        costPerLead: metrics.cost_per_lead || 0,
        cpc: metrics.cpc || 0,
        cpm: metrics.cpm || 0,
        inlineLinkClicks: metrics.link_clicks || 0,
        leads: metrics.leads || 0,
        profileVisits: metrics.profile_visits || 0,
        whatsappConversations: metrics.whatsapp_conversations || 0,
        ctr: metrics.ctr || 0,
        engagement: {
          pageEngagement: metrics.page_engagement || 0,
          likes: metrics.reactions || 0,
          comments: metrics.comments || 0
        }
      };
    }

    // Sem dados disponíveis
    return {
      reach: 0,
      impressions: 0,
      clicks: 0,
      spend: 0,
      costPerLead: 0,
      cpc: 0,
      cpm: 0,
      inlineLinkClicks: 0,
      leads: 0,
      profileVisits: 0,
      whatsappConversations: 0,
      ctr: 0,
      engagement: {
        pageEngagement: 0,
        likes: 0,
        comments: 0
      }
    };
  })();


  // Métricas de Retorno (ROAS, ROI, CAC, MQL)
  const returnMetrics = useMemo(() => {
    const spend = facebookMetrics.spend || 0;
    const totalRevenue = salesData?.totalRevenue || 0;
    const totalSales = salesData?.totalSales || 0;

    const roas = spend > 0 ? totalRevenue / spend : null;
    const roi = spend > 0 ? ((totalRevenue - spend) / spend) * 100 : null;
    const cac = totalSales > 0 ? spend / totalSales : null;

    let mql = 0;
    const leadsDetalhes = salesData?._rawTablesData?.leadsDetalhes || [];
    mql = leadsDetalhes.filter(lead => {
      const fonte = (lead.Fonte || '').toLowerCase();
      const estagio = (lead.Etapa || lead.Status || '').toLowerCase();
      const isPaid = fonte.includes('facebook') || fonte.includes('instagram') || fonte.includes('meta') || fonte.includes('google') || fonte.includes('ads') || fonte.includes('pag');
      const isQualified = estagio.includes('qualificado') || estagio.includes('mql') || estagio.includes('qualified');
      return isPaid && isQualified;
    }).length;

    return { roas, roi, cac, mql };
  }, [facebookMetrics.spend, salesData?.totalRevenue, salesData?.totalSales, salesData?._rawTablesData?.leadsDetalhes]);

  // Configurações dos gráficos
  const chartConfigs = {
    leadsConfig: {
      name: 'Leads',
      xKey: 'name',
      yKey: 'value',
      color: COLORS.primary
    },
    meetingsConfig: {
      name: 'Reuniões',
      xKey: 'name',
      yKey: 'meetingsHeld',
      color: COLORS.secondary
    }
  };

  // Estilo dos gráficos
  const chartStyle = {
    width: '100%',
    height: '280px'
  };

  // Componente para indicador de tendência (igual ao DashboardSales)
  const TrendIndicator = ({ value, showZero = false }) => {
    if ((value === null || value === undefined || (value === 0 && !showZero))) {
      return null;
    }
    
    const isPositive = value > 0;
    
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
        ? 'rgba(76, 224, 179, 0.25)'  // Verde com mais opacidade
        : 'rgba(255, 58, 94, 0.25)',  // Vermelho com mais opacidade
      color: '#374151', // Cinza escuro
      marginLeft: '8px'
    };
    
    return (
      <div style={style} className="trend-indicator-square">
        {isPositive ? '↗' : '↘'} {isPositive ? '+' : ''}{Math.abs(value).toFixed(1)}%
      </div>
    );
  };

  // Card de métrica com tendência elegante
  const MiniMetricCardWithTrend = ({ title, value, trendValue, color = COLORS.primary, subtitle, onClick }) => (
    <div className="mini-metric-card" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className="mini-metric-value" style={{ color }}>{value}</div>
        <TrendIndicator value={trendValue} />
      </div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );


  // Memoized Compact Chart Component
  const CompactChart = memo(({ data, type, config, style, loading = false, onBarClick = null }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [isLoadingChart, setIsLoadingChart] = useState(loading);

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
              itemStyle: {
                color: config.color,
                emphasis: {
                  color: config.color,
                  opacity: 0.8
                }
              },
              emphasis: {
                focus: 'series',
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowOffsetY: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              barWidth: isMobile ? '50%' : '70%',
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

        // Adicionar evento de clique se fornecido
        if (onBarClick && type === 'bar') {
          chartInstance.current.on('click', function (params) {
            onBarClick(params.name, params.value, params);
          });
        }
      }
    }, [type, config, isMobile, onBarClick]);

    // Controlar loading animation
    useEffect(() => {
      if (!chartInstance.current) return;

      if (isLoadingChart || !data || data.length === 0) {
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
    }, [isLoadingChart, data, config.color]);

    // Atualizar dados dinamicamente quando mudam
    useEffect(() => {
      if (!chartInstance.current || !data || data.length === 0 || isLoadingChart) return;

      let updateOption = {};

      if (type === 'bar') {
        // Garantir ordenação decrescente antes de passar para o gráfico
        const sortedData = [...data].sort((a, b) => {
          const valueA = Number(a[config.yKey] || 0);
          const valueB = Number(b[config.yKey] || 0);
          const diff = valueB - valueA; // Decrescente
          return diff !== 0 ? diff : (a[config.xKey] || '').localeCompare(b[config.xKey] || '');
        });

        updateOption = {
          xAxis: {
            data: sortedData.map(item => item[config.xKey])
          },
          series: [{
            name: config.name || 'Data',
            data: sortedData.map(item => item[config.yKey]),
            itemStyle: {
              color: config.color,
              emphasis: {
                color: config.color,
                opacity: 0.8
              }
            },
            emphasis: {
              focus: 'series',
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              position: 'top',
              fontSize: isMobile ? 12 : 14,
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
      }

      // Use setOption to update data dynamically
      chartInstance.current.setOption(updateOption, false); // false = merge mode

    }, [data, type, config, isLoadingChart]);

    // Sync loading state with parent
    useEffect(() => {
      setIsLoadingChart(loading);
    }, [loading]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
          chartInstance.current = null;
        }
      };
    }, []);

    return <div ref={chartRef} style={{...style, cursor: onBarClick ? 'pointer' : 'default'}} />;
  });

  return (
    <div className="dashboard-marketing">
      {/* Indicador de Status Geral */}
      {(isLoading || isUpdating) && (
        <div className="global-status-indicator">
          <div className="status-content">
            <span className="status-text">
              {isLoading ? 'Carregando dados de marketing...' :
               isUpdating ? 'Atualizando...' : 'Carregando...'}
            </span>
          </div>
        </div>
      )}

      {/* Cabeçalho com período */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <h2 style={{ fontWeight: 700, fontSize: '24px', color: COLORS.dark, borderLeft: `4px solid ${COLORS.secondary}`, paddingLeft: '12px' }}>Dashboard Marketing</h2>
          <div className="dashboard-subtitle">
            <span>
              Período: {(() => {
                if (period === 'current_month') return 'Mês Atual';
                if (period === 'previous_month') return 'Mês Anterior';
                if (period === 'year') return 'Anual';
                if (period === 'custom' && customPeriod?.startDate && customPeriod?.endDate) {
                  return `${customPeriod.startDate} a ${customPeriod.endDate}`;
                }
                if (period === '7d') return '7 dias';
                return 'Mês Atual';
              })()}
            </span>
          </div>
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
              className={period === 'previous_month' ? 'active' : ''} 
              onClick={() => handlePeriodChange('previous_month')}
            >
              Mês Anterior
            </button>
            <button 
              className={period === 'year' ? 'active' : ''} 
              onClick={() => handlePeriodChange('year')}
            >
              Anual
            </button>
            <button 
              className={period === 'custom' ? 'active' : ''} 
              onClick={() => handlePeriodChange('custom')}
            >
              Personalizado
            </button>
          </div>
        </div>
      </div>

      {/* Facebook Filters */}
      <div className="dashboard-row">
        <div className="card" style={{ padding: '16px 24px' }}>
          <div className="facebook-filters-integrated">
            <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.dark, marginBottom: '4px' }}>Filtros</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              <div className="filter-group">
                <label>Campanhas</label>
                <Select
                  isMulti={true}
                  isSearchable={true}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  value={selectedCampaignValues}
                  onChange={(selectedOptions) => {
                    const values = selectedOptions.map(option => option.value);
                    updateFilter('campaigns', values);
                  }}
                  options={campaignOptions}
                  placeholder="Selecionar campanhas..."
                  noOptionsMessage={() => "Nenhuma campanha encontrada"}
                  className="react-select"
                  classNamePrefix="react-select"
                />
              </div>

              <div className="filter-group">
                <label>Conjuntos</label>
                <Select
                  isMulti={true}
                  isSearchable={true}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  value={selectedAdsetValues}
                  onChange={(selectedOptions) => {
                    const values = selectedOptions.map(option => option.value);
                    updateFilter('adsets', values);
                  }}
                  options={adsetOptions}
                  placeholder="Selecionar conjuntos..."
                  noOptionsMessage={() => "Nenhum conjunto encontrado"}
                  className="react-select"
                  classNamePrefix="react-select"
                  isDisabled={!facebookFilters.campaigns || adsetOptions.length === 0}
                />
              </div>

              <div className="filter-group">
                <label>Anúncios</label>
                <Select
                  isMulti={true}
                  isSearchable={true}
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  value={selectedAdValues}
                  onChange={(selectedOptions) => {
                    const values = selectedOptions.map(option => option.value);
                    updateFilter('ads', values);
                  }}
                  options={adOptions}
                  placeholder="Selecionar anúncios..."
                  noOptionsMessage={() => "Nenhum anúncio encontrado"}
                  className="react-select"
                  classNamePrefix="react-select"
                  isDisabled={!facebookFilters.adsets || adOptions.length === 0}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">
            Métricas Principais
            {facebookError && <span className="error-badge">❌ ERRO: {facebookError}</span>}
          </div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="TOTAL DE LEADS (META)"
              value={facebookMetrics.leads.toString()}
              trendValue={null}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="GANHO DE SEGUIDORES"
              value="N/D"
              trendValue={null}
              color={COLORS.secondary}
              subtitle="Em breve"
              onClick={() => setFollowerModalOpen(true)}
            />
            <MiniMetricCardWithTrend
              title="CONVERSAS PELO WHATSAPP"
              value={facebookMetrics.whatsappConversations.toString()}
              trendValue={null}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="CONVERSAS VIA DIRECT"
              value="0"
              trendValue={null}
              color={COLORS.warning}
              subtitle="Em breve"
            />
          </div>
        </div>
      </div>

      {/* Métricas de Performance */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">Métricas de Performance</div>
          <div className="metrics-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            <MiniMetricCardWithTrend
              title="ALCANCE"
              value={facebookMetrics.reach.toLocaleString()}
              trendValue={null}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="IMPRESSÕES"
              value={facebookMetrics.impressions.toLocaleString()}
              trendValue={null}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="CUSTO POR LEAD"
              value={`R$ ${facebookMetrics.costPerLead.toFixed(2)}`}
              trendValue={null}
              color={COLORS.tertiary}
            />
            <MiniMetricCardWithTrend
              title="CUSTO POR CLIQUE"
              value={`R$ ${facebookMetrics.cpc.toFixed(2)}`}
              trendValue={null}
              color={COLORS.dark}
            />
            <MiniMetricCardWithTrend
              title="CPM"
              value={`R$ ${facebookMetrics.cpm.toFixed(2)}`}
              trendValue={null}
              color={COLORS.info}
            />
            <MiniMetricCardWithTrend
              title="CLIQUES"
              value={facebookMetrics.clicks.toLocaleString()}
              trendValue={null}
              color={COLORS.warning}
            />
            <MiniMetricCardWithTrend
              title="CLIQUES NO LINK"
              value={facebookMetrics.inlineLinkClicks.toLocaleString()}
              trendValue={null}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="VALOR INVESTIDO"
              value={`R$ ${facebookMetrics.spend.toFixed(2)}`}
              trendValue={null}
              color={COLORS.danger}
            />
          </div>
        </div>
      </div>

      {/* Métricas de Retorno */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">Métricas de Retorno</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="ROAS"
              value={returnMetrics.roas !== null ? `${returnMetrics.roas.toFixed(2)}x` : 'N/D'}
              trendValue={null}
              color={COLORS.success}
              subtitle="Retorno sobre investimento em ads"
            />
            <MiniMetricCardWithTrend
              title="ROI"
              value={returnMetrics.roi !== null ? `${returnMetrics.roi.toFixed(1)}%` : 'N/D'}
              trendValue={null}
              color={returnMetrics.roi === null ? COLORS.tertiary : (returnMetrics.roi >= 0 ? COLORS.success : COLORS.danger)}
            />
            <MiniMetricCardWithTrend
              title="CAC"
              value={returnMetrics.cac !== null ? `R$ ${returnMetrics.cac.toFixed(2)}` : 'N/D'}
              trendValue={null}
              color={COLORS.warning}
              subtitle="Custo de aquisição por cliente"
            />
            <MiniMetricCardWithTrend
              title="MQL"
              value={returnMetrics.mql.toString()}
              trendValue={null}
              color={COLORS.primary}
              subtitle="Leads qualificados de mídia paga"
            />
          </div>
        </div>
      </div>

      {/* Métricas de Engajamento */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">Métricas de Engajamento</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="ENGAJAMENTO COM A PÁGINA"
              value={facebookMetrics.engagement.pageEngagement.toString()}
              trendValue={null}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="REAÇÕES"
              value={facebookMetrics.engagement.likes.toString()}
              trendValue={null}
              color={COLORS.warning}
            />
            <MiniMetricCardWithTrend
              title="COMENTÁRIOS"
              value={facebookMetrics.engagement.comments.toString()}
              trendValue={null}
              color={COLORS.info}
            />
          </div>
        </div>
      </div>

      {/* Gráficos de Leads e Reuniões */}
      <div className="dashboard-row" style={{ flexDirection: 'column' }}>
        {sortedSalesChartsData.sortedLeadsData.length > 0 || sortedSalesChartsData.sortedMeetingsData.length > 0 ? (
          <>
            <div className="card card-full">
              <div className="card-title card-title-with-total">
                <span className="card-title-text">Leads criados no período (CRM)</span>
                <div className="total-actions">
                  <span
                    className="total-badge"
                    onClick={() => openModal('leads')}
                    title="Clique para ver detalhes dos leads"
                  >
                    Total: {sortedSalesChartsData.sortedLeadsData.reduce((sum, user) => sum + (user.value || 0), 0)}
                  </span>
                </div>
              </div>
              <CompactChart
                type="bar"
                data={sortedSalesChartsData.sortedLeadsData}
                config={chartConfigs.leadsConfig}
                style={chartStyle}
                loading={isLoading}
                onBarClick={(corretorName) => openModal('leads', `Leads - ${corretorName}`)}
              />
            </div>

            <div className="card card-full">
              <div className="card-title card-title-with-total">
                <span className="card-title-text">Rank Corretores - Reunião</span>
                <div className="total-actions">
                  <span
                    className="total-badge"
                    onClick={() => openModal('reunioes')}
                    title="Clique para ver todas as reuniões"
                  >
                    Total: {sortedSalesChartsData.sortedMeetingsData.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0)}
                  </span>
                </div>
              </div>
              <CompactChart
                type="bar"
                data={sortedSalesChartsData.sortedMeetingsData}
                config={chartConfigs.meetingsConfig}
                style={chartStyle}
                loading={isLoading}
                onBarClick={(corretorName) => openModal('reunioes', `Reuniões - ${corretorName}`)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="card card-full">
              <div className="card-title">Leads criados no período (CRM)</div>
              <CompactChart
                type="bar"
                data={[]}
                config={chartConfigs.leadsConfig}
                style={chartStyle}
                loading={false}
              />
            </div>

            <div className="card card-full">
              <div className="card-title">Rank Corretores - Reunião</div>
              <CompactChart
                type="bar"
                data={[]}
                config={chartConfigs.meetingsConfig}
                style={chartStyle}
                loading={false}
              />
            </div>
          </>
        )}
      </div>


      {/* Custom period modal */}
      <SimpleModal
        isOpen={showCustomPeriod}
        onClose={() => setShowCustomPeriod(false)}
        title="Período Personalizado"
      >
        <div className="custom-period-modal">
          <div className="custom-period-inputs">
            <div className="input-group">
              <label htmlFor="start-date">Data Inicial:</label>
              <input
                type="date"
                id="start-date"
                value={customPeriod?.startDate || ''}
                onChange={(e) => setCustomPeriod(prev => ({
                  ...prev,
                  startDate: e.target.value
                }))}
              />
            </div>
            <div className="input-group">
              <label htmlFor="end-date">Data Final:</label>
              <input
                type="date"
                id="end-date"
                value={customPeriod?.endDate || ''}
                onChange={(e) => setCustomPeriod(prev => ({
                  ...prev,
                  endDate: e.target.value
                }))}
              />
            </div>
          </div>
          <div className="custom-period-actions">
            <button
              onClick={() => setShowCustomPeriod(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                applyCustomPeriod();
                setShowCustomPeriod(false);
              }}
              className="btn btn-primary"
              disabled={!customPeriod?.startDate || !customPeriod?.endDate}
            >
              Aplicar Período
            </button>
          </div>
        </div>
      </SimpleModal>

      {/* Follower structure modal */}
      <SimpleModal
        isOpen={followerModalOpen}
        onClose={() => setFollowerModalOpen(false)}
        title="Estrutura de Campanhas"
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e8ecef', background: '#f8f9fa' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Campanha</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Conjunto</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Anúncio</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.facebookStructure?.campaigns?.length > 0 ? (
                data.facebookStructure.campaigns.flatMap(campaign => {
                  const rows = [];
                  if (campaign.adsets?.length > 0) {
                    campaign.adsets.forEach(adset => {
                      if (adset.ads?.length > 0) {
                        adset.ads.forEach(ad => {
                          rows.push(
                            <tr key={`${campaign.id}-${adset.id}-${ad.id}`} style={{ borderBottom: '1px solid #e8ecef' }}>
                              <td style={{ padding: '8px 12px' }}>{campaign.name}</td>
                              <td style={{ padding: '8px 12px' }}>{adset.name}</td>
                              <td style={{ padding: '8px 12px' }}>{ad.name}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  background: (ad.status || '').toUpperCase() === 'ACTIVE' ? 'rgba(76,224,179,0.15)' : 'rgba(255,170,91,0.15)',
                                  color: (ad.status || '').toUpperCase() === 'ACTIVE' ? COLORS.success : COLORS.warning
                                }}>
                                  {ad.status || '-'}
                                </span>
                              </td>
                            </tr>
                          );
                        });
                      } else {
                        rows.push(
                          <tr key={`${campaign.id}-${adset.id}`} style={{ borderBottom: '1px solid #e8ecef' }}>
                            <td style={{ padding: '8px 12px' }}>{campaign.name}</td>
                            <td style={{ padding: '8px 12px' }}>{adset.name}</td>
                            <td style={{ padding: '8px 12px', color: '#9ca3af' }}>-</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 500,
                                background: (adset.status || '').toUpperCase() === 'ACTIVE' ? 'rgba(76,224,179,0.15)' : 'rgba(255,170,91,0.15)',
                                color: (adset.status || '').toUpperCase() === 'ACTIVE' ? COLORS.success : COLORS.warning
                              }}>
                                {adset.status || '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    });
                  } else {
                    rows.push(
                      <tr key={campaign.id} style={{ borderBottom: '1px solid #e8ecef' }}>
                        <td style={{ padding: '8px 12px' }}>{campaign.name}</td>
                        <td style={{ padding: '8px 12px', color: '#9ca3af' }}>-</td>
                        <td style={{ padding: '8px 12px', color: '#9ca3af' }}>-</td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 500,
                            background: (campaign.status || '').toUpperCase() === 'ACTIVE' ? 'rgba(76,224,179,0.15)' : 'rgba(255,170,91,0.15)',
                            color: (campaign.status || '').toUpperCase() === 'ACTIVE' ? COLORS.success : COLORS.warning
                          }}>
                            {campaign.status || '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                })
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
                    Nenhuma campanha encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SimpleModal>

      {/* Detail modal */}
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