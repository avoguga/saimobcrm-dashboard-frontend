import { useState, useEffect } from 'react';
import { KommoAPI } from '../services/api';
import DashboardMarketing from './DashboardMarketing';
import DashboardSales from './DashboardSales';
import LoadingSpinner from './LoadingSpinner';
import './Dashboard.css';

// Dashboard principal otimizado
function Dashboard() {
  const [activeTab, setActiveTab] = useState('marketing');
  const [period, setPeriod] = useState('7d');
  const [customPeriod, setCustomPeriod] = useState({ startDate: '', endDate: '' });
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);
  const [corretores, setCorretores] = useState([]);
  const [selectedCorretor, setSelectedCorretor] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketingData, setMarketingData] = useState(null);
  const [salesData, setSalesData] = useState(null);
  
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
    const fetchCorretores = async () => {
      try {
        const response = await KommoAPI.getCorretoresList();
        if (response?.corretores) {
          setCorretores(response.corretores);
        }
      } catch (error) {
        console.error('Erro ao carregar lista de corretores:', error);
      }
    };
    
    fetchCorretores();
  }, []);

  // Função para calcular dias do período
  const calculateDays = () => {
    if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
      const start = new Date(customPeriod.startDate);
      const end = new Date(customPeriod.endDate);
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    return parseInt(period.replace('d', ''));
  };

  // Função para verificar se o período está válido para fazer requisição
  const isPeriodValid = () => {
    if (period === 'custom') {
      return customPeriod.startDate && customPeriod.endDate;
    }
    return period && period !== 'custom';
  };

  // Carregar dados de marketing (só quando period está válido) com debounce
  useEffect(() => {
    if (!isPeriodValid()) {
      return; // Não faz nada se o período não estiver válido
    }

    // Debounce de 300ms para evitar múltiplas chamadas
    const timeoutId = setTimeout(() => {
      const fetchMarketingData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const days = calculateDays();
          const params = { days };
          
          // Se for período customizado, enviar datas específicas
          if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            params.start_date = customPeriod.startDate;
            params.end_date = customPeriod.endDate;
          }
          
          const marketingResult = await KommoAPI.getMarketingDashboardComplete(days, params);
          setMarketingData(marketingResult);
          console.log('Marketing dashboard carregado:', marketingResult);
        } catch (error) {
          console.error('Erro ao carregar dados de marketing:', error);
          setError(`Falha ao carregar dados de marketing: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchMarketingData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [period, customPeriod.startDate, customPeriod.endDate]); // Só reage a mudanças específicas

  // Carregar dados de vendas (quando period está válido OU selectedCorretor muda) com debounce
  useEffect(() => {
    if (!isPeriodValid()) {
      return; // Não faz nada se o período não estiver válido
    }

    // Debounce de 300ms para evitar múltiplas chamadas
    const timeoutId = setTimeout(() => {
      const fetchSalesData = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
          const days = calculateDays();
          const params = { days };
          
          // Se for período customizado, enviar datas específicas
          if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
            params.start_date = customPeriod.startDate;
            params.end_date = customPeriod.endDate;
          }
          
          const salesResult = await KommoAPI.getSalesDashboardComplete(days, selectedCorretor, params);
          setSalesData(salesResult);
          console.log('Sales dashboard carregado:', salesResult);
        } catch (error) {
          console.error('Erro ao carregar dados de vendas:', error);
          setError(`Falha ao carregar dados de vendas: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchSalesData();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [period, selectedCorretor, customPeriod.startDate, customPeriod.endDate]); // Só reage a mudanças específicas

  // Atualizar dados (só executa se período for válido)
  const refreshData = async () => {
    if (!isPeriodValid()) {
      console.log('Período inválido, não atualizando dados');
      return;
    }

    setIsLoading(true);
    try {
      const days = calculateDays();
      const params = { days };
      
      // Se for período customizado, enviar datas específicas
      if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
        params.start_date = customPeriod.startDate;
        params.end_date = customPeriod.endDate;
      }
      
      if (activeTab === 'marketing') {
        const marketingResponse = await KommoAPI.getMarketingDashboardComplete(days, params);
        setMarketingData(marketingResponse);
      } else {
        const salesResponse = await KommoAPI.getSalesDashboardComplete(days, selectedCorretor, params);
        setSalesData(salesResponse);
      }
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      setError(`Não foi possível atualizar os dados: ${error.message}`);
    } finally {
      setIsLoading(false);
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

  // Função para aplicar período customizado
  const applyCustomPeriod = () => {
    if (customPeriod.startDate && customPeriod.endDate) {
      // Só fecha o modal, o useEffect já vai detectar que ambas as datas estão preenchidas
      setShowCustomPeriod(false);
      console.log('Período customizado aplicado:', customPeriod);
    }
  };

  return (
    <div className="dashboard-optimized">
      <div className="dashboard-header">
        <div className="brand">
          <h1>SA IMOB</h1>
          <span className="subtitle">Kommo CRM Dashboard</span>
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
          <button className="action-button" onClick={refreshData} disabled={isLoading}>
            <span className="icon">↻</span> {isLoading ? 'Atualizando...' : 'Atualizar'}
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
          data={marketingData}
          customPeriod={customPeriod}
          setCustomPeriod={setCustomPeriod}
          showCustomPeriod={showCustomPeriod}
          setShowCustomPeriod={setShowCustomPeriod}
          handlePeriodChange={handlePeriodChange}
          applyCustomPeriod={applyCustomPeriod}
        />
      ) : (
        <DashboardSales 
          period={period} 
          setPeriod={setPeriod} 
          windowSize={windowSize}
          corretores={corretores}
          selectedCorretor={selectedCorretor}
          setSelectedCorretor={setSelectedCorretor}
          data={salesData}
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
          Dados atualizados em: {new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;