import { useState, useEffect } from 'react';
import { KommoAPI } from '../services/api';
import { GranularAPI } from '../services/granularAPI'; // API REAL granular
import DashboardMarketing from './DashboardMarketing';
import DashboardSales from './DashboardSales';
import LoadingSpinner from './LoadingSpinner';
import './Dashboard.css';

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

  const [activeTab, setActiveTab] = useState('marketing');
  const [period, setPeriod] = useState('current_month');
  const [customPeriod, setCustomPeriod] = useState(getDefaultPeriod());
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);
  const [corretores, setCorretores] = useState([]);
  const [selectedCorretor, setSelectedCorretor] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [sourceOptions, setSourceOptions] = useState([{ value: '', label: 'Todas as Fontes' }]);
  


  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMarketing, setIsLoadingMarketing] = useState(false);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [isInitialSalesLoad, setIsInitialSalesLoad] = useState(true);
  const [isUpdatingSales, setIsUpdatingSales] = useState(false);
  // Removido isLoadingFilters - filtragem agora é instantânea no frontend
  const [error, setError] = useState(null);
  const [marketingData, setMarketingData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  
  // Estados para atualização dinâmica
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // segundos
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Hook para detecção de tamanho de tela responsiva
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  
  const isMobile = windowSize.width < 768;
  const isSmallMobile = windowSize.width < 480;

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

  // Carregar lista de corretores
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        
        // Carregar corretores e fontes em paralelo
        const [corretoresResponse, sourceOptionsResponse] = await Promise.all([
          KommoAPI.getCorretoresList(),
          KommoAPI.getSourceOptions()
        ]);
        
        
        if (corretoresResponse?.corretores) {
          setCorretores(corretoresResponse.corretores);
        }
        
        
        if (sourceOptionsResponse && Array.isArray(sourceOptionsResponse)) {
          setSourceOptions(sourceOptionsResponse);
        } else {
        }
      } catch (error) {
        
        // Em caso de erro, garantir que pelo menos o fallback seja definido
        setSourceOptions([
          { value: '', label: 'Todas as Fontes' },
          { value: 'Google', label: 'Google' },
          { value: 'Tráfego Meta', label: 'Tráfego Meta' },
          { value: 'Site', label: 'Site' },
          { value: 'Parceria com Construtoras', label: 'Parceria com Construtoras' }
        ]);
      }
    };
    
    fetchInitialData();
  }, []);

  // Função para calcular dias do período
  const calculateDays = () => {
    if (period === 'current_month') {
      const defaultPeriod = getDefaultPeriod();
      const start = new Date(defaultPeriod.startDate);
      const end = new Date(defaultPeriod.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    }
    if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
      const start = new Date(customPeriod.startDate);
      const end = new Date(customPeriod.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    return parseInt(period.replace('d', ''));
  };

  // Função para verificar se o período está válido para fazer requisição
  const isPeriodValid = () => {
    if (period === 'current_month') {
      return true; // Mês atual sempre é válido
    }
    if (period === 'custom') {
      return Boolean(customPeriod.startDate && customPeriod.endDate);
    }
    return Boolean(period && period !== 'custom');
  };

  // Carregar dados de marketing (só quando period está válido) com debounce
  useEffect(() => {
    if (!isPeriodValid()) {
      return; // Não faz nada se o período não estiver válido
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
          } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            params.start_date = customPeriod.startDate;
            params.end_date = customPeriod.endDate;
            customDates = {
              start_date: customPeriod.startDate,
              end_date: customPeriod.endDate
            };
          }
          
          
          // CARREGAMENTO PARALELO: Dashboard geral + Insights de campanhas Facebook
          const [marketingResult, facebookCampaigns] = await Promise.all([
            GranularAPI.loadMarketingDashboard(days, null, customDates),
            GranularAPI.getFacebookCampaigns()
          ]);
          
          // Carregar insights de todas as campanhas
          let campaignInsights = null;
          if (facebookCampaigns && facebookCampaigns.length > 0) {
            const allCampaignIds = facebookCampaigns.map(campaign => campaign.id);
            const dateRange = customDates ? {
              start: customDates.start_date,
              end: customDates.end_date
            } : null;
            
            campaignInsights = await GranularAPI.getFacebookCampaignInsights(allCampaignIds, dateRange);
          }
          
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
  }, [period]); // REMOVIDO: customPeriod.startDate, customPeriod.endDate - filtragem apenas no Aplicar

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
          } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            customDates = {
              start_date: customPeriod.startDate,
              end_date: customPeriod.endDate
            };
          }
          
          if (activeTab === 'marketing') {
            const marketingResult = await GranularAPI.loadMarketingDashboard(days, selectedSource, customDates);
            setMarketingData(marketingResult);
          } else {
            // Carregar dados com filtros aplicados no backend
            const salesResult = await GranularAPI.loadSalesDashboard(days, selectedCorretor, selectedSource, customDates);
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

  // Carregar dados de vendas (quando period está válido OU selectedCorretor muda) com debounce
  useEffect(() => {
    if (!isPeriodValid()) {
      return; // Não faz nada se o período não estiver válido
    }

    // Debounce de 300ms para evitar múltiplas chamadas
    const timeoutId = setTimeout(() => {
      const fetchSalesData = async () => {
        // Só mostrar loading na primeira carga
        // Mudanças de filtro mostram indicador sutil (como auto-refresh)
        if (isInitialSalesLoad) {
          setIsLoadingSales(true);
        } else {
          setIsUpdatingSales(true);
        }
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
          } else if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            params.start_date = customPeriod.startDate;
            params.end_date = customPeriod.endDate;
            customDates = {
              start_date: customPeriod.startDate,
              end_date: customPeriod.endDate
            };
          }
          
          
          // USAR API GRANULAR V2 - CARREGAMENTO PARALELO OTIMIZADO!
          // Carregar dados com filtros aplicados no backend
          const salesResult = await GranularAPI.loadSalesDashboard(days, selectedCorretor, selectedSource, customDates);
          
          setSalesData(salesResult);
        } catch (error) {
          setError(`Falha ao carregar dados de vendas: ${error.message}`);
        } finally {
          setIsLoadingSales(false);
          setIsUpdatingSales(false);
          setIsLoading(false); // Loading geral só para primeira carga
          setIsInitialSalesLoad(false); // Marcar que primeira carga foi concluída
        }
      };
      
      fetchSalesData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [period, selectedCorretor, selectedSource]); // Adicionado filtros de volta para trigger re-fetch
  
  // Reset da flag de primeira carga quando o período muda (não os filtros)
  useEffect(() => {
    setIsInitialSalesLoad(true);
  }, [period]);

  // Atualizar dados (só executa se período for válido)
  const refreshData = async (forceRefresh = false) => {
    if (!isPeriodValid()) {
      return;
    }

    // Limpar cache se for refresh forçado
    if (forceRefresh) {
      KommoAPI.clearCache();
    }

    if (activeTab === 'marketing') {
      setIsLoadingMarketing(true);
    } else {
      setIsLoadingSales(true);
    }
    
    // Sempre mostrar loading de filtros no refresh manual
    
    try {
      const days = calculateDays();
      const params = { days };
      
      // Se for período customizado, enviar datas específicas
      if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
        params.start_date = customPeriod.startDate;
        params.end_date = customPeriod.endDate;
      }
      
      
      // Preparar datas customizadas se período for custom
      const customDates = (period === 'custom' && customPeriod.startDate && customPeriod.endDate) ? {
        start_date: customPeriod.startDate,
        end_date: customPeriod.endDate
      } : null;
      
      if (activeTab === 'marketing') {
        // Limpar cache da API granular também
        GranularAPI.clearCache();
        
        const marketingResponse = await GranularAPI.loadMarketingDashboard(days, selectedSource, customDates);
        setMarketingData(marketingResponse);
      } else {
        // Limpar cache da API granular também
        GranularAPI.clearCache();
        
        // Carregar dados com filtros aplicados no backend
        const salesResponse = await GranularAPI.loadSalesDashboard(days, selectedCorretor, selectedSource, customDates);
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
      setIsLoadingFilters(false); // Parar loading de filtros
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
        selectedSource, 
        customDates, 
        campaignFilters
      );
      setMarketingData(marketingResponse);
      
    } catch (error) {
      setError(`Erro ao aplicar filtros de campanha: ${error.message}`);
    } finally {
      setIsLoadingMarketing(false);
      setIsLoadingFilters(false);
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
      const startDate = new Date(dataToUse.startDate);
      const endDate = new Date(dataToUse.endDate);
      
      if (endDate <= startDate) {
        alert('Data final deve ser posterior à data inicial');
        return;
      }
      
      // Fechar o modal
      setShowCustomPeriod(false);
      
      // Carregar dados silenciosamente (sem loading) usando os dados corretos
      await loadCustomPeriodDataSilent(dataToUse);
    } else {
      alert('Por favor, selecione ambas as datas');
    }
  };

  // Função para carregar dados do período customizado manualmente
  const loadCustomPeriodData = async () => {
    return await loadCustomPeriodDataWithPeriod(customPeriod);
  };

  // Função para carregar dados usando período específico (com loading)
  const loadCustomPeriodDataWithPeriod = async (periodData) => {
    
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
      
      
      // Carregar dados em paralelo (sem filtros - filtragem será feita no frontend)
      const [marketingResult, salesResult] = await Promise.all([
        GranularAPI.loadMarketingDashboard(days, selectedSource, customDates),
        GranularAPI.loadSalesDashboard(days, null, null, customDates)
      ]);
      
      setMarketingData(marketingResult);
      setSalesData(salesResult);
      
    } catch (error) {
      setError(`Falha ao carregar dados: ${error.message}`);
    } finally {
      setIsLoadingMarketing(false);
      setIsLoadingSales(false);
      setIsLoadingFilters(false);
    }
  };

  // Função para carregar dados silenciosamente (sem loading) - similar ao auto-refresh
  const loadCustomPeriodDataSilent = async (periodData) => {
    
    // NÃO mostrar loading - atualização silenciosa como auto-refresh
    
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
      
      
      // Carregar dados em paralelo (silenciosamente, sem filtros - filtragem será feita no frontend)
      const [marketingResult, salesResult] = await Promise.all([
        GranularAPI.loadMarketingDashboard(days, selectedSource, customDates),
        GranularAPI.loadSalesDashboard(days, null, null, customDates)
      ]);
      
      // Atualizar dados sem mostrar loading
      setMarketingData(marketingResult);
      setSalesData(salesResult);
      
    } catch (error) {
      // Não mostrar erro em loading silencioso
    }
  };

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
          selectedSource={selectedSource}
          setSelectedSource={setSelectedSource}
          sourceOptions={sourceOptions}
          data={marketingData}
          salesData={salesData}
          isLoading={isLoadingMarketing}
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
          corretores={corretores}
          selectedCorretor={selectedCorretor}
          setSelectedCorretor={setSelectedCorretor}
          selectedSource={selectedSource}
          setSelectedSource={setSelectedSource}
          sourceOptions={sourceOptions}
          data={salesData}
          isLoading={isLoadingSales}
          isUpdating={isUpdatingSales}
          customPeriod={customPeriod}
          setCustomPeriod={setCustomPeriod}
          showCustomPeriod={showCustomPeriod}
          setShowCustomPeriod={setShowCustomPeriod}
          handlePeriodChange={handlePeriodChange}
          applyCustomPeriod={applyCustomPeriod}
        />
      )}
      
      <div className="dashboard-footer">
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
  );
}

export default Dashboard;