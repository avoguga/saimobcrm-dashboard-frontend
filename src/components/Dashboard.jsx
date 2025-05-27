import { useState, useEffect, useCallback } from 'react';
import { KommoAPI } from '../services/api';
import CacheService from '../services/cache';
import './Dashboard.css';

// Componentes
import KpiCard from './KpiCard';
import GaugeChart from './GaugeChart';
import BarChart from './BarChart';
import LineChart from './LineChart';
import PieChart from './PieChart';
import FilterBar from './FilterBar';
import CustomFieldsSection from './CustomFieldsSection';
import ProgressiveLoading from './ProgressiveLoading';

const Dashboard = () => {
  // Estado para controle de navegação
  const [activeDashboard, setActiveDashboard] = useState('marketing');
  
  // Estados para armazenar os dados da API
  const [leadCount, setLeadCount] = useState(0);
  const [avgCycleTime, setAvgCycleTime] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [avgDealSize, setAvgDealSize] = useState(0);
  const [leadsPerStage, setLeadsPerStage] = useState({});
  const [leadsPerSource, setLeadsPerSource] = useState({});
  const [leadsPerTag, setLeadsPerTag] = useState({});
  const [leadsPerUser, setLeadsPerUser] = useState({});
  const [activeLeadsPerUser, setActiveLeadsPerUser] = useState({});
  const [lostLeadsPerUser, setLostLeadsPerUser] = useState({});
  const [conversionRates, setConversionRates] = useState({});
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  
  // Estado para os dados de filtro
  const [pipelines, setPipelines] = useState([]);
  const [sources, setSources] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: '30',
    pipeline: 'all',
    source: 'all',
    user: 'all',
    customStartDate: '',
    customEndDate: ''
  });
  
  // Estados para controles UI
  const [showCustomFields, setShowCustomFields] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadedSections, setLoadedSections] = useState([]);

  // Adicionar uma seção carregada ao estado
  const markSectionLoaded = (sectionIndex) => {
    setLoadedSections(prevSections => {
      if (prevSections.includes(sectionIndex)) {
        return prevSections;
      }
      return [...prevSections, sectionIndex];
    });
  };

  // Função otimizada para buscar dados usando requisições paralelas e carregamento progressivo
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadedSections([]);
    
    try {
      // API Client
      const api = KommoAPI;
      
      // Calcular dias para filtro baseado no período selecionado
      let days = parseInt(filters.dateRange);
      let pipeline_id = filters.pipeline !== 'all' ? filters.pipeline : null;
      
      // Usar datas personalizadas se estiverem definidas
      let customDateParams = {};
      if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
        const startDate = new Date(filters.customStartDate);
        const endDate = new Date(filters.customEndDate);
        const diffTime = Math.abs(endDate - startDate);
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        customDateParams = {
          custom_start_date: filters.customStartDate,
          custom_end_date: filters.customEndDate
        };
      }

      // Função auxiliar para buscar dados com marcação de progresso
      const fetchWithProgress = async (promiseList, sectionIndex) => {
        const result = await Promise.all(promiseList);
        markSectionLoaded(sectionIndex);
        return result;
      };
      
      // Seção 1: Dados básicos
      const basicDataPromises = [
        api.getLeadsCount(customDateParams),
        api.getLeadCycleTime(days),
        api.getWinRate(days, pipeline_id),
        api.getAverageDealSize(days, pipeline_id)
      ];
      
      // Seção 2: Distribuições
      const distributionPromises = [
        api.getLeadsBySource(),
        api.getLeadsByTag(),
        api.getLeadsByStage()
      ];
      
      // Seção 3: Dados por usuário
      const userDataPromises = [
        api.getLeadsByUser(),
        api.getActiveLeadsByUser(),
        api.getLostLeadsByUser()
      ];
      
      // Seção 4: Taxas de conversão
      const conversionPromises = [
        api.getConversionRates(days, pipeline_id)
      ];
      
      // Iniciar todas as requisições em paralelo com feedback progressivo
      const [basicData, distributionData, userData, conversionData] = await Promise.all([
        fetchWithProgress(basicDataPromises, 0),
        fetchWithProgress(distributionPromises, 1),
        fetchWithProgress(userDataPromises, 2),
        fetchWithProgress(conversionPromises, 3)
      ]);
      
      // Desempacotar resultados
      const [countData, cycleData, winRateData, dealSizeData] = basicData;
      const [sourceData, tagData, stageData] = distributionData;
      const [userLeadsData, activeUserData, lostUserData] = userData;
      const [conversionRatesData] = conversionData;
      
      // Atualizar os estados com os dados recebidos
      setLeadCount(countData.total_leads);
      setAvgCycleTime(cycleData.lead_cycle_time_days);
      setWinRate(winRateData.win_rate_percentage);
      setAvgDealSize(dealSizeData.average_deal_size);
      setLeadsPerSource(sourceData.leads_by_source);
      setLeadsPerTag(tagData.leads_by_tag);
      setLeadsPerStage(stageData.leads_by_stage);
      setLeadsPerUser(userLeadsData.leads_by_user);
      setActiveLeadsPerUser(activeUserData.active_leads_by_user);
      setLostLeadsPerUser(lostUserData.lost_leads_by_user);
      setConversionRates(conversionRatesData.conversion_rates_percentage);
      
      // Simulação de dados de tendência (seriam obtidos da API em produção)
      setMonthlyTrends([
        { month: 'Jan', leads: 120, conversions: 24, rate: 20 },
        { month: 'Fev', leads: 145, conversions: 32, rate: 22 },
        { month: 'Mar', leads: 162, conversions: 42, rate: 26 },
        { month: 'Abr', leads: 134, conversions: 38, rate: 28 },
        { month: 'Mai', leads: 157, conversions: 46, rate: 29 },
        { month: 'Jun', leads: 172, conversions: 56, rate: 33 },
      ]);
      
      // Marcar a última seção como carregada
      markSectionLoaded(4);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      // Verificar se todos os dados foram carregados
      setTimeout(() => {
        setLoading(false);
      }, 500); // Adicionar um pequeno atraso para UX melhor
    }
  }, [filters]);

  // Função para buscar dados para os filtros
  const fetchFilterData = useCallback(async () => {
    try {
      // API Client
      const api = KommoAPI;
      
      // Buscar pipelines
      const pipelinesData = await api.getPipelines();
      if (pipelinesData && pipelinesData.pipelines && pipelinesData.pipelines._embedded) {
        setPipelines(pipelinesData.pipelines._embedded.pipelines.map(p => ({
          id: p.id,
          name: p.name
        })));
      }
      
      // Buscar fontes
      const sourcesData = await api.getSources();
      if (sourcesData && sourcesData.sources) {
        const sourcesList = Object.entries(sourcesData.sources).map(([id, name]) => ({
          id,
          name
        }));
        setSources(sourcesList);
      }
      
      // Buscar usuários
      const usersData = await api.getUsers();
      if (usersData && usersData.users && usersData.users._embedded) {
        const usersList = usersData.users._embedded.users.map(u => ({
          id: u.id,
          name: `${u.name || ''} ${u.lastname || ''}`.trim()
        }));
        setUsers(usersList);
      }
    } catch (error) {
      console.error('Erro ao buscar dados para filtros:', error);
    }
  }, []);

  // Manipulador de alteração de filtros
  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  // Buscar dados quando o componente montar e quando os filtros mudarem
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Buscar dados para os filtros quando o componente montar
  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // Converter dados para formato de gráfico
  const convertToChartData = useCallback((dataObject) => {
    return Object.entries(dataObject).map(([name, value]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      value
    }));
  }, []);
  
  // Calcular dados para gráficos
  const stageChartData = convertToChartData(leadsPerStage);
  const sourceChartData = convertToChartData(leadsPerSource);
  const tagChartData = convertToChartData(leadsPerTag);
  const userChartData = convertToChartData(leadsPerUser);
  
  // Filtrar dados com base no filtro de fonte (para dashboard marketing)
  const filteredSourceData = useCallback(() => {
    if (filters.source === 'all') {
      return sourceChartData;
    }
    return sourceChartData.filter(item => item.name === filters.source || 
                                          item.name.includes(filters.source));
  }, [filters.source, sourceChartData]);
  
  // Filtrar dados com base no filtro de usuário (para dashboard vendas)
  const filteredUserData = useCallback(() => {
    if (filters.user === 'all') {
      return userChartData;
    }
    return userChartData.filter(item => item.name === filters.user || 
                                        item.name.includes(filters.user));
  }, [filters.user, userChartData]);

  // Função auxiliar para gerar cores para os gráficos
  const getColorByIndex = useCallback((index) => {
    const colors = ['#4E5859', '#96856F', '#75777B', '#212121', '#C1C5C9'];
    return colors[index % colors.length];
  }, []);

  // Componente do Dashboard de Marketing
  const MarketingDashboard = () => (
    <div className="dashboard-content">
      <div className="metrics-row">
        <KpiCard 
          title="Total de Leads" 
          value={leadCount} 
          subtitle="Período Atual"
        />
        <KpiCard 
          title="Taxa de Conversão" 
          value={`${winRate.toFixed(1)}%`} 
          subtitle="Win Rate"
          color="primary"
        />
        <KpiCard 
          title="Tempo Médio de Ciclo" 
          value={`${avgCycleTime.toFixed(1)} dias`} 
          subtitle="Lead Cycle Time"
          color="secondary"
        />
        <KpiCard 
          title="Valor Médio de Venda" 
          value={`R$ ${avgDealSize.toLocaleString('pt-BR')}`} 
          subtitle="Average Deal Size"
        />
      </div>
      
      <div className="charts-row">
        <div className="chart-card">
          <h3>Leads por Fonte</h3>
          <PieChart data={filteredSourceData()} />
        </div>
        <div className="chart-card">
          <h3>Leads por Tag</h3>
          <PieChart data={tagChartData} />
        </div>
        <div className="chart-card">
          <h3>Tendência de Leads</h3>
          <LineChart 
            data={monthlyTrends} 
            xKey="month" 
            yKey="leads" 
            label="Leads" 
          />
        </div>
      </div>
      
      <div className="metrics-section">
        <h3>Distribuição por Fonte</h3>
        <div className="metrics-grid">
          {sourceChartData.slice(0, 6).map((source, index) => (
            <div className="metric-item" key={index}>
              <div className="metric-name">{source.name}</div>
              <div className="metric-value">{source.value}</div>
              <div className="metric-bar">
                <div 
                  className="metric-bar-fill" 
                  style={{ 
                    width: `${Math.min(source.value / Math.max(...sourceChartData.map(s => s.value)) * 100, 100)}%`,
                    backgroundColor: getColorByIndex(index)
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Componente do Dashboard de Vendas
  const SalesDashboard = () => (
    <div className="dashboard-content">
      <div className="metrics-row">
        <div className="gauge-card">
          <h3>Taxa de Conversão (Win Rate)</h3>
          <GaugeChart value={winRate} />
          <div className="gauge-value">{winRate.toFixed(1)}%</div>
        </div>
        <KpiCard 
          title="Tempo Médio de Ciclo" 
          value={`${avgCycleTime.toFixed(1)} dias`} 
          subtitle="Do contato à venda"
          color="primary"
        />
        <KpiCard 
          title="Valor Médio" 
          value={`R$ ${avgDealSize.toLocaleString('pt-BR')}`} 
          subtitle="Por venda concluída"
          color="secondary"
        />
        <div className="satisfaction-card">
          <h3>Satisfação (CSAT)</h3>
          <div className="satisfaction-value">{Math.round(winRate)}%</div>
          <div className="satisfaction-indicator">
            {winRate >= 70 ? '😀' : winRate >= 50 ? '🙂' : '😐'}
          </div>
        </div>
      </div>
      
      <div className="charts-row">
        <div className="chart-card">
          <h3>Leads por Estágio</h3>
          <PieChart data={stageChartData} />
        </div>
        <div className="chart-card">
          <h3>Leads por Corretor</h3>
          <BarChart 
            data={filteredUserData()} 
            xKey="name" 
            yKey="value" 
            label="Leads"
          />
        </div>
        <div className="chart-card">
          <h3>Taxa de Conversão Mensal</h3>
          <LineChart 
            data={monthlyTrends} 
            xKey="month" 
            yKey="rate" 
            label="Taxa (%)" 
          />
        </div>
      </div>
      
      <div className="metrics-section">
        <h3>Performance por Corretor</h3>
        <div className="metrics-table">
          <div className="table-header">
            <div className="table-cell">Corretor</div>
            <div className="table-cell">Total Leads</div>
            <div className="table-cell">Leads Ativos</div>
            <div className="table-cell">Leads Perdidos</div>
            <div className="table-cell">Taxa Conversão</div>
          </div>
          {Object.keys(leadsPerUser)
            .filter(user => filters.user === 'all' || user === filters.user || user.includes(filters.user))
            .slice(0, 5)
            .map((user, index) => {
              const total = leadsPerUser[user] || 0;
              const active = activeLeadsPerUser[user] || 0;
              const lost = lostLeadsPerUser[user] || 0;
              const rate = total > 0 ? ((total - lost) / total * 100).toFixed(1) : '0.0';
              
              return (
                <div className="table-row" key={index}>
                  <div className="table-cell">{user}</div>
                  <div className="table-cell">{total}</div>
                  <div className="table-cell">{active}</div>
                  <div className="table-cell">{lost}</div>
                  <div className="table-cell">{rate}%</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>SA IMOB Dashboard</h1>
        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeDashboard === 'marketing' ? 'active' : ''}`}
            onClick={() => setActiveDashboard('marketing')}
          >
            Marketing
          </button>
          <button 
            className={`tab-button ${activeDashboard === 'sales' ? 'active' : ''}`}
            onClick={() => setActiveDashboard('sales')}
          >
            Vendas
          </button>
        </div>
      </div>
      
      {/* Barra de filtros */}
      <FilterBar 
        onFilterChange={handleFilterChange}
        dashboardType={activeDashboard}
        pipelines={pipelines}
        sources={sources}
        users={users}
      />
      
      {/* Botões de controle do dashboard */}
      <div className="dashboard-controls">
        <button 
          className={`control-button ${showCustomFields ? 'active' : ''}`}
          onClick={() => setShowCustomFields(!showCustomFields)}
        >
          {showCustomFields ? 'Ocultar Campos Personalizados' : 'Mostrar Campos Personalizados'}
        </button>
        
        <button 
          className="control-button"
          onClick={() => {
            CacheService.clear();
            setLoadedSections([]);
            fetchData();
          }}
        >
          Limpar Cache e Recarregar
        </button>
      </div>
      
      {/* Conteúdo principal do dashboard */}
      {loading ? (
        <ProgressiveLoading 
          loadedSections={loadedSections}
          totalSections={5}
          completedColor="#4E5859"
          pendingColor="#C1C5C9"
        />
      ) : (
        <>
          {activeDashboard === 'marketing' ? <MarketingDashboard /> : <SalesDashboard />}
          {showCustomFields && <CustomFieldsSection />}
        </>
      )}
    </div>
  );
};

export default Dashboard;