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

function DashboardSales({ period, setPeriod, windowSize, corretores, selectedCorretor, setSelectedCorretor, data, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod }) {
  const [salesData, setSalesData] = useState(data);
  const [comparisonData, setComparisonData] = useState(null);
  
  // Estado do modal
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: '', // 'reunioes', 'propostas', 'vendas'
    title: '',
    isLoading: false,
    data: [],
    error: null
  });
  

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

  // Função para abrir modal e buscar dados
  const openModal = async (type) => {
    const titles = {
      'reunioes': 'Reuniões Realizadas',
      'propostas': 'Propostas Enviadas', 
      'vendas': 'Vendas Realizadas'
    };

    setModalState({
      isOpen: true,
      type,
      title: titles[type],
      isLoading: true,
      data: [],
      error: null
    });

    try {
      // Calcular dias baseado no período
      const calculateDays = () => {
        if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
          const start = new Date(customPeriod.startDate);
          const end = new Date(customPeriod.endDate);
          return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        }
        return parseInt(period.replace('d', ''));
      };

      const days = calculateDays();
      const extraParams = {};
      
      // Se for período customizado, enviar datas específicas
      if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
        extraParams.start_date = customPeriod.startDate;
        extraParams.end_date = customPeriod.endDate;
      }

      const tablesData = await KommoAPI.getDetailedTables(days, selectedCorretor, extraParams);
      
      // Mapear o tipo para o campo correto
      const dataMap = {
        'reunioes': tablesData.reunioesDetalhes || [],
        'propostas': tablesData.propostasDetalhes || [],
        'vendas': tablesData.vendasDetalhes || []
      };

      setModalState(prev => ({
        ...prev,
        isLoading: false,
        data: dataMap[type]
      }));
    } catch (error) {
      console.error('Erro ao carregar dados do modal:', error);
      setModalState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }));
    }
  };

  // Função para fechar modal
  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: '',
      title: '',
      isLoading: false,
      data: [],
      error: null
    });
  };


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

  // Metric Card with Colored Trend Component
  const MetricCardWithTrend = ({ title, current, previous, color = COLORS.primary }) => {
    const getTrendInfo = () => {
      if (previous === 0 || !previous) return { text: '', color: COLORS.tertiary, bg: 'rgba(117, 119, 123, 0.1)' };
      
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
        <div className="mini-metric-value" style={{ color }}>{current}</div>
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
          // Preparar dados com cores personalizadas
          const pieData = data.map((item, index) => ({
            ...item,
            itemStyle: {
              color: config.colors && config.colors[index] ? config.colors[index] : 
                     ['#4E5859', '#96856F', '#4ce0b3', '#ffaa5b', '#ff3a5e'][index % 5]
            }
          }));

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
              radius: isMobile ? ['20%', '50%'] : ['25%', '60%'],
              center: isMobile ? ['50%', '40%'] : ['50%', '50%'],
              data: pieData,
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              },
              label: {
                fontSize: isMobile ? 10 : 12,
                formatter: '{b}\n{c} ({d}%)'
              },
              labelLine: {
                show: true
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
      {/* CSS dos novos componentes de comparação e filtros de período */}
      <style>{`
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

        /* Estilos para as tabelas de detalhes */
        .details-tabs {
          display: flex;
          gap: 2px;
          border-bottom: 2px solid #e0e0e0;
          margin-bottom: 20px;
        }

        .details-tab {
          padding: 12px 20px;
          border: none;
          background: #f8f9fa;
          color: #75777B;
          cursor: pointer;
          border-radius: 8px 8px 0 0;
          font-weight: 500;
          transition: all 0.2s ease;
          border-bottom: 3px solid transparent;
        }

        .details-tab:hover {
          background: #e9ecef;
          color: #4E5859;
        }

        .details-tab.active {
          background: #ffffff;
          color: #4E5859;
          font-weight: 600;
          border-bottom-color: #4E5859;
        }

        .details-table-container {
          width: 100%;
        }

        .details-table-wrapper {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .details-table th {
          background: #f8f9fa;
          padding: 16px 12px;
          text-align: left;
          font-weight: 600;
          color: #4E5859;
          border-bottom: 2px solid #e0e0e0;
          white-space: nowrap;
        }

        .details-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #f0f0f0;
          color: #212121;
        }

        .details-table tr:hover {
          background: #f8f9fa;
        }

        .details-table tr:last-child td {
          border-bottom: none;
        }

        .card-full {
          width: 100%;
          grid-column: 1 / -1;
        }

        /* Responsividade para tabelas */
        @media (max-width: 768px) {
          .details-tabs {
            flex-direction: column;
            gap: 4px;
          }
          
          .details-tab {
            border-radius: 6px;
            text-align: center;
          }
          
          .details-table th,
          .details-table td {
            padding: 10px 8px;
            font-size: 14px;
          }
          
          .details-table-wrapper {
            overflow-x: scroll;
          }
        }
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
                  {isMobile && <div className="custom-period-overlay" onClick={() => setShowCustomPeriod(false)} />}
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
      </div>

      {/* Linha 1: KPIs principais */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group">
          <div className="card-title">Leads - Últimos {period.replace('d','')} dias</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="Total de Leads"
              value={salesData.totalLeads || 0}
              current={salesData.totalLeads || 0}
              previous={comparisonData?.previousPeriod?.totalLeads || 0}
              subtitle="Leads"
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="Leads Ativos"
              value={salesData.analyticsOverview?.leads?.active || 
                    (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0)}
              current={salesData.analyticsOverview?.leads?.active || 
                      (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0)}
              previous={comparisonData?.previousPeriod?.activeLeads || 0}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="Leads Perdidos"
              value={salesData.analyticsOverview?.leads?.lost || 
                    (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.lost || 0), 0) : 0)}
              current={salesData.analyticsOverview?.leads?.lost || 
                      (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.lost || 0), 0) : 0)}
              previous={comparisonData?.previousPeriod?.lostLeads || 0}
              color={COLORS.danger}
            />
          </div>
        </div>

        <div className="card card-metrics-group">
          <div className="card-title">Performance de Vendas</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="Total Reunião Realizada"
              value={salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0}
              current={salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0}
              previous={0}
              subtitle="Reuniões"
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="Win Rate"
              value={`${salesData.winRate?.toFixed(1) || 0}%`}
              current={salesData.winRate || 0}
              previous={comparisonData?.previousPeriod?.winRate || 0}
              color={COLORS.primary}
            />
            <MiniMetricCardWithTrend
              title="Total Vendas"
              value={salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0}
              current={salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0}
              previous={comparisonData?.previousPeriod?.wonLeads || 0}
              subtitle="Vendas"
              color={COLORS.secondary}
            />
          </div>
        </div>
      </div>

      {/* Linha 2: Gráfico de Leads por Categoria */}
      <div className="dashboard-row">
        {/* Gráfico de Leads por Categoria do Funil */}
        <div className="card card-lg">
          <div className="card-title">Status dos Leads</div>
          <CompactChart 
            type="pie" 
            data={[
              { 
                name: 'Leads em Negociação', 
                value: salesData.analyticsOverview?.leads?.active || 
                       (salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.active || 0), 0) : 0)
              },
              { 
                name: 'Leads em Remarketing', 
                value: salesData.leadsByStage?.find(stage => stage.name === 'REMARKETING')?.value || 0
              },
              { 
                name: 'Leads Reativados', 
                value: salesData.salesbotRecovery || 0
              }
            ].filter(item => item.value > 0)} 
            config={{ 
              name: 'Status dos Leads',
              colors: [COLORS.primary, COLORS.secondary, COLORS.success]
            }}
            style={{ height: getChartHeight('medium') }}
          />
        </div>
      </div>

      {/* Linha 4: Ticket médio e outros KPIs */}
      <div className="dashboard-row row-compact">
        <div className="card card-metrics-group wide">
          <div className="card-title">Métricas de Vendas</div>
          <div className="metrics-group">
            <MiniMetricCardWithTrend
              title="Ticket Médio"
              value={`R$ ${(salesData.averageDealSize || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              current={salesData.averageDealSize || 0}
              previous={comparisonData?.previousPeriod?.averageDealSize || 0}
              color={COLORS.success}
            />
            <MiniMetricCardWithTrend
              title="Receita Total"
              value={`R$ ${(comparisonData?.currentPeriod?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              current={comparisonData?.currentPeriod?.totalRevenue || 0}
              previous={comparisonData?.previousPeriod?.totalRevenue || 0}
              subtitle="Receita"
              color={COLORS.warning}
            />
            <MiniMetricCardWithTrend
              title="Leads Perdidos"
              value={salesData.analyticsOverview?.leads?.lost || 0}
              current={salesData.analyticsOverview?.leads?.lost || 0}
              previous={comparisonData?.previousPeriod?.lostLeads || 0}
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
              <div className="card-title">Rank Corretores - Reunião</div>
              <CompactChart 
                type="bar" 
                data={salesData.leadsByUser} 
                config={{ xKey: 'name', yKey: 'meetings', color: COLORS.secondary }}
                style={{ height: getChartHeight('small') }}
              />
            </div>
            
            <div className="card card-md">
              <div className="card-title">Rank Corretores - Venda</div>
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
              <div className="card-title">Rank Corretores - Venda</div>
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
          <div className="card-title">
            Taxas de Conversão
          </div>
          <div className="metrics-group">
            <div 
              onClick={() => openModal('reunioes')} 
              onKeyDown={(e) => e.key === 'Enter' && openModal('reunioes')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das reuniões realizadas"
              className="conversion-card-enhanced"
            >
              <div className="conversion-card-content">
                <div className="conversion-header">
                  <h4 className="conversion-title">Conversão em Reuniões</h4>
                  <div className="click-indicator">
                    <span className="click-text">Ver detalhes</span>
                    <div className="click-arrow">→</div>
                  </div>
                </div>
                
                <div className="conversion-value-section">
                  <div className="conversion-main-value">
                    {(salesData.conversionRates?.meetings || 0).toFixed(1)}%
                  </div>
                  
                  <div className="conversion-trend">
                    {(() => {
                      const current = salesData.conversionRates?.meetings || 0;
                      const previous = comparisonData?.previousPeriod?.conversionRates?.meetings || 0;
                      const change = previous ? ((current - previous) / previous * 100) : 0;
                      const isPositive = change >= 0;
                      return (
                        <div className={`trend-badge ${isPositive ? 'positive' : 'negative'}`}>
                          <span className="trend-arrow">{isPositive ? '↗' : '↘'}</span>
                          <span className="trend-value">{Math.abs(change).toFixed(1)}%</span>
                        </div>
                      );
                    })()} 
                  </div>
                </div>
              </div>
            </div>
            <div 
              onClick={() => openModal('propostas')} 
              onKeyDown={(e) => e.key === 'Enter' && openModal('propostas')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das propostas realizadas"
              className="conversion-card-enhanced"
            >
              <div className="conversion-card-content">
                <div className="conversion-header">
                  <h4 className="conversion-title">Conversão em Propostas</h4>
                  <div className="click-indicator">
                    <span className="click-text">Ver detalhes</span>
                    <div className="click-arrow">→</div>
                  </div>
                </div>
                
                <div className="conversion-value-section">
                  <div className="conversion-main-value">
                    {(salesData.conversionRates?.prospects || 0).toFixed(1)}%
                  </div>
                  
                  <div className="conversion-details">
                    <div className="conversion-subtitle">
                      {salesData.proposalStats ? 
                        `${salesData.proposalStats.total || 0} de ${salesData.totalLeads || 0} leads` : 
                        'Dados não disponíveis'
                      }
                    </div>
                    
                    <div className="conversion-trend">
                      {(() => {
                        const current = salesData.conversionRates?.prospects || 0;
                        const previous = comparisonData?.previousPeriod?.conversionRates?.prospects || 0;
                        const change = previous ? ((current - previous) / previous * 100) : 0;
                        const isPositive = change >= 0;
                        return (
                          <div className={`trend-badge ${isPositive ? 'positive' : 'negative'}`}>
                            <span className="trend-arrow">{isPositive ? '↗' : '↘'}</span>
                            <span className="trend-value">{Math.abs(change).toFixed(1)}%</span>
                          </div>
                        );
                      })()} 
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div 
              onClick={() => openModal('vendas')} 
              onKeyDown={(e) => e.key === 'Enter' && openModal('vendas')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das vendas realizadas"
              className="conversion-card-enhanced"
            >
              <div className="conversion-card-content">
                <div className="conversion-header">
                  <h4 className="conversion-title">Conversão em Vendas</h4>
                  <div className="click-indicator">
                    <span className="click-text">Ver detalhes</span>
                    <div className="click-arrow">→</div>
                  </div>
                </div>
                
                <div className="conversion-value-section">
                  <div className="conversion-main-value">
                    {(salesData.conversionRates?.sales || 0).toFixed(1)}%
                  </div>
                  
                  <div className="conversion-trend">
                    {(() => {
                      const current = salesData.conversionRates?.sales || 0;
                      const previous = comparisonData?.previousPeriod?.conversionRates?.sales || 0;
                      const change = previous ? ((current - previous) / previous * 100) : 0;
                      const isPositive = change >= 0;
                      return (
                        <div className={`trend-badge ${isPositive ? 'positive' : 'negative'}`}>
                          <span className="trend-arrow">{isPositive ? '↗' : '↘'}</span>
                          <span className="trend-value">{Math.abs(change).toFixed(1)}%</span>
                        </div>
                      );
                    })()} 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para tabelas detalhadas */}
      {modalState.isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              width: '800px',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do modal */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px',
              borderBottom: `2px solid ${COLORS.primary}`,
              paddingBottom: '12px'
            }}>
              <h3 style={{ margin: 0, color: COLORS.primary }}>{modalState.title}</h3>
              <button 
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: COLORS.tertiary,
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Conteúdo do modal */}
            <div>
              {modalState.isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
                  <div>Carregando dados...</div>
                </div>
              ) : modalState.error ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.danger }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
                  <div><strong>Erro ao carregar dados</strong></div>
                  <div style={{ fontSize: '14px', marginTop: '8px' }}>{modalState.error}</div>
                </div>
              ) : modalState.data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: COLORS.tertiary }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>
                    {modalState.type === 'reunioes' ? '📊' : 
                     modalState.type === 'propostas' ? '📋' : '💰'}
                  </div>
                  <div><strong>Nenhum registro encontrado</strong></div>
                  <div style={{ fontSize: '14px', marginTop: '8px' }}>
                    Não há {modalState.type} no período selecionado.
                  </div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: COLORS.lightBg }}>
                        {modalState.type === 'reunioes' && (
                          <>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Data da Reunião</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Nome do Lead</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Corretor</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Fonte</th>
                          </>
                        )}
                        {modalState.type === 'propostas' && (
                          <>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Data da Proposta</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Nome do Lead</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Corretor</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Fonte</th>
                          </>
                        )}
                        {modalState.type === 'vendas' && (
                          <>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Data da Venda</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Nome do Lead</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Corretor</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Fonte</th>
                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Valor da Venda</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {modalState.data.map((item, index) => (
                        <tr key={index} style={{ 
                          backgroundColor: index % 2 === 0 ? 'white' : COLORS.lightBg,
                          borderBottom: `1px solid ${COLORS.light}`
                        }}>
                          {modalState.type === 'reunioes' && (
                            <>
                              <td style={{ padding: '12px' }}>{item['Data da Reunião']}</td>
                              <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                              <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                              <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                            </>
                          )}
                          {modalState.type === 'propostas' && (
                            <>
                              <td style={{ padding: '12px' }}>{item['Data da Proposta']}</td>
                              <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                              <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                              <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                            </>
                          )}
                          {modalState.type === 'vendas' && (
                            <>
                              <td style={{ padding: '12px' }}>{item['Data da Venda']}</td>
                              <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                              <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                              <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                              <td style={{ padding: '12px', fontWeight: 'bold', color: COLORS.success }}>
                                {item['Valor da Venda']}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {/* Footer com total */}
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px',
                    backgroundColor: COLORS.lightBg,
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: COLORS.primary
                  }}>
                    Total: {modalState.data.length} {modalState.type}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DashboardSales;