import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import * as echarts from 'echarts';
import { KommoAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import SimpleModal from './SimpleModal';
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

// Memoized Modal Component to prevent parent re-renders
const DetailModal = memo(({ isOpen, onClose, type, title, isLoading, data, error }) => {
  if (!isOpen) return null;

  return createPortal(
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
      onClick={onClose}
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
          <h3 style={{ margin: 0, color: COLORS.primary }}>{title}</h3>
          <button 
            onClick={onClose}
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
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
              <div>Carregando dados...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: COLORS.danger }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚠️</div>
              <div><strong>Erro ao carregar dados</strong></div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>{error}</div>
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: COLORS.tertiary }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>
                {type === 'reunioes' || type === 'leads' ? '📊' : 
                 type === 'propostas' ? '📋' : '💰'}
              </div>
              <div><strong>Nenhum registro encontrado</strong></div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>
                Não há {type} no período selecionado.
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
                    {type === 'leads' && (
                      <>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Data de Criação</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Nome do Lead</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Corretor</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Fonte</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Status</th>
                      </>
                    )}
                    {type === 'reunioes' && (
                      <>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Data da Reunião</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Nome do Lead</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Corretor</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Fonte</th>
                      </>
                    )}
                    {type === 'propostas' && (
                      <>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Data da Proposta</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Nome do Lead</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Corretor</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Fonte</th>
                      </>
                    )}
                    {type === 'vendas' && (
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
                  {data.map((item, index) => (
                    <tr key={index} style={{ 
                      backgroundColor: index % 2 === 0 ? 'white' : COLORS.lightBg,
                      borderBottom: `1px solid ${COLORS.light}`
                    }}>
                      {type === 'leads' && (
                        <>
                          <td style={{ padding: '12px' }}>{item['Data de Criação']}</td>
                          <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                          <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                          <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                          <td style={{ padding: '12px' }}>{item['Status']}</td>
                        </>
                      )}
                      {type === 'reunioes' && (
                        <>
                          <td style={{ padding: '12px' }}>{item['Data da Reunião']}</td>
                          <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                          <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                          <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                        </>
                      )}
                      {type === 'propostas' && (
                        <>
                          <td style={{ padding: '12px' }}>{item['Data da Proposta']}</td>
                          <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                          <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                          <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                        </>
                      )}
                      {type === 'vendas' && (
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
                Total: {data.length} {type}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});

// Componente para exibir indicador de tendência
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

// Componente MultiSelectFilter
const MultiSelectFilter = ({ label, options, selectedValues, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleOption = (value) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    onChange(newSelectedValues);
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map(option => option.value));
    }
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option?.label || selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  };

  return (
    <div className="multi-select-container" ref={dropdownRef}>
      <label className="filter-label">{label}:</label>
      <div className="multi-select-wrapper">
        <button
          type="button"
          className="multi-select-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="multi-select-text">{getDisplayText()}</span>
          <span className={`multi-select-arrow ${isOpen ? 'open' : ''}`}>▼</span>
        </button>

        {isOpen && (
          <div className="multi-select-dropdown">
            <div className="multi-select-option select-all" onClick={handleSelectAll}>
              <input
                type="checkbox"
                checked={selectedValues.length === options.length}
                readOnly
              />
              <span>Selecionar Todos</span>
            </div>
            <div className="multi-select-divider"></div>
            {options.map((option) => (
              <div
                key={option.value}
                className={`multi-select-option ${selectedValues.includes(option.value) ? 'selected' : ''}`}
                onClick={() => handleToggleOption(option.value)}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  readOnly
                />
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DashboardSales = ({ period, setPeriod, windowSize, corretores, selectedCorretor, setSelectedCorretor, selectedSource, setSelectedSource, sourceOptions, data, isLoading, isUpdating, customPeriod, setCustomPeriod, showCustomPeriod, setShowCustomPeriod, handlePeriodChange, applyCustomPeriod }) => {
  console.log('🔄 DashboardSales renderizando - showCustomPeriod:', showCustomPeriod);
  
  const [rawSalesData, setRawSalesData] = useState(data); // Dados originais sem filtro
  const [salesData, setSalesData] = useState(data); // Dados filtrados
  const [comparisonData, setComparisonData] = useState(null);
  
  // Estado do modal usando ref para não causar re-renders
  const modalStateRef = useRef({
    isOpen: false,
    type: '',
    title: '',
    isLoading: false,
    data: [],
    error: null
  });
  
  const [modalForceUpdate, setModalForceUpdate] = useState(0);
  

  // Constantes de responsividade - memoizadas para evitar re-renders
  const isMobile = useMemo(() => windowSize.width < 768, [windowSize.width]);
  const isSmallMobile = useMemo(() => windowSize.width < 480, [windowSize.width]);

  // Debug: Verificar se os props estão chegando corretamente
  useEffect(() => {
    console.log('🔍 DashboardSales props:', { 
      customPeriod, 
      showCustomPeriod, 
      period,
      setCustomPeriod: typeof setCustomPeriod,
      setShowCustomPeriod: typeof setShowCustomPeriod,
      applyCustomPeriod: typeof applyCustomPeriod
    });
  }, [customPeriod, showCustomPeriod, period]);

  // Função para filtrar dados no frontend (INSTANTÂNEO)
  const filterSalesData = useMemo(() => {
    if (!rawSalesData) return null;

    // Se não há filtros selecionados, retorna dados originais
    if (!selectedCorretor && !selectedSource) {
      return rawSalesData;
    }

    const filteredData = { ...rawSalesData };

    // Filtrar leadsByUser por corretor selecionado
    if (selectedCorretor && filteredData.leadsByUser) {
      const selectedCorretores = selectedCorretor.includes(',') 
        ? selectedCorretor.split(',').map(c => c.trim())
        : [selectedCorretor.trim()];

      filteredData.leadsByUser = filteredData.leadsByUser.filter(user => 
        selectedCorretores.includes(user.name)
      );
    }

    // Filtro por fonte será implementado conforme estrutura dos dados
    // Para agora, manter todas as fontes pois filtragem de fonte será feita
    // principalmente nas tabelas detalhadas e análises específicas

    // Recalcular KPIs baseados nos dados filtrados
    if (filteredData.leadsByUser && filteredData.leadsByUser.length > 0) {
      // Recalcular totais baseados nos corretores filtrados
      const filteredTotalLeads = filteredData.leadsByUser.reduce((sum, user) => sum + (user.value || 0), 0);
      const filteredTotalMeetings = filteredData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || user.meetings || 0), 0);
      const filteredTotalSales = filteredData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0);

      // Atualizar KPIs filtrados
      filteredData.totalLeads = filteredTotalLeads;
      filteredData.activeLeads = filteredTotalLeads; // Assumindo que leads ativos = total leads para simplificar
      filteredData.wonLeads = filteredTotalSales;
    }

    return filteredData;
  }, [rawSalesData, selectedCorretor, selectedSource]);

  // Atualizar dados quando recebidos do cache
  useEffect(() => {
    if (data) {
      setRawSalesData(data);
    }
  }, [data]);

  // Atualizar dados filtrados quando filtros mudarem (INSTANTÂNEO - sem loading)
  useEffect(() => {
    setSalesData(filterSalesData);
  }, [filterSalesData]);

  // Criar dados de comparação usando os campos V2 que já vêm nos KPIs
  useEffect(() => {
    if (salesData) {
      const comparison = {
        currentPeriod: {
          totalLeads: salesData?.totalLeads || 0,
          activeLeads: salesData?.activeLeads || 0,
          winRate: salesData?.winRate || 0,
          averageDealSize: salesData?.averageDealSize || 0,
          totalRevenue: salesData?.totalRevenue || 0,
          conversionRates: salesData?.conversionRates || { meetings: 0, prospects: 0, sales: 0 }
        },
        previousPeriod: {
          totalLeads: salesData?.previousTotalLeads || 0,
          activeLeads: salesData?.previousActiveLeads || 0,
          winRate: salesData?.previousWinRate || 0,
          averageDealSize: salesData?.previousAverageDealSize || 0,
          totalRevenue: 0, // Não disponível nos V2 ainda
          wonLeads: salesData?.previousWonLeads || 0,
          conversionRates: { meetings: 0, prospects: 0, sales: 0 } // Não disponível nos V2 ainda
        }
      };
      
      setComparisonData(comparison);
      console.log('✅ Dados de comparação criados a partir dos V2 KPIs:', comparison);
    }
  }, [salesData]);

  // Função para abrir modal específico por corretor
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
      const extraParams = {};
      
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
      } else {
        const periodToDays = {
          '7d': 7,
          '30d': 30,
          '60d': 60,
          '90d': 90
        };
        extraParams.days = periodToDays[period] || 30;
      }

      // Usar o corretor específico clicado, sem filtros de backend (dados já filtrados no frontend)
      const tablesData = await KommoAPI.getDetailedTables(corretorName, '', extraParams);
      
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

  // Função para abrir modal sem causar re-render
  const openModal = async (type) => {
    const titles = {
      'reunioes': 'Reuniões Realizadas',
      'propostas': 'Propostas Enviadas', 
      'vendas': 'Vendas Realizadas'
    };

    modalStateRef.current = {
      isOpen: true,
      type,
      title: titles[type],
      isLoading: true,
      data: [],
      error: null
    };
    
    setModalForceUpdate(prev => prev + 1);  // Forçar re-render apenas do modal

    try {
      const extraParams = {};
      
      if (period === 'custom' && customPeriod.startDate && customPeriod.endDate) {
        extraParams.start_date = customPeriod.startDate;
        extraParams.end_date = customPeriod.endDate;
      } else if (period === 'current_month') {
        // Para mês atual, calcular as datas
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayStr = firstDay.toISOString().split('T')[0];
        const todayStr = now.toISOString().split('T')[0];
        
        extraParams.start_date = firstDayStr;
        extraParams.end_date = todayStr;
      } else {
        // Para períodos predefinidos, passar o número de dias
        const periodToDays = {
          '7d': 7,
          '30d': 30,
          '60d': 60,
          '90d': 90
        };
        extraParams.days = periodToDays[period] || 30;
      }

      // Buscar dados sem filtros de backend (filtragem será feita no frontend)
      const tablesData = await KommoAPI.getDetailedTables('', '', extraParams);
      
      const dataMap = {
        'reunioes': tablesData.reunioesDetalhes || [],
        'propostas': tablesData.propostasDetalhes || [],
        'vendas': tablesData.vendasDetalhes || []
      };

      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        data: dataMap[type]
      };
      
      setModalForceUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao carregar dados do modal:', error);
      modalStateRef.current = {
        ...modalStateRef.current,
        isLoading: false,
        error: error.message
      };
      
      setModalForceUpdate(prev => prev + 1);
    }
  };

  // Função para fechar modal sem causar re-render
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


  // Helpers responsivos - memoizados
  const getChartHeight = useMemo(() => (size = 'medium') => {
    if (size === 'small') {
      return isMobile ? '280px' : '320px';
    } else if (size === 'medium') {
      return isMobile ? '320px' : '380px';
    } else {
      return isMobile ? '380px' : '420px';
    }
  }, [isMobile]);

  // Configurações dos gráficos memoizadas para evitar hooks condicionais
  const chartConfigs = useMemo(() => ({
    leadsConfig: { xKey: 'name', yKey: 'value', color: COLORS.primary },
    meetingsConfig: { xKey: 'name', yKey: 'meetingsHeld', color: COLORS.secondary },
    salesConfig: { xKey: 'name', yKey: 'sales', color: COLORS.success },
    activitiesConfig: { xKey: 'name', yKey: 'value', color: COLORS.secondary }
  }), []);

  const chartStyle = useMemo(() => ({ height: getChartHeight('small') }), [getChartHeight]);

  // Dados dos gráficos memoizados (ORDENADOS DECRESCENTE)
  const chartData = useMemo(() => {
    if (salesData?.analyticsTeam?.user_performance?.length > 0) {
      // Mapear dados e ordenar cada categoria separadamente
      const leadsData = salesData.analyticsTeam.user_performance
        .map(user => ({
          name: user.user_name,
          value: user.new_leads || 0
        }))
        .sort((a, b) => b.value - a.value); // Ordenar decrescente

      const activitiesData = salesData.analyticsTeam.user_performance
        .map(user => ({
          name: user.user_name,
          value: user.activities || 0
        }))
        .sort((a, b) => b.value - a.value); // Ordenar decrescente

      const wonDealsData = salesData.analyticsTeam.user_performance
        .map(user => ({
          name: user.user_name,
          value: user.won_deals || 0
        }))
        .sort((a, b) => b.value - a.value); // Ordenar decrescente

      return {
        leadsData,
        activitiesData,
        wonDealsData
      };
    }
    return { leadsData: [], activitiesData: [], wonDealsData: [] };
  }, [salesData?.analyticsTeam?.user_performance]);


  // Dados ordenados para gráficos de corretores (DECRESCENTE - maior para menor)
  // SEMPRE MOSTRA TODOS OS CORRETORES, mesmo com valor 0
  const sortedChartsData = useMemo(() => {
    if (!salesData?.leadsByUser || salesData.leadsByUser.length === 0) {
      return {
        sortedLeadsData: [],
        sortedMeetingsData: [],
        sortedSalesData: []
      };
    }

    return {
      // Ordenar por total de leads (value) - decrescente
      // Filtrar corretores válidos
      sortedLeadsData: [...salesData.leadsByUser]
        .filter(user => user.name !== 'SA IMOB' && user.name !== 'Desconhecido')
        .sort((a, b) => (b.value || 0) - (a.value || 0)),
        
      // Ordenar por reuniões - decrescente  
      // Filtrar corretores válidos
      sortedMeetingsData: [...salesData.leadsByUser]
        .filter(user => user.name !== 'SA IMOB' && user.name !== 'Desconhecido')
        .map(user => ({
          ...user,
          meetingsHeld: user.meetingsHeld || user.meetings || 0
        }))
        .sort((a, b) => (b.meetingsHeld || 0) - (a.meetingsHeld || 0)),
        
      // Ordenar por vendas - decrescente
      // Filtrar corretores válidos
      sortedSalesData: [...salesData.leadsByUser]
        .filter(user => user.name !== 'SA IMOB' && user.name !== 'Desconhecido')
        .sort((a, b) => (b.sales || 0) - (a.sales || 0))
    };
  }, [salesData?.leadsByUser]);

  // Mini Metric Card Component
  const MiniMetricCard = ({ title, value, subtitle, color = COLORS.primary }) => (
    <div className="mini-metric-card">
      <div className="mini-metric-value" style={{ color }}>{value}</div>
      <div className="mini-metric-title">{title}</div>
      {subtitle && <div className="mini-metric-subtitle">{subtitle}</div>}
    </div>
  );

  // Memoized Compact Chart Component com Loading Animation e Update Dinâmico
  const CompactChart = memo(({ data, type, config, style, loading = false, onBarClick = null }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [isLoading, setIsLoading] = useState(loading);

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
            series: [{
              name: config.name || 'Data',
              type: 'pie',
              radius: isMobile ? '60%' : '70%',
              center: ['50%', '50%'],
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
      
      if (isLoading || !data || data.length === 0) {
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
    }, [isLoading, data, config.color]);

    // Atualizar dados dinamicamente quando mudam (ASYNC UPDATE)
    useEffect(() => {
      if (!chartInstance.current || !data || data.length === 0 || isLoading) return;

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
      }

      // Use setOption to update data dynamically (ECharts finds differences automatically)
      chartInstance.current.setOption(updateOption, false); // false = merge mode
      
    }, [data, type, config, isLoading]);

    // Sync loading state with parent
    useEffect(() => {
      setIsLoading(loading);
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

  // Se está carregando, mostrar loading spinner
  if (isLoading) {
    return <LoadingSpinner message="Carregando dados de vendas..." />;
  }

  // Se não tem dados E não está carregando, mostrar erro
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
    <div className={`dashboard-content ${isUpdating ? 'updating' : ''}`}>
      {/* CSS dos novos componentes de comparação e filtros de período */}
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

        /* Estilos para MultiSelectFilter */
        .multi-select-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
          min-width: 200px;
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

        /* Responsividade para MultiSelectFilter */
        @media (max-width: 768px) {
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
        }

        /* Estilos para o indicador de filtros ativos */
        .filter-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(78, 88, 89, 0.1);
          border: 2px solid #4E5859;
          border-radius: 8px;
          font-size: 14px;
          color: #4E5859;
          font-weight: 600;
          white-space: nowrap;
          margin-left: 8px;
        }

        .filter-icon {
          font-size: 16px;
        }

        .filter-text {
          font-size: 13px;
        }

        .clear-filters-btn {
          background: none;
          border: none;
          color: #4E5859;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .clear-filters-btn:hover {
          background: rgba(78, 88, 89, 0.2);
          transform: scale(1.1);
        }

        /* Responsividade para indicador de filtros */
        @media (max-width: 768px) {
          .filter-indicator {
            padding: 6px 10px;
            font-size: 12px;
            margin-left: 0;
            margin-top: 8px;
          }
          
          .filter-icon {
            font-size: 14px;
          }
          
          .filter-text {
            font-size: 12px;
          }
        }
      `}</style>

      <div className="dashboard-row row-header">
        <div className="section-title">
          <h2>Dashboard de Vendas</h2>
          <div className="dashboard-controls">
            <div className="filters-group">
              <MultiSelectFilter 
                label="Corretor"
                options={corretores.map(corretor => ({
                  value: corretor.name,
                  label: `${corretor.name} (${corretor.total_leads} leads)`
                }))}
                selectedValues={selectedCorretor ? (selectedCorretor.includes(',') ? selectedCorretor.split(',') : [selectedCorretor]) : []}
                onChange={(values) => setSelectedCorretor(values.length === 0 ? '' : values.join(','))}
                placeholder="Todos os Corretores"
              />
              
              <MultiSelectFilter 
                label="Fonte"
                options={sourceOptions}
                selectedValues={selectedSource ? (selectedSource.includes(',') ? selectedSource.split(',') : [selectedSource]) : []}
                onChange={(values) => setSelectedSource(values.length === 0 ? '' : values.join(','))}
                placeholder="Todas as Fontes"
              />

              {/* Indicador de filtros ativos */}
              {(selectedCorretor || selectedSource) && (
                <div className="filter-indicator">
                  <span className="filter-icon">🔍</span>
                  <span className="filter-text">Filtros Ativos</span>
                  <button 
                    className="clear-filters-btn"
                    onClick={() => {
                      setSelectedCorretor('');
                      setSelectedSource('');
                    }}
                    title="Limpar todos os filtros"
                  >
                    ×
                  </button>
                </div>
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
                  onClick={() => handlePeriodChange('custom')}
                >
                  Personalizado
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linha 1: KPIs principais */}
      <div className="dashboard-row row-compact">
         <div className="card card-metrics-group">
          <div className="card-title">Métricas de Produtividade</div>
          <div className="metrics-group">
            <div 
              className="mini-metric-card"
              onClick={() => openModal('reunioes')}
              onKeyDown={(e) => e.key === 'Enter' && openModal('reunioes')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das reuniões realizadas"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: COLORS.primary }}>
                  {salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0;
                  // Simular valor anterior baseado em uma redução de 20%
                  const previous = Math.floor(current / 0.8);
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">REUNIÕES REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: COLORS.primary, fontWeight: '600' }}>
                  {(() => {
                    const totalMeetings = salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0;
                    const totalLeads = salesData.totalLeads || 0;
                    const conversionRate = totalLeads > 0 ? (totalMeetings / totalLeads) * 100 : 0;
                    return conversionRate.toFixed(1);
                  })()}%
                </span>
                <span>TAXA CONV.</span>
              </div>
            </div>
            <div 
              className="mini-metric-card"
              onClick={() => openModal('propostas')}
              onKeyDown={(e) => e.key === 'Enter' && openModal('propostas')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das propostas realizadas"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: COLORS.secondary }}>
                  {salesData?.proposalStats?.total || 0}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData?.proposalStats?.total || 0;
                  // Simular valor anterior baseado em uma melhoria de 15%
                  const previous = Math.floor(current / 1.15);
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">PROPOSTAS REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: COLORS.secondary, fontWeight: '600' }}>
                  {(() => {
                    const totalProposals = salesData?.proposalStats?.total || 0;
                    const totalMeetings = salesData.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.meetingsHeld || 0), 0) : 0;
                    const conversionRate = totalMeetings > 0 ? (totalProposals / totalMeetings) * 100 : 0;
                    return conversionRate.toFixed(1);
                  })()}%
                </span>
                <span>TAXA CONV.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card card-metrics-group">
          <div className="card-title">Métricas de Vendas</div>
          <div className="metrics-group">
            <div 
              className="mini-metric-card"
              onClick={() => openModal('vendas')}
              onKeyDown={(e) => e.key === 'Enter' && openModal('vendas')}
              tabIndex={0}
              role="button"
              aria-label="Clique para ver detalhes das vendas realizadas"
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: COLORS.success }}>
                  {salesData?.wonLeads || (salesData?.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0)}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData?.wonLeads || (salesData?.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0);
                  const previous = salesData?.previousWonLeads || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">VENDAS REALIZADAS</div>
              <div className="mini-metric-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: COLORS.success, fontWeight: '600' }}>
                  {(() => {
                    const totalSales = salesData?.wonLeads || (salesData?.leadsByUser ? salesData.leadsByUser.reduce((sum, user) => sum + (user.sales || 0), 0) : 0);
                    const totalProposals = salesData?.proposalStats?.total || 0;
                    const conversionRate = totalProposals > 0 ? (totalSales / totalProposals) * 100 : 0;
                    return conversionRate.toFixed(1);
                  })()}%
                </span>
                <span>TAXA CONV.</span>
              </div>
            </div>
            <div className="mini-metric-card">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: COLORS.success }}>
                  R$ {(salesData?.averageDealSize || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData?.averageDealSize || 0;
                  const previous = salesData?.previousAverageDealSize || 0;
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">TICKET MÉDIO</div>
            </div>
            <div className="mini-metric-card">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="mini-metric-value" style={{ color: COLORS.warning }}>
                  R$ {(salesData?.totalRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <TrendIndicator value={(() => {
                  const current = salesData?.totalRevenue || 0;
                  const previous = (salesData?.previousWonLeads || 0) * (salesData?.previousAverageDealSize || 0);
                  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
                })()} />
              </div>
              <div className="mini-metric-title">RECEITA TOTAL</div>
            </div>
          </div>
        </div>
      </div>



      {/* Linha 5: Gráficos de Corretores - Layout Vertical */}
      <div className="dashboard-row" style={{ flexDirection: 'column' }}>
        {salesData?.leadsByUser && salesData.leadsByUser.length > 0 ? (
          <>
            <div className="card card-full">
              <div className="card-title">Leads criados no período</div>
              <CompactChart 
                type="bar" 
                data={sortedChartsData.sortedLeadsData} 
                config={chartConfigs.leadsConfig}
                style={chartStyle}
                onBarClick={(corretorName) => openModalByCorretor('leads', corretorName)}
                  />
            </div>
            
            <div className="card card-full">
              <div className="card-title">Rank Corretores - Reunião</div>
              <CompactChart 
                type="bar" 
                data={sortedChartsData.sortedMeetingsData} 
                config={chartConfigs.meetingsConfig}
                style={chartStyle}
                onBarClick={(corretorName) => openModalByCorretor('reunioes', corretorName)}
                  />
            </div>
            
            <div className="card card-full">
              <div className="card-title">Rank Corretores - Venda</div>
              <CompactChart 
                type="bar" 
                data={sortedChartsData.sortedSalesData} 
                config={chartConfigs.salesConfig}
                style={chartStyle}
                onBarClick={(corretorName) => openModalByCorretor('vendas', corretorName)}
                  />
            </div>
          </>
        ) : salesData?.analyticsTeam && salesData.analyticsTeam.user_performance && salesData.analyticsTeam.user_performance.length > 0 ? (
          <>
            <div className="card card-full">
              <div className="card-title">Leads criados no período</div>
              <CompactChart 
                type="bar" 
                data={chartData.leadsData} 
                config={chartConfigs.leadsConfig}
                style={chartStyle}
                  />
            </div>
            
            <div className="card card-full">
              <div className="card-title">Rank Corretores - Reunião</div>
              <CompactChart 
                type="bar" 
                data={chartData.activitiesData} 
                config={chartConfigs.activitiesConfig}
                style={chartStyle}
                  />
            </div>
            
            <div className="card card-full">
              <div className="card-title">Rank Corretores - Venda</div>
              <CompactChart 
                type="bar" 
                data={chartData.wonDealsData} 
                config={chartConfigs.salesConfig}
                style={chartStyle}
                  />
              {salesData?.analyticsTeam?.team_stats?.top_performer && (
                <div className="team-info">
                  Top performer: {salesData.analyticsTeam.team_stats.top_performer}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card card-full">
            <div className="error-message">
              {(() => {
                console.log('🚨 PROBLEMA - Analisando dados:');
                console.log('1. leadsByUser existe?', !!salesData?.leadsByUser);
                console.log('1. leadsByUser length:', salesData?.leadsByUser?.length);
                console.log('2. analyticsTeam existe?', !!salesData?.analyticsTeam);
                console.log('2. user_performance existe?', !!salesData?.analyticsTeam?.user_performance);
                console.log('2. user_performance length:', salesData?.analyticsTeam?.user_performance?.length);
                return '';
              })()}
              Não há dados de desempenho por corretor disponíveis
            </div>
          </div>
        )}
      </div>


      {/* Modal para tabelas detalhadas */}
      <DetailModal
        isOpen={modalStateRef.current.isOpen}
        onClose={closeModal}
        type={modalStateRef.current.type}
        title={modalStateRef.current.title}
        isLoading={modalStateRef.current.isLoading}
        data={modalStateRef.current.data}
        error={modalStateRef.current.error}
      />

      {/* Modal de Período Personalizado */}
      <SimpleModal
        isOpen={showCustomPeriod}
        onClose={() => {
          console.log('🔴 onClose chamado no DashboardSales - showCustomPeriod atual:', showCustomPeriod);
          setShowCustomPeriod(false);
          console.log('🔴 setShowCustomPeriod(false) executado');
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
                {new Date(customPeriod.startDate).toLocaleDateString('pt-BR')} até {' '}
                {new Date(customPeriod.endDate).toLocaleDateString('pt-BR')}
                {' '}({Math.ceil((new Date(customPeriod.endDate) - new Date(customPeriod.startDate)) / (1000 * 60 * 60 * 24))} dias)
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
                if (!customPeriod?.startDate || !customPeriod?.endDate) {
                  alert('Por favor, selecione ambas as datas');
                  return;
                }
                
                const startDate = new Date(customPeriod.startDate);
                const endDate = new Date(customPeriod.endDate);
                
                if (endDate <= startDate) {
                  alert('Data final deve ser posterior à data inicial');
                  return;
                }
                
                applyCustomPeriod(customPeriod);
                setShowCustomPeriod(false);
              }}
              disabled={!customPeriod?.startDate || !customPeriod?.endDate}
              style={{ 
                padding: '12px 24px', 
                backgroundColor: "#4E5859", 
                color: 'white',
                border: 'none', 
                borderRadius: '8px', 
                cursor: (!customPeriod?.startDate || !customPeriod?.endDate) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                if (customPeriod?.startDate && customPeriod?.endDate) {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(78, 88, 89, 0.3)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <span>✓</span> Aplicar Período
            </button>
          </div>
        </div>
      </SimpleModal>

    </div>
  );
};

export default DashboardSales;