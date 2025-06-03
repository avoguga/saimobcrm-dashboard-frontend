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

  // Carregar dados de marketing (só quando period muda)
  useEffect(() => {
    const fetchMarketingData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const days = parseInt(period.replace('d', ''));
        const marketingResult = await KommoAPI.getMarketingDashboardComplete(days);
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
  }, [period]);

  // Carregar dados de vendas (quando period OU selectedCorretor muda)
  useEffect(() => {
    const fetchSalesData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const days = parseInt(period.replace('d', ''));
        const salesResult = await KommoAPI.getSalesDashboardComplete(days, selectedCorretor);
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
  }, [period, selectedCorretor]);

  // Atualizar dados
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const days = parseInt(period.replace('d', ''));
      
      if (activeTab === 'marketing') {
        const marketingResponse = await KommoAPI.getMarketingDashboardComplete(days);
        setMarketingData(marketingResponse);
      } else {
        const salesResponse = await KommoAPI.getSalesDashboardComplete(days, selectedCorretor);
        setSalesData(salesResponse);
      }
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      setError(`Não foi possível atualizar os dados: ${error.message}`);
    } finally {
      setIsLoading(false);
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