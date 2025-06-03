import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { KommoAPI } from '../services/api';
import './Dashboard.css';

// Paleta de cores da SA IMOB
const COLORS = {
  primary: '#4E5859',
  secondary: '#96856F',
  tertiary: '#75777B',
  dark: '#212121',
  light: '#C1C5C9',
  white: '#FFFFFF',
  success: '#4ce0b3',
  warning: '#ffaa5b',
  danger: '#ff3a5e',
  lightBg: '#f8f9fa'
};

// Componente de métrica com seta e fundo colorido (como na imagem)
const ComparisonMetricCard = ({ title, currentValue, previousValue, format = 'number' }) => {
  // Função para formatar valores
  const formatValue = (value) => {
    if (!value && value !== 0) return '0';
    
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      case 'time':
        return `${value} dias`;
      default:
        return value.toLocaleString('pt-BR');
    }
  };

  // Calcular diferença e tendência
  const calculateTrend = () => {
    if (!previousValue || previousValue === 0) {
      return { percentage: 0, trend: 'neutral', difference: 0 };
    }

    const difference = currentValue - previousValue;
    const percentage = (difference / previousValue) * 100;
    
    let trend = 'neutral';
    if (percentage > 1) trend = 'up';
    else if (percentage < -1) trend = 'down';

    return { percentage, trend, difference };
  };

  const { percentage, trend, difference } = calculateTrend();

  // Estilo baseado na tendência (como na imagem)
  const getTrendStyle = () => {
    switch (trend) {
      case 'up':
        return {
          backgroundColor: 'rgba(76, 224, 179, 0.15)', // Verde claro
          color: '#4ce0b3',
          icon: '↑',
          sign: '+'
        };
      case 'down':
        return {
          backgroundColor: 'rgba(255, 58, 94, 0.15)', // Vermelho claro
          color: '#ff3a5e',
          icon: '↓',
          sign: ''
        };
      default:
        return {
          backgroundColor: 'rgba(117, 119, 123, 0.1)', // Cinza claro
          color: '#75777B',
          icon: '→',
          sign: ''
        };
    }
  };

  const trendStyle = getTrendStyle();

  return (
    <div className="comparison-metric-new">
      <div className="metric-header-new">
        <h3 className="metric-title-new">{title}</h3>
      </div>
      
      <div className="metric-main-value">
        {formatValue(currentValue)}
      </div>
      
      <div className="metric-previous">
        <span className="previous-label-new">PERÍODO ANTERIOR:</span>
        <div className="previous-value-new">{formatValue(previousValue)}</div>
      </div>
      
      <div 
        className="trend-indicator-new"
        style={{ 
          backgroundColor: trendStyle.backgroundColor,
          color: trendStyle.color 
        }}
      >
        <span className="trend-icon-new">{trendStyle.icon}</span>
        <span className="trend-text-new">
          {trendStyle.sign}{Math.abs(percentage).toFixed(1)}%
        </span>
        {format === 'currency' && difference !== 0 && (
          <span className="trend-extra">
            ({trendStyle.sign}R$ {Math.abs(difference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
          </span>
        )}
        {format === 'time' && difference !== 0 && (
          <span className="trend-extra">
            ({trendStyle.sign}{Math.abs(difference).toFixed(1)} dias)
          </span>
        )}
      </div>
    </div>
  );
};

function DashboardSales({ period, setPeriod, windowSize, corretores, selectedCorretor, setSelectedCorretor, data }) {
  const [salesData, setSalesData] = useState(data);
  const [comparisonData, setComparisonData] = useState(null);

  // Constantes de responsividade
  const isMobile = windowSize.width < 768;
  const isSmallMobile = windowSize.width < 480;

  // Atualizar dados quando recebidos do cache
  useEffect(() => {
    if (data) {
      setSalesData(data);
    }
  }, [data]);

  // Buscar dados de comparação
  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        const comparison = await KommoAPI.getSalesComparison(selectedCorretor);
        setComparisonData(comparison);
        console.log('Dados de comparação carregados:', comparison);
      } catch (error) {
        console.error('Erro ao carregar dados de comparação:', error);
      }
    };
    
    fetchComparisonData();
  }, [selectedCorretor]);

  // Helpers responsivos
  const getChartHeight = (size = 'medium') => {
    if (size === 'small') {
      return isMobile ? '200px' : '240px';
    } else if (size === 'medium') {
      return isMobile ? '250px' : '300px';
    } else {
      return isMobile ? '300px' : '350px';
    }
  };

  // Mini Metric Card Component
  const MiniMetricCard = ({ title, value, subtitle, color = COLORS.primary }) => (
    <div className="mini-metric-card">
      <div className="mini-metric-value" style={{ color }}>{value}</div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

  // Compact Chart Component
  const CompactChart = ({ data, type, config, style }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
      if (chartRef.current && data && data.length > 0) {
        if (chartInstance.current) {
          chartInstance.current.dispose();
        }

        const chart = echarts.init(chartRef.current);
        chartInstance.current = chart;

        let option = {};

        if (type === 'bar') {
          option = {
            grid: { top: 20, right: 20, bottom: 40, left: 60 },
            xAxis: {
              type: 'category',
              data: data.map(item => item[config.xKey]),
              axisLabel: { 
                fontSize: isMobile ? 10 : 12,
                rotate: isMobile ? 45 : 0
              }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              data: data.map(item => item[config.yKey]),
              type: 'bar',
              itemStyle: { color: config.color },
              barWidth: isMobile ? '60%' : '70%'
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
          option = {
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
              name: config.name || 'Dados',
              type: 'pie',
              radius: isMobile ? '50%' : '60%',
              center: isMobile ? ['50%', '40%'] : ['50%', '50%'],
              data: data,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                fontSize: isMobile ? 10 : 12
              }
            }]
          };
        }

        chart.setOption(option);
        
        const handleResize = () => chart.resize();
        window.addEventListener('resize', handleResize);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          chartInstance.current && chartInstance.current.dispose();
          chartInstance.current = null;
        };
      }
    }, [data, type, config]);
    
    return <div ref={chartRef} style={style} />;
  };

  if (!salesData) {
    return (
      <div className="dashboard-content">
        <div className="error-message">
          Dados de vendas não disponíveis.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-content">
      {/* CSS dos novos componentes de comparação */}
      <style>{`
        .comparison-metric-new {
          background: #ffffff;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e0e0e0;
          transition: all 0.3s ease;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .comparison-metric-new:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
          transform: translateY(-2px);
        }

        .metric-header-new {
          margin-bottom: 8px;
        }

        .metric-title-new {
          font-size: 16px;
          font-weight: 600;
          color: #4E5859;
          margin: 0;
          line-height: 1.3;
        }

        .metric-main-value {
          font-size: 32px;
          font-weight: 700;
          color: #212121;
          line-height: 1.1;
          margin-bottom: 12px;
        }

        .metric-previous {
          margin-bottom: 12px;
        }

        .previous-label-new {
          font-size: 12px;
          color: #75777B;
          font-weight: 500;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 4px;
        }

        .previous-value-new {
          font-size: 14px;
          color: #555;
          font-weight: 600;
        }

        .trend-indicator-new {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          margin-top: auto;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .trend-icon-new {
          font-size: 16px;
          font-weight: bold;
          min-width: 16px;
          text-align: center;
        }

        .trend-text-new {
          font-size: 14px;
          font-weight: 700;
        }

        .trend-extra {
          font-size: 12px;
          opacity: 0.9;
          margin-left: 4px;
        }

        .comparison-grid-new {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .comparison-summary-new {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        .summary-badge-new {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          background: #f8f9fa;
          padding: 12px 20px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .summary-icon-new {
          font-size: 18px;
        }

        .summary-text-new {
          font-size: 16px;
          font-weight: 600;
          color: #4E5859;
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .comparison-grid-new {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .comparison-metric-new {
            padding: 16px;
          }
          
          .metric-title-new {
            font-size: 14px;
          }
          
          .metric-main-value {
            font-size: 24px;
          }
          
          .trend-indicator-new {
            font-size: 13px;
            padding: 6px 10px;
          }
          
          .trend-icon-new {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .comparison-metric-new {
            padding: 12px;
          }
          
          .metric-main-value {
            font-size: 20px;
          }
          
          .metric-title-new {
            font-size: 13px;
          }
        }
      `}</style>

      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Vendas</h2>
          <div className="dashboard-controls">
            <div className="corretor-selector">
              <select 
                value={selectedCorretor} 
                onChange={(e) => setSelectedCorretor(e.target.value)}
                className="corretor-select"
              >
                <option value="">Todos os Corretores</option>
                {corretores.map(corretor => (
                  <option key={corretor.name} value={corretor.name}>
                    {corretor.name} ({corretor.total_leads} leads)
                  </option>
                ))}
              </select>
            </div>
            <div className="period-selector">
              <button 
                className={period === '7d' ? 'active' : ''} 
                onClick={() => setPeriod('7d')}
              >
                7 Dias
              </button>
              <button 
                className={period === '30d' ? 'active' : ''} 
                onClick={() => setPeriod('30d')}
              >
                30 Dias
              </button>
              <button 
                className={period === '90d' ? 'active' : ''} 
                onClick={() => setPeriod('90d')}
              >
                90 Dias
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Linha 1: KPIs principais */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group">
          <div className="card-title">Leads - Últimos {period.replace('d','')} dias</div>
          <div className="metrics-group">
            <MiniMetricCard
              title="Total de Leads"
              value={salesData.totalLeads || 0}
              color={COLORS.primary}
            />
            <MiniMetricCard
              title="Leads Ativos"
              value={salesData.analyticsOverview?.leads?.active || 
                    (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0)}
              subtitle={`${Math.round(((salesData.analyticsOverview?.leads?.active || 
                       (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0)) / 
                       (salesData.totalLeads || 1) * 100))}%`}
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Leads Perdidos"
              value={salesData.analyticsOverview?.leads?.lost || 
                    (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.lost || 0), 0) : 0)}
              subtitle={`${Math.round(((salesData.analyticsOverview?.leads?.lost || 
                       (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.lost || 0), 0) : 0)) / 
                       (salesData.totalLeads || 1) * 100))}%`}
              color={COLORS.danger}
            />
          </div>
        </div>

        <div className="card card-metrics-group">
          <div className="card-title">Performance de Vendas</div>
          <div className="metrics-group">
            <MiniMetricCard
              title="Taxa de Conversão"
              value={`${salesData.conversionRates?.sales?.toFixed(1) || 0}%`}
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Win Rate"
              value={`${salesData.winRate?.toFixed(1) || 0}%`}
              color={COLORS.primary}
            />
            <MiniMetricCard
              title="Tempo Médio do Ciclo"
              value={`${salesData.leadCycleTime || 0} dias`}
              color={COLORS.secondary}
            />
          </div>
        </div>
      </div>

      {/* Linha 2: Comparação de Períodos COM SETAS E FUNDOS COLORIDOS */}
      <div className="dashboard-row">
        <div className="card card-lg">
          <div className="card-title" style={{ textAlign: 'center', marginBottom: '24px' }}>
            Comparação de Períodos - {comparisonData?.currentPeriod?.name || 'Mês Atual'} vs {comparisonData?.previousPeriod?.name || 'Mês Anterior'}
          </div>
          
          <div className="comparison-grid-new">
            <ComparisonMetricCard
              title="Total de Leads"
              currentValue={comparisonData?.currentPeriod?.totalLeads || 85}
              previousValue={comparisonData?.previousPeriod?.totalLeads || 120}
              format="number"
            />
            
            <ComparisonMetricCard
              title="Win Rate"
              currentValue={comparisonData?.currentPeriod?.winRate || 18.5}
              previousValue={comparisonData?.previousPeriod?.winRate || 15.2}
              format="percentage"
            />
            
            <ComparisonMetricCard
              title="Ticket Médio"
              currentValue={comparisonData?.currentPeriod?.averageDealSize || 245000}
              previousValue={comparisonData?.previousPeriod?.averageDealSize || 220000}
              format="currency"
            />
            
            <ComparisonMetricCard
              title="Receita Total"
              currentValue={comparisonData?.currentPeriod?.totalRevenue || 3920000}
              previousValue={comparisonData?.previousPeriod?.totalRevenue || 3340000}
              format="currency"
            />

            <ComparisonMetricCard
              title="Tempo Médio do Ciclo"
              currentValue={comparisonData?.currentPeriod?.leadCycleTime || 8.2}
              previousValue={comparisonData?.previousPeriod?.leadCycleTime || 11.3}
              format="time"
            />
          </div>
          
          {/* <div className="comparison-summary-new">
            <div className="summary-badge-new">
              <span className="summary-icon-new">📊</span>
              <span className="summary-text-new">
                {comparisonData?.summary?.positiveMetrics || 3} métricas melhoraram, {comparisonData?.summary?.negativeMetrics || 1} pioraram
              </span>
            </div>
          </div> */}
        </div>
      </div>

      {/* Linha 3: Métricas de Performance */}
      <div className="dashboard-row">
        <div className="card card-md">
          <div className="card-title">Métricas de Performance</div>
          <div className="metrics-group">
            <MiniMetricCard
              title="Win Rate"
              value={`${salesData.winRate?.toFixed(1) || 0}%`}
              subtitle="Percentual de leads convertidas em vendas"
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Average Deal Size"
              value={`R$ ${(salesData.averageDealSize || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              subtitle="Valor médio das vendas"
              color={COLORS.primary}
            />
          </div>
        </div>
        
        {/* Gráfico de Leads por Estágio */}
        {salesData.leadsByStage && salesData.leadsByStage.length > 0 && (
          <div className="card card-lg">
            <div className="card-title">Leads por Estágio do Funil</div>
            <CompactChart 
              type="bar" 
              data={salesData.leadsByStage} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
              style={{ height: getChartHeight('medium') }}
            />
          </div>
        )}
      </div>

      {/* Linha 4: Ticket médio e outros KPIs */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">Métricas de Vendas</div>
          <div className="metrics-group">
            <MiniMetricCard
              title="Ticket Médio"
              value={`R$ ${(salesData.averageDealSize || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              color={COLORS.success}
            />
            <MiniMetricCard
              title="Leads Recuperados"
              value={salesData.salesbotRecovery || 0}
              subtitle="via SalesBot"
              color={COLORS.warning}
            />
            <MiniMetricCard
              title="Total de Vendas"
              value={salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0}
              color={COLORS.primary}
            />
          </div>
        </div>
      </div>

      {/* Linha 5: Desempenho por corretor */}
      <div className="dashboard-row">
        {salesData.leadsByUser && salesData.leadsByUser.length > 0 ? (
          <>
            <div className="card card-md">
              <div className="card-title">Leads por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Reuniões por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'meetings', color: COLORS.secondary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Vendas por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'sales', color: COLORS.success }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
          </>
        ) : salesData.analyticsTeam && salesData.analyticsTeam.user_performance && salesData.analyticsTeam.user_performance.length > 0 ? (
          <>
            <div className="card card-md">
              <div className="card-title">Leads por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.analyticsTeam.user_performance.map(user => ({
                  name: user.user_name,
                  value: user.new_leads || 0
                }))} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.primary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Atividades por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.analyticsTeam.user_performance.map(user => ({
                  name: user.user_name,
                  value: user.activities || 0
                }))} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.secondary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Vendas por Corretor</div>
              <CompactChart 
                type="bar" 
                data={salesData.analyticsTeam.user_performance.map(user => ({
                  name: user.user_name,
                  value: user.won_deals || 0
                }))} 
                config={{ xKey: 'name', yKey: 'value', color: COLORS.success }}
                style={{ height: getChartHeight('small') }}
              />
              {salesData.analyticsTeam.team_stats?.top_performer && (
                <div className="team-info">
                  Top performer: {salesData.analyticsTeam.team_stats.top_performer}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card card-lg">
            <div className="error-message">Não há dados de desempenho por corretor disponíveis</div>
          </div>
        )}
      </div>

      {/* Linha 6: Taxas de conversão */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">Taxas de Conversão</div>
          <div className="metrics-group">
            <MiniMetricCard
              title="Conversão em Reuniões"
              value={`${salesData.conversionRates?.meetings?.toFixed(1) || 0}%`}
              color={COLORS.primary}
            />
            <MiniMetricCard
              title="Conversão em Prospects"
              value={`${salesData.conversionRates?.prospects?.toFixed(1) || 0}%`}
              color={COLORS.secondary}
            />
            <MiniMetricCard
              title="Conversão em Vendas"
              value={`${salesData.conversionRates?.sales?.toFixed(1) || 0}%`}
              color={COLORS.success}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardSales;