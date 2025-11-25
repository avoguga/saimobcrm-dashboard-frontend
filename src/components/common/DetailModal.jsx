import React, { memo, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ExcelExporter from '../../utils/excelExport';

// Função para normalizar texto removendo acentos e caracteres especiais
const normalizeText = (text) => {
  if (!text) return '';
  return text.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/ç/g, 'c') // Trata ç especificamente
    .trim();
};

// Função para verificar se o texto contém o termo de busca (flexível)
const flexibleSearch = (fieldValue, searchValue) => {
  const normalizedField = normalizeText(fieldValue);
  const normalizedSearch = normalizeText(searchValue);
  
  // Se o termo de busca está vazio, não deve filtrar nada
  if (!normalizedSearch.trim()) return true;
  
  // Divide o termo de busca em palavras
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 0);
  
  // Se há apenas uma palavra, verifica se está contida no campo
  if (searchWords.length === 1) {
    return normalizedField.includes(normalizedSearch);
  }
  
  // Para múltiplas palavras, TODAS as palavras devem estar presentes no campo
  // Isso permite buscar "Ricardo Gramowski" e encontrar apenas nomes que contenham ambas as palavras
  return searchWords.every(word => normalizedField.includes(word));
};

// Função para formatar data corretamente
const formatDate = (dateString) => {
  if (!dateString || dateString === 'N/A') return 'N/A';
  
  // Se já está no formato brasileiro (dd/mm/yyyy), retornar como está
  if (dateString.includes('/')) return dateString;
  
  // Se está no formato ISO (yyyy-mm-dd), converter para brasileiro
  if (dateString.includes('-') && dateString.length === 10) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }
  
  return dateString;
};

// Paleta de cores da SA IMOB - Design System
const COLORS = {
  primary: '#4E5859',
  secondary: '#96856F',
  tertiary: '#75777B',
  dark: '#212121',
  light: '#C1C5C9',
  white: '#FFFFFF',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  lightBg: '#F9FAFB',
  border: '#E5E7EB',
  hoverBg: '#F3F4F6',
  shadowSm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  shadowXl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
};

// Ícones para cada tipo de modal
const TYPE_ICONS = {
  leads: '👥',
  reunioes: '📅',
  propostas: '📋',
  vendas: '💰',
  receitaPrevista: '📈',
  receitaTotal: '💵'
};

// Ícones para fontes - ajuda a identificar rapidamente
const SOURCE_ICONS = {
  'Facebook': '📘',
  'Instagram': '📸',
  'Google': '🔍',
  'WhatsApp': '💬',
  'Orgânico': '🌱',
  'Site': '🌐',
  'Indicação': '🤝',
  'default': '📍'
};

// Componente de Card para Mobile (Stacked Rows Pattern)
const MobileCard = memo(({ item, type, isExpanded, onToggle, index, formatDate }) => {
  const isOrganic = item['Fonte'] === 'Orgânico';

  // Dados principais (sempre visíveis) - 3-4 campos mais importantes
  const getPrimaryData = () => {
    switch (type) {
      case 'leads':
        return {
          title: item['Nome do Lead'],
          subtitle: item['Corretor'],
          date: formatDate(item['Data de Criação']),
          badge: item['Etapa']
        };
      case 'reunioes':
        return {
          title: item['Nome do Lead'],
          subtitle: item['Corretor'],
          date: formatDate(item['Data da Reunião']),
          badge: item['Etapa']
        };
      case 'propostas':
        return {
          title: item['Nome do Lead'],
          subtitle: item['Corretor'],
          date: formatDate(item['Data da Proposta']),
          badge: item['is_proposta'] ? '✓ Proposta' : '✗ Sem Proposta',
          badgeType: item['is_proposta'] ? 'success' : 'danger'
        };
      case 'vendas':
      case 'receitaTotal':
        return {
          title: item['Nome do Lead'],
          subtitle: item['Corretor'],
          date: formatDate(item['Data da Venda']),
          value: item['Valor da Venda']
        };
      case 'receitaPrevista':
        return {
          title: item['Nome do Lead'],
          subtitle: item['Corretor'],
          date: formatDate(item['Data da Proposta']) || formatDate(item['Data Fechamento']),
          value: item['Valor']
        };
      default:
        return {
          title: item['Nome do Lead'],
          subtitle: item['Corretor']
        };
    }
  };

  // Dados secundários (visíveis quando expandido)
  const getSecondaryData = () => {
    const common = [
      { label: 'Fonte', value: item['Fonte'], icon: SOURCE_ICONS[item['Fonte']] || SOURCE_ICONS.default },
      { label: 'Produto', value: item['Produto'] || 'N/A' },
      { label: 'Anúncio', value: item['Anúncio'] || 'N/A' },
      { label: 'Público', value: item['Público'] || 'N/A' }
    ];

    switch (type) {
      case 'leads':
      case 'reunioes':
        return [...common, { label: 'Funil', value: item['Funil'] }];
      case 'receitaPrevista':
        return [
          ...common,
          { label: 'Funil', value: item['Funil'] },
          { label: 'Etapa', value: item['Etapa'] },
          { label: 'Data Fechamento', value: formatDate(item['Data Fechamento']) }
        ];
      default:
        return common;
    }
  };

  const primary = getPrimaryData();
  const secondary = getSecondaryData();

  return (
    <div
      style={{
        backgroundColor: COLORS.white,
        borderRadius: '12px',
        marginBottom: '12px',
        boxShadow: COLORS.shadowMd,
        border: `1px solid ${COLORS.border}`,
        borderLeft: `4px solid ${isOrganic ? COLORS.success : COLORS.secondary}`,
        overflow: 'hidden',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Header do card - sempre visível */}
      <div
        onClick={onToggle}
        style={{
          padding: '16px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minHeight: '44px' // Touch target mínimo
        }}
      >
        {/* Linha superior: Título e Data */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '15px',
              fontWeight: '600',
              color: COLORS.dark,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {primary.title}
            </div>
            <div style={{
              fontSize: '13px',
              color: COLORS.tertiary,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>👤</span> {primary.subtitle}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              fontSize: '12px',
              color: COLORS.tertiary,
              marginBottom: '4px'
            }}>
              📅 {primary.date}
            </div>
            {primary.value && (
              <div style={{
                fontSize: '16px',
                fontWeight: '700',
                color: COLORS.success
              }}>
                {primary.value}
              </div>
            )}
          </div>
        </div>

        {/* Linha inferior: Badge e Fonte */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: isOrganic ? COLORS.successLight : 'rgba(150, 133, 111, 0.15)',
              color: isOrganic ? COLORS.success : COLORS.secondary,
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {SOURCE_ICONS[item['Fonte']] || SOURCE_ICONS.default} {item['Fonte']}
            </span>
            {primary.badge && (
              <span style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: primary.badgeType === 'success' ? COLORS.successLight :
                                 primary.badgeType === 'danger' ? COLORS.dangerLight : COLORS.lightBg,
                color: primary.badgeType === 'success' ? COLORS.success :
                       primary.badgeType === 'danger' ? COLORS.danger : COLORS.dark,
                fontWeight: '600'
              }}>
                {primary.badge}
              </span>
            )}
          </div>

          {/* Indicador de expansão */}
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: COLORS.lightBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            <span style={{ fontSize: '14px', color: COLORS.tertiary }}>▼</span>
          </div>
        </div>
      </div>

      {/* Conteúdo expandido - Progressive Disclosure */}
      {isExpanded && (
        <div style={{
          padding: '0 16px 16px 16px',
          borderTop: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.lightBg,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            paddingTop: '12px'
          }}>
            {secondary.map((field, idx) => (
              <div key={idx} style={{
                padding: '8px',
                backgroundColor: COLORS.white,
                borderRadius: '8px',
                border: `1px solid ${COLORS.border}`
              }}>
                <div style={{
                  fontSize: '10px',
                  color: COLORS.tertiary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}>
                  {field.icon && <span style={{ marginRight: '4px' }}>{field.icon}</span>}
                  {field.label}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: COLORS.dark,
                  fontWeight: '500',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {field.value || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Memoized Modal Component to prevent parent re-renders
const DetailModal = memo(({ isOpen, onClose, type, title, isLoading, data, error, initialFilterField, initialFilterValue, onFilterChange }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filterField, setFilterField] = useState(initialFilterField || 'Nome do Lead');
  const [filterValue, setFilterValue] = useState(initialFilterValue || '');

  // Estado para modo de visualização (cards vs tabela) no mobile
  const [viewMode, setViewMode] = useState('cards'); // 'cards' ou 'table'

  // Estado para cards expandidos
  const [expandedCards, setExpandedCards] = useState(new Set());

  // Detectar tamanho da tela para responsividade
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth <= 1024 && windowWidth > 768;
  const isLargeScreen = windowWidth >= 1440;

  // Estado para animação de entrada
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para trigger da animação
      const timer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  // Função para toggle de card expandido
  const toggleCardExpansion = (index) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Expandir/colapsar todos os cards
  const toggleAllCards = () => {
    if (expandedCards.size === (sortedData?.length || 0)) {
      setExpandedCards(new Set());
    } else {
      setExpandedCards(new Set((sortedData || []).map((_, i) => i)));
    }
  };

  // Estilos responsivos para células da tabela
  const cellStyle = {
    padding: isMobile ? '10px 8px' : isLargeScreen ? '16px 14px' : '14px 12px',
    fontSize: isMobile ? '12px' : isLargeScreen ? '14px' : '13px',
    color: COLORS.dark,
    transition: 'background-color 0.15s ease'
  };
  const cellStyleBold = {
    ...cellStyle,
    fontWeight: '600',
    color: COLORS.success,
    fontSize: isMobile ? '12px' : isLargeScreen ? '15px' : '14px'
  };

  // Função para exportar dados para Excel
  const handleExportToExcel = () => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      alert('Não há dados para exportar');
      return;
    }

    const result = ExcelExporter.exportDetailedModalData(
      sortedData || data,
      type,
      { [filterField]: filterValue },
      'Período Atual'
    );

    if (result.success) {
      console.log(`Exportação concluída: ${result.fileName}`);
    } else {
      alert(`Erro na exportação: ${result.error}`);
    }
  };
  
  // Atualizar os filtros quando o modal abrir com novos valores iniciais
  useEffect(() => {
    if (isOpen) {
      if (initialFilterField) {
        setFilterField(initialFilterField);
      }
      if (initialFilterValue) {
        setFilterValue(initialFilterValue);
      }
    }
  }, [isOpen, initialFilterField, initialFilterValue]);
  
  const getFilterOptions = () => {
    const commonFields = ['Nome do Lead', 'Corretor', 'Fonte', 'Anúncio', 'Público', 'Produto'];

    switch (type) {
      case 'leads':
        return ['Data de Criação', ...commonFields, 'Funil', 'Etapa'];
      case 'reunioes':
        return ['Data da Reunião', ...commonFields, 'Funil', 'Etapa'];
      case 'propostas':
        return ['Data da Proposta', ...commonFields, 'Proposta'];
      case 'vendas':
      case 'receitaTotal':
        return ['Data da Venda', ...commonFields, 'Valor da Venda'];
      case 'receitaPrevista':
        return ['Nome do Lead', 'Etapa', 'Corretor', 'Fonte', 'Funil', 'Data da Proposta', 'Data Fechamento', 'Valor'];
      default:
        return commonFields;
    }
  };
  
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedData = useMemo(() => {
    if (!data || !Array.isArray(data)) return data;
    
    // Primeiro filtrar pelo campo selecionado
    let filteredData = data;
    if (filterValue.trim() !== '') {
      filteredData = data.filter(item => {
        // Tratamento especial para o campo "Proposta"
        if (filterField === 'Proposta') {
          const isProposal = item['is_proposta'] === true;
          const filterLower = filterValue.toLowerCase();
          
          if (filterLower.includes('sim') || filterLower.includes('yes') || filterLower.includes('true')) {
            return isProposal;
          } else if (filterLower.includes('não') || filterLower.includes('nao') || filterLower.includes('no') || filterLower.includes('false')) {
            return !isProposal;
          }
          // Se não conseguir determinar, buscar no texto
          const propostaText = isProposal ? 'sim' : 'não';
          return propostaText.includes(filterLower);
        }
        
        const fieldValue = item[filterField] || '';
        return flexibleSearch(fieldValue, filterValue);
      });
    }
    
    // Depois ordenar se houver configuração de ordenação
    if (!sortConfig.key) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      
      if (typeof aValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig, filterField, filterValue]);
  
  const renderSortableHeader = (key, label) => {
    const isActive = sortConfig.key === key;
    return (
      <th
        style={{
          padding: isMobile ? '12px 8px' : isLargeScreen ? '16px 14px' : '14px 12px',
          textAlign: 'left',
          borderBottom: `2px solid ${COLORS.border}`,
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
          backgroundColor: isActive ? COLORS.hoverBg : COLORS.lightBg,
          whiteSpace: 'nowrap',
          fontWeight: '600',
          color: isActive ? COLORS.primary : COLORS.tertiary,
          fontSize: isMobile ? '11px' : isLargeScreen ? '13px' : '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          transition: 'all 0.2s ease'
        }}
        onClick={() => handleSort(key)}
        onMouseEnter={(e) => {
          if (!isActive) e.target.style.backgroundColor = COLORS.hoverBg;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.target.style.backgroundColor = COLORS.lightBg;
        }}
      >
        {isMobile ? label.split(' ')[0] : label}
        <span style={{
          marginLeft: '6px',
          fontSize: isMobile ? '10px' : '11px',
          opacity: isActive ? 1 : 0.4,
          color: isActive ? COLORS.primary : COLORS.tertiary,
          transition: 'all 0.2s ease'
        }}>
          {sortConfig.key === key && sortConfig.direction === 'asc' ? '↑' :
           sortConfig.key === key && sortConfig.direction === 'desc' ? '↓' : '⇅'}
        </span>
      </th>
    );
  };
  
  if (!isOpen) return null;

  return createPortal(
    <div
      className="detail-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isAnimating ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0)',
        backdropFilter: isAnimating ? 'blur(4px)' : 'blur(0px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: isMobile ? '0' : isLargeScreen ? '32px' : '24px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
      onClick={onClose}
    >
      <div
        className="detail-modal-content"
        style={{
          backgroundColor: COLORS.white,
          borderRadius: isMobile ? '0' : isLargeScreen ? '16px' : '12px',
          maxWidth: isMobile ? '100vw' : isTablet ? '95vw' : isLargeScreen ? '1400px' : '1200px',
          maxHeight: isMobile ? '100vh' : isLargeScreen ? '85vh' : '90vh',
          width: isMobile ? '100vw' : isTablet ? '95vw' : isLargeScreen ? '90vw' : '95vw',
          boxShadow: isAnimating ? COLORS.shadowXl : COLORS.shadowMd,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
          opacity: isAnimating ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do modal - FIXO */}
        <div
          className="detail-modal-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '16px' : isLargeScreen ? '24px 32px' : '20px 24px',
            background: `linear-gradient(135deg, ${COLORS.white} 0%, ${COLORS.lightBg} 100%)`,
            borderBottom: `2px solid ${COLORS.primary}`,
            position: 'sticky',
            top: 0,
            zIndex: 100,
            flexWrap: 'wrap',
            gap: isMobile ? '12px' : '16px'
          }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '10px' : '14px',
            flex: 1,
            minWidth: isMobile ? '150px' : '200px'
          }}>
            {/* Ícone do tipo */}
            <span style={{
              fontSize: isMobile ? '24px' : isLargeScreen ? '32px' : '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isMobile ? '40px' : isLargeScreen ? '52px' : '46px',
              height: isMobile ? '40px' : isLargeScreen ? '52px' : '46px',
              backgroundColor: COLORS.lightBg,
              borderRadius: '12px',
              boxShadow: COLORS.shadowSm
            }}>
              {TYPE_ICONS[type] || '📊'}
            </span>
            <h3 style={{
              margin: 0,
              color: COLORS.dark,
              fontSize: isMobile ? '16px' : isLargeScreen ? '22px' : '20px',
              fontWeight: '700',
              letterSpacing: '-0.02em'
            }}>{title}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px' }}>
            {/* Botão de exportar para Excel */}
            <button
              onClick={handleExportToExcel}
              disabled={!data || data.length === 0}
              style={{
                backgroundColor: COLORS.success,
                color: COLORS.white,
                border: 'none',
                borderRadius: '8px',
                padding: isMobile ? '8px 12px' : isLargeScreen ? '12px 20px' : '10px 18px',
                cursor: !data || data.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: isMobile ? '13px' : isLargeScreen ? '15px' : '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: !data || data.length === 0 ? 0.5 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: COLORS.shadowSm
              }}
              onMouseEnter={(e) => {
                if (data && data.length > 0) {
                  e.target.style.backgroundColor = '#059669';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = COLORS.shadowMd;
                }
              }}
              onMouseLeave={(e) => {
                if (data && data.length > 0) {
                  e.target.style.backgroundColor = COLORS.success;
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = COLORS.shadowSm;
                }
              }}
              title="Exportar dados para Excel"
            >
              <span style={{ fontSize: isMobile ? '14px' : '16px' }}>📊</span>
              {!isMobile && 'Exportar Excel'}
            </button>

            {/* Botão de fechar */}
            <button
              onClick={onClose}
              style={{
                background: COLORS.lightBg,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '8px',
                fontSize: isMobile ? '20px' : '22px',
                cursor: 'pointer',
                color: COLORS.tertiary,
                padding: '0',
                width: isMobile ? '38px' : isLargeScreen ? '44px' : '40px',
                height: isMobile ? '38px' : isLargeScreen ? '44px' : '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                fontWeight: '300'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = COLORS.dangerLight;
                e.target.style.borderColor = COLORS.danger;
                e.target.style.color = COLORS.danger;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = COLORS.lightBg;
                e.target.style.borderColor = COLORS.border;
                e.target.style.color = COLORS.tertiary;
              }}
              title="Fechar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filtro por campo selecionável - FIXO */}
        {!isLoading && !error && data && data.length > 0 && (
          <div
            className="detail-modal-filters"
            style={{
              padding: isMobile ? '12px 16px' : isLargeScreen ? '20px 32px' : '16px 24px',
              display: 'flex',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? '10px' : isLargeScreen ? '16px' : '12px',
              flexWrap: 'wrap',
              flexDirection: isMobile ? 'column' : 'row',
              backgroundColor: COLORS.lightBg,
              borderBottom: `1px solid ${COLORS.border}`,
              position: 'sticky',
              top: isMobile ? '72px' : isLargeScreen ? '90px' : '82px',
              zIndex: 99
            }}>
            {/* Label com ícone */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: isMobile ? 'auto' : '100px'
            }}>
              <span style={{ fontSize: '16px' }}>🔍</span>
              <label style={{
                fontSize: isMobile ? '12px' : isLargeScreen ? '14px' : '13px',
                fontWeight: '600',
                color: COLORS.primary,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Filtrar por:
              </label>
            </div>

            {/* Select estilizado */}
            <select
              value={filterField}
              onChange={(e) => {
                setFilterField(e.target.value);
                setFilterValue('');
                if (onFilterChange) {
                  onFilterChange(e.target.value, '');
                }
              }}
              style={{
                padding: isMobile ? '10px 14px' : isLargeScreen ? '12px 16px' : '10px 14px',
                border: `2px solid ${COLORS.border}`,
                borderRadius: '8px',
                fontSize: isMobile ? '14px' : isLargeScreen ? '15px' : '14px',
                outline: 'none',
                backgroundColor: COLORS.white,
                minWidth: isMobile ? '100%' : isLargeScreen ? '180px' : '150px',
                width: isMobile ? '100%' : 'auto',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: COLORS.dark,
                fontWeight: '500'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = COLORS.primary;
                e.target.style.boxShadow = `0 0 0 3px rgba(78, 88, 89, 0.1)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = COLORS.border;
                e.target.style.boxShadow = 'none';
              }}
            >
              {getFilterOptions().map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            {/* Input de busca com container */}
            <div style={{
              flex: isMobile ? 'none' : 1,
              minWidth: isMobile ? '100%' : isLargeScreen ? '300px' : '220px',
              width: isMobile ? '100%' : 'auto',
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={filterValue}
                onChange={(e) => {
                  setFilterValue(e.target.value);
                  if (onFilterChange) {
                    onFilterChange(filterField, e.target.value);
                  }
                }}
                placeholder={isMobile ? `Buscar...` : `Digite para filtrar por ${filterField}...`}
                style={{
                  width: '100%',
                  padding: isMobile ? '10px 40px 10px 14px' : isLargeScreen ? '12px 44px 12px 16px' : '10px 40px 10px 14px',
                  border: `2px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  fontSize: isMobile ? '14px' : isLargeScreen ? '15px' : '14px',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: COLORS.white,
                  color: COLORS.dark
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.primary;
                  e.target.style.boxShadow = `0 0 0 3px rgba(78, 88, 89, 0.1)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = COLORS.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
              {filterValue && (
                <button
                  onClick={() => {
                    setFilterValue('');
                    if (onFilterChange) {
                      onFilterChange(filterField, '');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: COLORS.hoverBg,
                    border: 'none',
                    color: COLORS.tertiary,
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = COLORS.dangerLight;
                    e.target.style.color = COLORS.danger;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = COLORS.hoverBg;
                    e.target.style.color = COLORS.tertiary;
                  }}
                  title="Limpar filtro"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Badge de resultados */}
            <div style={{
              fontSize: isMobile ? '12px' : isLargeScreen ? '14px' : '13px',
              color: filterValue ? COLORS.primary : COLORS.tertiary,
              padding: isMobile ? '8px 12px' : '10px 14px',
              backgroundColor: filterValue ? 'rgba(78, 88, 89, 0.1)' : COLORS.white,
              borderRadius: '8px',
              border: `1px solid ${filterValue ? COLORS.primary : COLORS.border}`,
              fontWeight: filterValue ? '600' : '500',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '14px' }}>{filterValue ? '📋' : '📊'}</span>
              {filterValue ?
                `${sortedData?.length || 0} de ${data?.length || 0}` :
                `${data?.length || 0} registros`
              }
            </div>

            {/* Toggle View (Mobile Only) - Cards vs Table */}
            {isMobile && (
              <div style={{
                display: 'flex',
                gap: '4px',
                padding: '4px',
                backgroundColor: COLORS.white,
                borderRadius: '8px',
                border: `1px solid ${COLORS.border}`,
                width: '100%',
                marginTop: '4px'
              }}>
                <button
                  onClick={() => setViewMode('cards')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: viewMode === 'cards' ? COLORS.primary : 'transparent',
                    color: viewMode === 'cards' ? COLORS.white : COLORS.tertiary,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    minHeight: '44px' // Touch target
                  }}
                >
                  <span>🃏</span> Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: viewMode === 'table' ? COLORS.primary : 'transparent',
                    color: viewMode === 'table' ? COLORS.white : COLORS.tertiary,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    minHeight: '44px' // Touch target
                  }}
                >
                  <span>📊</span> Tabela
                </button>
              </div>
            )}

            {/* Expandir/Colapsar todos (Mobile Cards Only) */}
            {isMobile && viewMode === 'cards' && sortedData && sortedData.length > 0 && (
              <button
                onClick={toggleAllCards}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                  backgroundColor: COLORS.white,
                  color: COLORS.tertiary,
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  minHeight: '40px'
                }}
              >
                {expandedCards.size === sortedData.length ? (
                  <>
                    <span>🔼</span> Colapsar Todos
                  </>
                ) : (
                  <>
                    <span>🔽</span> Expandir Todos
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Conteúdo do modal - SCROLLABLE */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          padding: isMobile ? '16px' : isLargeScreen ? '28px 32px' : '24px',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: COLORS.white
        }}>
          {isLoading ? (
            <div style={{
              textAlign: 'center',
              padding: isLargeScreen ? '80px 40px' : '60px 40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                fontSize: isLargeScreen ? '48px' : '40px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }}>⏳</div>
              <div style={{
                fontSize: isLargeScreen ? '18px' : '16px',
                color: COLORS.tertiary,
                fontWeight: '500'
              }}>Carregando dados...</div>
            </div>
          ) : error ? (
            <div style={{
              textAlign: 'center',
              padding: isLargeScreen ? '80px 40px' : '60px 40px',
              backgroundColor: COLORS.dangerLight,
              borderRadius: '12px',
              border: `1px solid ${COLORS.danger}`
            }}>
              <div style={{ fontSize: isLargeScreen ? '48px' : '40px', marginBottom: '16px' }}>⚠️</div>
              <div style={{
                fontSize: isLargeScreen ? '18px' : '16px',
                color: COLORS.danger,
                fontWeight: '600'
              }}>Erro ao carregar dados</div>
              <div style={{
                fontSize: isLargeScreen ? '15px' : '14px',
                marginTop: '12px',
                color: COLORS.dark,
                opacity: 0.8
              }}>{error}</div>
            </div>
          ) : !data || data.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: isLargeScreen ? '80px 40px' : '60px 40px',
              backgroundColor: COLORS.lightBg,
              borderRadius: '12px',
              border: `1px dashed ${COLORS.border}`
            }}>
              <div style={{ fontSize: isLargeScreen ? '56px' : '48px', marginBottom: '16px' }}>
                {TYPE_ICONS[type] || '📊'}
              </div>
              <div style={{
                fontSize: isLargeScreen ? '18px' : '16px',
                color: COLORS.dark,
                fontWeight: '600'
              }}>Nenhum registro encontrado</div>
              <div style={{
                fontSize: isLargeScreen ? '15px' : '14px',
                marginTop: '12px',
                color: COLORS.tertiary
              }}>
                Não há {type} no período selecionado.
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              {isMobile && viewMode === 'cards' ? (
                <div style={{
                  overflow: 'auto',
                  flex: 1,
                  padding: '4px',
                  WebkitOverflowScrolling: 'touch'
                }}>
                  {(sortedData || []).map((item, index) => (
                    <MobileCard
                      key={index}
                      item={item}
                      type={type}
                      isExpanded={expandedCards.has(index)}
                      onToggle={() => toggleCardExpansion(index)}
                      index={index}
                      formatDate={formatDate}
                    />
                  ))}

                  {/* Footer mobile cards */}
                  <div style={{
                    marginTop: '8px',
                    padding: '16px',
                    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    color: COLORS.white
                  }}>
                    <span style={{ fontSize: '24px' }}>{TYPE_ICONS[type] || '📊'}</span>
                    <div>
                      <div style={{ fontSize: '12px', opacity: 0.9 }}>Total de registros</div>
                      <div style={{ fontSize: '24px', fontWeight: '700' }}>{sortedData.length}</div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Table View (Desktop or Mobile Table Mode) */
                <div style={{
                  overflow: 'auto',
                  flex: 1,
                  position: 'relative',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: isMobile ? '8px' : isLargeScreen ? '12px' : '8px',
                  WebkitOverflowScrolling: 'touch',
                  boxShadow: COLORS.shadowSm
                }}>
                  <table
                className="detail-modal-table"
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: isMobile ? '12px' : isLargeScreen ? '15px' : '14px',
                  position: 'relative',
                  minWidth: isMobile ? '600px' : isLargeScreen ? '900px' : '800px'
                }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 5,
                  backgroundColor: COLORS.lightBg,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <tr style={{ backgroundColor: COLORS.lightBg }}>
                    {type === 'leads' && (
                      <>
                        {renderSortableHeader('Data de Criação', 'Data de Criação')}
                        {renderSortableHeader('Nome do Lead', 'Nome do Lead')}
                        {renderSortableHeader('Corretor', 'Corretor')}
                        {renderSortableHeader('Fonte', 'Fonte')}
                        {renderSortableHeader('Produto', 'Produto')}
                        {renderSortableHeader('Anúncio', 'Anúncio')}
                        {renderSortableHeader('Público', 'Público-Alvo')}
                        {renderSortableHeader('Funil', 'Funil')}
                        {renderSortableHeader('Etapa', 'Etapa')}
                      </>
                    )}
                    {type === 'reunioes' && (
                      <>
                        {renderSortableHeader('Data da Reunião', 'Data da Reunião')}
                        {renderSortableHeader('Nome do Lead', 'Nome do Lead')}
                        {renderSortableHeader('Corretor', 'Corretor')}
                        {renderSortableHeader('Fonte', 'Fonte')}
                        {renderSortableHeader('Produto', 'Produto')}
                        {renderSortableHeader('Anúncio', 'Anúncio')}
                        {renderSortableHeader('Público', 'Público-Alvo')}
                        {renderSortableHeader('Funil', 'Funil')}
                        {renderSortableHeader('Etapa', 'Etapa')}
                      </>
                    )}
                    {type === 'propostas' && (
                      <>
                        {renderSortableHeader('Data da Proposta', 'Data da Proposta')}
                        {renderSortableHeader('Nome do Lead', 'Nome do Lead')}
                        {renderSortableHeader('Corretor', 'Corretor')}
                        {renderSortableHeader('Fonte', 'Fonte')}
                        {renderSortableHeader('Produto', 'Produto')}
                        {renderSortableHeader('Anúncio', 'Anúncio')}
                        {renderSortableHeader('Público', 'Público-Alvo')}
                        {renderSortableHeader('Proposta', 'Proposta')}
                      </>
                    )}
                    {(type === 'vendas' || type === 'receitaTotal') && (
                      <>
                        {renderSortableHeader('Data da Venda', 'Data da Venda')}
                        {renderSortableHeader('Nome do Lead', 'Nome do Lead')}
                        {renderSortableHeader('Corretor', 'Corretor')}
                        {renderSortableHeader('Fonte', 'Fonte')}
                        {renderSortableHeader('Produto', 'Produto')}
                        {renderSortableHeader('Anúncio', 'Anúncio')}
                        {renderSortableHeader('Público', 'Público-Alvo')}
                        {renderSortableHeader('Valor da Venda', 'Valor da Venda')}
                      </>
                    )}
                    {type === 'receitaPrevista' && (
                      <>
                        {renderSortableHeader('Nome do Lead', 'Nome do Lead')}
                        {renderSortableHeader('Etapa', 'Etapa')}
                        {renderSortableHeader('Corretor', 'Corretor')}
                        {renderSortableHeader('Fonte', 'Fonte')}
                        {renderSortableHeader('Funil', 'Funil')}
                        {renderSortableHeader('Data da Proposta', 'Data da Proposta')}
                        {renderSortableHeader('Data Fechamento', 'Data Fechamento')}
                        {renderSortableHeader('Valor', 'Valor')}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(sortedData || []).map((item, index) => {
                    const isOrganic = item['Fonte'] === 'Orgânico';
                    const rowBgColor = isOrganic
                      ? (index % 2 === 0 ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.08)')
                      : (index % 2 === 0 ? COLORS.white : COLORS.lightBg);
                    const hoverBgColor = isOrganic
                      ? 'rgba(16, 185, 129, 0.15)'
                      : COLORS.hoverBg;

                    return (
                      <tr
                        key={index}
                        style={{
                          backgroundColor: rowBgColor,
                          borderBottom: `1px solid ${COLORS.border}`,
                          borderLeft: isOrganic ? `4px solid ${COLORS.success}` : `4px solid ${COLORS.secondary}`,
                          transition: 'background-color 0.15s ease',
                          cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = hoverBgColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = rowBgColor;
                        }}
                      >
                        {type === 'leads' && (
                          <>
                            <td style={cellStyle}>{formatDate(item['Data de Criação'])}</td>
                            <td style={cellStyle}>{item['Nome do Lead']}</td>
                            <td style={cellStyle}>{item['Corretor']}</td>
                            <td style={cellStyle}>{item['Fonte']}</td>
                            <td style={cellStyle}>{item['Produto'] || 'N/A'}</td>
                            <td style={cellStyle}>{item['Anúncio'] || 'N/A'}</td>
                            <td style={cellStyle}>{item['Público'] || 'N/A'}</td>
                            <td style={cellStyle}>{item['Funil']}</td>
                            <td style={cellStyle}>{item['Etapa']}</td>
                          </>
                        )}
                        {type === 'reunioes' && (
                          <>
                            <td style={cellStyle}>{formatDate(item['Data da Reunião'])}</td>
                            <td style={cellStyle}>{item['Nome do Lead']}</td>
                            <td style={cellStyle}>{item['Corretor']}</td>
                            <td style={cellStyle}>{item['Fonte']}</td>
                            <td style={cellStyle}>{item['Produto'] || 'N/A'}</td>
                            <td style={cellStyle}>{item['Anúncio'] || 'N/A'}</td>
                            <td style={cellStyle}>{item['Público'] || 'N/A'}</td>
                            <td style={cellStyle}>{item['Funil']}</td>
                            <td style={cellStyle}>{item['Etapa']}</td>
                          </>
                        )}
                        {type === 'propostas' && (
                        <>
                          <td style={cellStyle}>{formatDate(item['Data da Proposta'])}</td>
                          <td style={cellStyle}>{item['Nome do Lead']}</td>
                          <td style={cellStyle}>{item['Corretor']}</td>
                          <td style={cellStyle}>{item['Fonte']}</td>
                          <td style={cellStyle}>{item['Produto'] || 'N/A'}</td>
                          <td style={cellStyle}>{item['Anúncio'] || 'N/A'}</td>
                          <td style={cellStyle}>{item['Público'] || 'N/A'}</td>
                          <td style={{ ...cellStyle, textAlign: 'center' }}>
                            {item['is_proposta'] === true ? (
                              <span style={{
                                color: COLORS.success,
                                fontWeight: '600',
                                backgroundColor: COLORS.successLight,
                                padding: isMobile ? '4px 8px' : isLargeScreen ? '6px 14px' : '5px 10px',
                                borderRadius: '6px',
                                fontSize: isMobile ? '11px' : isLargeScreen ? '13px' : '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: `1px solid ${COLORS.success}`,
                                boxShadow: '0 1px 2px rgba(16, 185, 129, 0.1)'
                              }}>
                                <span>✓</span> {isMobile ? 'S' : 'SIM'}
                              </span>
                            ) : (
                              <span style={{
                                color: COLORS.danger,
                                fontWeight: '600',
                                backgroundColor: COLORS.dangerLight,
                                padding: isMobile ? '4px 8px' : isLargeScreen ? '6px 14px' : '5px 10px',
                                borderRadius: '6px',
                                fontSize: isMobile ? '11px' : isLargeScreen ? '13px' : '12px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: `1px solid ${COLORS.danger}`,
                                boxShadow: '0 1px 2px rgba(239, 68, 68, 0.1)'
                              }}>
                                <span>✗</span> {isMobile ? 'N' : 'NÃO'}
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      {(type === 'vendas' || type === 'receitaTotal') && (
                        <>
                          <td style={cellStyle}>{formatDate(item['Data da Venda'])}</td>
                          <td style={cellStyle}>{item['Nome do Lead']}</td>
                          <td style={cellStyle}>{item['Corretor']}</td>
                          <td style={cellStyle}>{item['Fonte']}</td>
                          <td style={cellStyle}>{item['Produto'] || 'N/A'}</td>
                          <td style={cellStyle}>{item['Anúncio'] || 'N/A'}</td>
                          <td style={cellStyle}>{item['Público'] || 'N/A'}</td>
                          <td style={cellStyleBold}>
                            {item['Valor da Venda']}
                          </td>
                        </>
                      )}
                      {type === 'receitaPrevista' && (
                        <>
                          <td style={cellStyle}>{item['Nome do Lead']}</td>
                          <td style={cellStyle}>{item['Etapa']}</td>
                          <td style={cellStyle}>{item['Corretor']}</td>
                          <td style={cellStyle}>{item['Fonte']}</td>
                          <td style={cellStyle}>{item['Funil']}</td>
                          <td style={cellStyle}>{formatDate(item['Data da Proposta'])}</td>
                          <td style={cellStyle}>{formatDate(item['Data Fechamento'])}</td>
                          <td style={cellStyleBold}>
                            {item['Valor']}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                  })}
                </tbody>
              </table>
              
                  {/* Footer com total */}
                  <div style={{
                    marginTop: isLargeScreen ? '24px' : '16px',
                    padding: isMobile ? '14px 16px' : isLargeScreen ? '18px 24px' : '16px 20px',
                    background: `linear-gradient(135deg, ${COLORS.lightBg} 0%, ${COLORS.white} 100%)`,
                    borderRadius: isLargeScreen ? '10px' : '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    border: `1px solid ${COLORS.border}`,
                    boxShadow: COLORS.shadowSm
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{
                        fontSize: isMobile ? '18px' : isLargeScreen ? '24px' : '20px'
                      }}>{TYPE_ICONS[type] || '📊'}</span>
                      <span style={{
                        fontSize: isMobile ? '14px' : isLargeScreen ? '16px' : '15px',
                        fontWeight: '600',
                        color: COLORS.dark
                      }}>
                        Total de registros
                      </span>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: isMobile ? '8px 14px' : '10px 18px',
                      backgroundColor: COLORS.primary,
                      borderRadius: '8px',
                      color: COLORS.white
                    }}>
                      <span style={{
                        fontSize: isMobile ? '18px' : isLargeScreen ? '22px' : '20px',
                        fontWeight: '700'
                      }}>{sortedData.length}</span>
                      <span style={{
                        fontSize: isMobile ? '12px' : isLargeScreen ? '14px' : '13px',
                        opacity: 0.9
                      }}>{type}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});

export default DetailModal;