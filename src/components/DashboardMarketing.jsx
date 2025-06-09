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

function DashboardMarketing({ period, setPeriod, windowSize, data, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod }) {
  const [marketingData, setMarketingData] = useState(data);

  // Constantes de responsividade
  const isMobile = windowSize.width < 768;
  const isSmallMobile = windowSize.width < 480;

  // Atualizar dados quando recebidos do cache
  useEffect(() => {
    if (data) {
      setMarketingData(data);
    }
  }, [data]);

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

  // Enhanced Mini Metric Card with Trend
  const MiniMetricCardWithTrend = ({ title, value, subtitle, color = COLORS.primary, current, previous }) => {
    const getTrendInfo = () => {
      if (!previous || previous === 0) return { text: '', color: COLORS.tertiary, bg: 'rgba(117, 119, 123, 0.1)', border: 'rgba(117, 119, 123, 0.3)' };
      
      const change = ((current - previous) / previous * 100).toFixed(1);
      const isPositive = change >= 0;
      
      return {
        text: `${isPositive ? '+' : ''}${change}%`,
        icon: isPositive ? '↗' : '↘',
        color: isPositive ? COLORS.success : COLORS.danger,
        bg: isPositive ? 'rgba(76, 224, 179, 0.15)' : 'rgba(255, 58, 94, 0.15)',
        border: isPositive ? 'rgba(76, 224, 179, 0.3)' : 'rgba(255, 58, 94, 0.3)'
      };
    };

    const trendInfo = getTrendInfo();

    return (
      <div className="mini-metric-card">
        <div className="mini-metric-value" style={{ color }}>{value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
          <div className="mini-metric-title">{title}</div>
          {trendInfo.text && (
            <div 
              className={`trend-tag-square ${(current - previous) < 0 ? 'negative' : ''}`}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '2px',
                padding: '8px',
                borderRadius: '8px',
                backgroundColor: trendInfo.bg,
                border: `1px solid ${trendInfo.border}`,
                color: trendInfo.color,
                fontWeight: '600',
                fontSize: '10px',
                minWidth: '40px',
                minHeight: '40px',
                boxShadow: `0 2px 4px ${trendInfo.bg}60`,
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>
                {trendInfo.icon}
              </span>
              <span style={{ lineHeight: 1, fontSize: '13px', fontWeight: '700' }}>
                {trendInfo.text}
              </span>
            </div>
          )}
        </div>
        {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
      </div>
    );
  };

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
        } else if (type === 'line') {
          option = {
            grid: { top: 20, right: 20, bottom: 40, left: 60 },
            xAxis: {
              type: 'category',
              data: data.map(item => item[config.xKey]),
              axisLabel: { 
                fontSize: isMobile ? 9 : 11,
                rotate: isMobile ? 45 : 0
              }
            },
            yAxis: {
              type: 'value',
              axisLabel: { fontSize: isMobile ? 10 : 12 }
            },
            series: [{
              data: data.map(item => item[config.yKey]),
              type: 'line',
              smooth: true,
              itemStyle: { color: config.color },
              lineStyle: { color: config.color, width: 2 }
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


  if (!marketingData) {
    return (
      <div className="dashboard-content">
        <div className="error-message">
          Dados de marketing não disponíveis.
        </div>
      </div>
    );
  }

  const facebookMetrics = marketingData.facebookMetrics;

  return (
    <div className="dashboard-content">
      {/* CSS para trend tags e filtros de período */}
      <style>{`
        .trend-tag-square:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
        }
        
        .trend-tag-square {
          cursor: default;
          user-select: none;
          flex-shrink: 0;
        }

        /* Estilização moderna dos controles de período */
        .period-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: flex-end;
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

        /* Seletor customizado moderno */
        .custom-period-selector {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid #e0e6ed;
          z-index: 1000;
          min-width: 400px;
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .date-inputs {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .date-row {
          display: flex;
          gap: 16px;
          align-items: end;
        }

        .date-input-group {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .date-input-group label {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }

        .date-input-group input[type="date"] {
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          background: #fafbfc;
          transition: all 0.2s ease;
          color: #374151;
        }

        .date-input-group input[type="date"]:focus {
          outline: none;
          border-color: #4E5859;
          background: white;
          box-shadow: 0 0 0 3px rgba(78, 88, 89, 0.1);
        }

        .date-input-group input[type="date"]:hover {
          border-color: #9ca3af;
          background: white;
        }

        .date-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }

        .apply-btn, .cancel-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .apply-btn {
          background: linear-gradient(135deg, #4E5859 0%, #96856F 100%);
          color: white;
        }

        .apply-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #3a4344 0%, #7a6b5a 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(78, 88, 89, 0.3);
        }

        .apply-btn:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .cancel-btn {
          background: #f3f4f6;
          color: #6b7280;
        }

        .cancel-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        /* Quick period shortcuts */
        .quick-periods {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .quick-period-btn {
          padding: 6px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: #fafbfc;
          color: #6b7280;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-period-btn:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
          color: #374151;
        }

        /* Responsividade */
        @media (max-width: 768px) {
          .period-controls {
            align-items: stretch;
          }
          
          .period-selector {
            justify-content: space-between;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .period-selector::-webkit-scrollbar {
            display: none;
          }
          
          .period-selector button {
            padding: 8px 12px;
            font-size: 13px;
            min-width: max-content;
          }
          
          .custom-period-selector {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            right: auto;
            min-width: 90vw;
            max-width: 400px;
            animation: modalFadeIn 0.3s ease;
          }

          .date-row {
            flex-direction: column;
            gap: 12px;
          }
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        /* Overlay para mobile */
        .custom-period-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 999;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Marketing</h2>
          <div className="period-controls">
            <div className="period-selector">
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
                onClick={() => handlePeriodChange('custom')}
              >
                📅 Personalizado
              </button>
            </div>
            
            {/* Seletor de período customizado */}
            {showCustomPeriod && (
              <>
                {windowSize.width <= 768 && <div className="custom-period-overlay" onClick={() => setShowCustomPeriod(false)} />}
                <div className="custom-period-selector">
                  <div className="date-inputs">
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ margin: '0 0 12px 0', color: '#374151', fontSize: '16px', fontWeight: '600' }}>
                        🗓️ Selecionar Período Personalizado
                      </h4>
                      <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                        Escolha as datas de início e fim para análise
                      </p>
                    </div>
                    
                    {/* Shortcuts rápidos */}
                    <div className="quick-periods">
                      <button 
                        className="quick-period-btn"
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(start.getDate() - 180);
                          setCustomPeriod({
                            startDate: start.toISOString().split('T')[0],
                            endDate: end.toISOString().split('T')[0]
                          });
                        }}
                      >
                        Últimos 6 meses
                      </button>
                      <button 
                        className="quick-period-btn"
                        onClick={() => {
                          const end = new Date();
                          const start = new Date();
                          start.setFullYear(start.getFullYear() - 1);
                          setCustomPeriod({
                            startDate: start.toISOString().split('T')[0],
                            endDate: end.toISOString().split('T')[0]
                          });
                        }}
                      >
                        Último ano
                      </button>
                      <button 
                        className="quick-period-btn"
                        onClick={() => {
                          const now = new Date();
                          const start = new Date(now.getFullYear(), 0, 1);
                          setCustomPeriod({
                            startDate: start.toISOString().split('T')[0],
                            endDate: now.toISOString().split('T')[0]
                          });
                        }}
                      >
                        Este ano
                      </button>
                    </div>
                    
                    <div className="date-row">
                      <div className="date-input-group">
                        <label>📅 Data Inicial</label>
                        <input
                          type="date"
                          value={customPeriod.startDate}
                          onChange={(e) => setCustomPeriod({...customPeriod, startDate: e.target.value})}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="date-input-group">
                        <label>📅 Data Final</label>
                        <input
                          type="date"
                          value={customPeriod.endDate}
                          onChange={(e) => setCustomPeriod({...customPeriod, endDate: e.target.value})}
                          max={new Date().toISOString().split('T')[0]}
                          min={customPeriod.startDate}
                        />
                      </div>
                    </div>
                    
                    {customPeriod.startDate && customPeriod.endDate && (
                      <div style={{ 
                        background: '#f0f9ff', 
                        border: '1px solid #bae6fd', 
                        borderRadius: '8px', 
                        padding: '12px', 
                        fontSize: '14px', 
                        color: '#0369a1' 
                      }}>
                        📊 Período selecionado: {Math.ceil((new Date(customPeriod.endDate) - new Date(customPeriod.startDate)) / (1000 * 60 * 60 * 24))} dias
                      </div>
                    )}
                    
                    <div className="date-actions">
                      <button 
                        className="cancel-btn"
                        onClick={() => setShowCustomPeriod(false)}
                      >
                        Cancelar
                      </button>
                      <button 
                        className="apply-btn"
                        onClick={applyCustomPeriod}
                        disabled={!customPeriod.startDate || !customPeriod.endDate}
                      >
                        ✓ Aplicar Período
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Linha 1: KPIs principais */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group">
          <div className="card-title">Leads - Últimos {period.replace('d','')} dias</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="Total de Leads"
              value={marketingData.totalLeads || 0}
              current={marketingData.totalLeads || 0}
              previous={marketingData.previousPeriodLeads || 0}
              color={COLORS.primary}
            />
            {marketingData.leadsBySource && marketingData.leadsBySource.length > 0 && (
              <>
                <MiniMetricCardWithTrend
                  title="Leads Facebook"
                  value={marketingData.leadsBySource.find(src => src.name.includes('Facebook'))?.value || 0}
                  current={marketingData.leadsBySource.find(src => src.name.includes('Facebook'))?.value || 0}
                  previous={marketingData.previousFacebookLeads || 0}
                  subtitle={`${Math.round((marketingData.leadsBySource.find(src => src.name.includes('Facebook'))?.value || 0) / marketingData.totalLeads * 100)}%`}
                  color={COLORS.secondary}
                />
                <MiniMetricCardWithTrend
                  title="Leads OLX"
                  value={marketingData.leadsBySource.find(src => src.name.includes('OLX'))?.value || 0}
                  current={marketingData.leadsBySource.find(src => src.name.includes('OLX'))?.value || 0}
                  previous={marketingData.previousOlxLeads || 0}
                  subtitle={`${Math.round((marketingData.leadsBySource.find(src => src.name.includes('OLX'))?.value || 0) / marketingData.totalLeads * 100)}%`}
                  color={COLORS.tertiary}
                />
              </>
            )}
          </div>
        </div>

        <div className="card card-metrics-group">
          <div className="card-title">Métricas do Facebook Ads</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="Custo por Lead"
              value={`R$ ${facebookMetrics.costPerLead?.toFixed(2) || '0,00'}`}
              current={facebookMetrics.costPerLead || 0}
              previous={marketingData.previousFacebookMetrics?.costPerLead || 0}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="CTR"
              value={`${(facebookMetrics.ctr || 0).toFixed(2)}%`}
              current={facebookMetrics.ctr || 0}
              previous={marketingData.previousFacebookMetrics?.ctr || 0}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="CPC"
              value={`R$ ${(facebookMetrics.cpc || 0).toFixed(2)}`}
              current={facebookMetrics.cpc || 0}
              previous={marketingData.previousFacebookMetrics?.cpc || 0}
              color={COLORS.tertiary}
            />
          </div>
        </div>
      </div>

      {/* Linha 2: Gráficos de distribuição de leads */}
      <div className="dashboard-row">
        {marketingData.leadsBySource && marketingData.leadsBySource.length > 0 && (
          <div className="card card-md">
            <div className="card-title">Leads por Fonte</div>
            <CompactChart 
              type="pie" 
              data={marketingData.leadsBySource} 
              config={{ name: 'Leads por Fonte' }}
              style={{ height: getChartHeight('medium') }}
            />
          </div>
        )}
        
        {marketingData.leadsByTag && marketingData.leadsByTag.length > 0 && (
          <div className="card card-md">
            <div className="card-title">Leads por Tag</div>
            <CompactChart 
              type="bar" 
              data={marketingData.leadsByTag} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.secondary }}
              style={{ height: getChartHeight('medium') }}
            />
          </div>
        )}
        
        {marketingData.leadsByAd && marketingData.leadsByAd.length > 0 && (
          <div className="card card-md">
            <div className="card-title">Leads por Anúncio</div>
            <CompactChart 
              type="bar" 
              data={marketingData.leadsByAd} 
              config={{ xKey: 'name', yKey: 'value', color: COLORS.tertiary }}
              style={{ height: getChartHeight('medium') }}
            />
          </div>
        )}
      </div>

      {/* Linha 3: Tendência e métricas do Facebook */}
      <div className="dashboard-row">
        {marketingData.metricsTrend && marketingData.metricsTrend.length > 0 && (
          <div className="card card-lg">
            <div className="card-title">Tendência de Leads</div>
            <CompactChart 
              type="line" 
              data={marketingData.metricsTrend} 
              config={{ xKey: 'month', yKey: 'leads', color: COLORS.primary }}
              style={{ height: getChartHeight('large') }}
            />
          </div>
        )}
        
        <div className="card card-sm">
          <div className="card-title">Métricas Detalhadas</div>
          <div className="metrics-grid">
            <MiniMetricCardWithTrend
              title="Impressões"
              value={(facebookMetrics.impressions || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.impressions || 0}
              previous={marketingData.previousFacebookMetrics?.impressions || 0}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="Alcance"
              value={(facebookMetrics.reach || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.reach || 0}
              previous={marketingData.previousFacebookMetrics?.reach || 0}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="Cliques"
              value={(facebookMetrics.clicks || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.clicks || 0}
              previous={marketingData.previousFacebookMetrics?.clicks || 0}
              color={COLORS.tertiary}
            />
            <MiniMetricCardWithTrend
              title="Gasto Total"
              value={`R$ ${(facebookMetrics.totalSpent || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              current={facebookMetrics.totalSpent || 0}
              previous={marketingData.previousFacebookMetrics?.totalSpent || 0}
              color={COLORS.warning}
            />
          </div>
        </div>
      </div>

      {/* Linha 4: Engajamento */}
      <div className="dashboard-row">
        <div className="card card-lg">
          <div className="card-title">Engajamento nas Redes Sociais</div>
          <div className="metrics-grid">
            <MiniMetricCardWithTrend
              title="Curtidas"
              value={(facebookMetrics.engagement?.likes || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.likes || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.likes || 0}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="Comentários"
              value={(facebookMetrics.engagement?.comments || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.comments || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.comments || 0}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="Compartilhamentos"
              value={(facebookMetrics.engagement?.shares || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.shares || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.shares || 0}
              color={COLORS.secondary}
            />
            <MiniMetricCardWithTrend
              title="Visualizações de Vídeo"
              value={(facebookMetrics.engagement?.videoViews || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.videoViews || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.videoViews || 0}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="Visitas ao Perfil"
              value={(facebookMetrics.engagement?.profileVisits || 0).toLocaleString('pt-BR')}
              current={facebookMetrics.engagement?.profileVisits || 0}
              previous={marketingData.previousFacebookMetrics?.engagement?.profileVisits || 0}
              color={COLORS.warning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMarketing;