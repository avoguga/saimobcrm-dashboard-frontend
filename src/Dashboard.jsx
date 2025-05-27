import { useState, useEffect } from 'react';
import './Dashboard.css';

// Componentes do dashboard
import KpiCard from './components/KpiCard';
import GaugeChart from './components/GaugeChart';
import BarChart from './components/BarChart';
import LineChart from './components/LineChart';
import SatisfactionChart from './components/SatisfactionChart';

const Dashboard = () => {
  // Estados para armazenar os dados da API
  const [leadCount, setLeadCount] = useState(0);
  const [avgCycleTime, setAvgCycleTime] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [leadsPerStage, setLeadsPerStage] = useState({});
  const [leadsPerSource, setLeadsPerSource] = useState({});
  const [leadsPerUser, setLeadsPerUser] = useState({});
  const [monthlyConversionRate, setMonthlyConversionRate] = useState([]);
  const [loading, setLoading] = useState(true);

  // URL base da API (seria melhor colocar em .env)
  const API_URL = 'http://jwwcw84ccswsgkgcw8oc0g0w.167.88.39.225.sslip.io';

  // Função para buscar dados da API
  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar contagem total de leads
      const countResponse = await fetch(`${API_URL}/leads/count`);
      const countData = await countResponse.json();
      setLeadCount(countData.total_leads);

      // Buscar tempo médio de ciclo
      const cycleResponse = await fetch(`${API_URL}/analytics/lead-cycle-time`);
      const cycleData = await cycleResponse.json();
      setAvgCycleTime(cycleData.lead_cycle_time_days);

      // Buscar taxa de conversão
      const winRateResponse = await fetch(`${API_URL}/analytics/win-rate`);
      const winRateData = await winRateResponse.json();
      setWinRate(winRateData.win_rate_percentage);

      // Buscar leads por estágio
      const stageResponse = await fetch(`${API_URL}/leads/by-stage`);
      const stageData = await stageResponse.json();
      setLeadsPerStage(stageData.leads_by_stage);

      // Buscar leads por fonte
      const sourceResponse = await fetch(`${API_URL}/leads/by-source`);
      const sourceData = await sourceResponse.json();
      setLeadsPerSource(sourceData.leads_by_source);

      // Buscar leads por usuário
      const userResponse = await fetch(`${API_URL}/leads/by-user`);
      const userData = await userResponse.json();
      setLeadsPerUser(userData.leads_by_user);

      // Simulação de dados mensais para os gráficos de linha
      // Em produção, esses dados viriam da API
      setMonthlyConversionRate([
        { month: 'Jan', rate: 62 },
        { month: 'Fev', rate: 64 },
        { month: 'Mar', rate: 69 },
        { month: 'Abr', rate: 58 },
        { month: 'Mai', rate: 65 },
        { month: 'Jun', rate: 75 },
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados quando o componente montar
  useEffect(() => {
    fetchData();
  }, []);

  // Cálculo de promotores, passivos e detratores baseado na taxa de conversão
  const promoters = Math.round(winRate);
  const detractors = Math.round(100 - winRate) / 2;
  const passives = Math.round(100 - promoters - detractors);

  // Converter objetos para formato de gráfico
  const stageChartData = Object.entries(leadsPerStage).map(([name, value]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    value
  }));

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Kommo CRM Dashboard</h1>
      </div>
      
      {loading ? (
        <div className="loading">Carregando dados...</div>
      ) : (
        <div className="dashboard-grid">
          {/* Primeira linha */}
          <div className="product-section">
            <div className="product-name">
              <h3>PRODUTO</h3>
              <h2>Vendas Imobiliárias</h2>
              <p>Período Atual</p>
            </div>
            <div className="kpi-card">
              <h3>Tempo Médio de Conversão</h3>
              <div className="kpi-value primary">{avgCycleTime.toFixed(2)} dias</div>
              <p>Período Atual</p>
            </div>
            <div className="kpi-card">
              <h3>Taxa de Satisfação do Cliente (CSAT)</h3>
              <div className="kpi-value danger">{promoters}%</div>
              <p>Período Atual</p>
            </div>
            <div className="satisfaction-indicator">
              <div className="circular-indicator">
                <svg width="80" height="80" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="#444654" />
                  <text x="50" y="50" textAnchor="middle" dy="7" fontSize="24" fill="white">
                    {`${promoters.toFixed(2)}%`}
                  </text>
                </svg>
              </div>
              <div className="satisfaction-label">Promotores</div>
            </div>
          </div>

          {/* Segunda linha */}
          <div className="metric-row">
            <div className="kpi-card">
              <h3>Satisfação do Cliente (CSAT)</h3>
              <div className="satisfaction-value">{promoters}%</div>
              <p>Último Trimestre</p>
            </div>
            <div className="gauge-container">
              <GaugeChart value={winRate} />
              <div className="gauge-label">Taxa de Conversão (CES)</div>
              <div className="gauge-value">{winRate.toFixed(2)}%</div>
            </div>
            <div className="kpi-card">
              <h3>Net Promoter Score (NPS)</h3>
              <div className="satisfaction-value">59%</div>
              <p>Último Trimestre</p>
            </div>
            <div className="metrics-summary">
              <div className="metric-item success">
                <div className="metric-icon">😊</div>
                <div className="metric-values">
                  <div className="metric-value">{promoters.toFixed(2)}%</div>
                  <div className="metric-label">Promotores</div>
                </div>
              </div>
              <div className="metric-item warning">
                <div className="metric-icon">😐</div>
                <div className="metric-values">
                  <div className="metric-value">{passives.toFixed(2)}%</div>
                  <div className="metric-label">Passivos</div>
                </div>
              </div>
              <div className="metric-item danger">
                <div className="metric-icon">😡</div>
                <div className="metric-values">
                  <div className="metric-value">{detractors.toFixed(2)}%</div>
                  <div className="metric-label">Detratores</div>
                </div>
              </div>
            </div>
          </div>

          {/* Terceira linha - Gráficos */}
          <div className="charts-row">
            <div className="chart-container">
              <h3>Distribuição de Leads por Estágio</h3>
              <SatisfactionChart />
            </div>
            <div className="chart-container">
              <h3>Tempo Médio de Resposta por Mês</h3>
              <LineChart 
                data={monthlyConversionRate} 
                xKey="month" 
                yKey="rate" 
                label="Tempo (h)" 
              />
            </div>
            <div className="chart-container">
              <h3>Taxa de Conversão por Mês</h3>
              <LineChart 
                data={monthlyConversionRate} 
                xKey="month" 
                yKey="rate" 
                label="CSAT (%)" 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;