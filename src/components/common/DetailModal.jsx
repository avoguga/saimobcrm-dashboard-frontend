import React, { memo, useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';

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

// Memoized Modal Component to prevent parent re-renders
const DetailModal = memo(({ isOpen, onClose, type, title, isLoading, data, error, initialFilterField, initialFilterValue }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filterField, setFilterField] = useState(initialFilterField || 'Nome do Lead');
  const [filterValue, setFilterValue] = useState(initialFilterValue || '');
  
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
        return ['Data da Venda', ...commonFields, 'Valor da Venda'];
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
        
        const fieldValue = (item[filterField] || '').toString().toLowerCase();
        return fieldValue.includes(filterValue.toLowerCase());
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
  
  const renderSortableHeader = (key, label) => (
    <th 
      style={{ 
        padding: '12px', 
        textAlign: 'left', 
        borderBottom: `1px solid ${COLORS.light}`,
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative'
      }}
      onClick={() => handleSort(key)}
    >
      {label}
      <span style={{ 
        marginLeft: '5px', 
        fontSize: '12px',
        opacity: sortConfig.key === key ? 1 : 0.3
      }}>
        {sortConfig.key === key && sortConfig.direction === 'asc' ? '▲' : 
         sortConfig.key === key && sortConfig.direction === 'desc' ? '▼' : '↕'}
      </span>
    </th>
  );
  
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
          maxWidth: '120vw',
          maxHeight: '80vh',
          width: '1200px',
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

        {/* Filtro por campo selecionável */}
        {!isLoading && !error && data && data.length > 0 && (
          <div style={{ 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <label style={{ 
              fontSize: '14px', 
              fontWeight: 'bold',
              color: COLORS.primary,
              minWidth: '60px'
            }}>
              Filtrar por:
            </label>
            <select
              value={filterField}
              onChange={(e) => {
                setFilterField(e.target.value);
                setFilterValue(''); // Limpar o valor quando mudar o campo
              }}
              style={{
                padding: '8px 12px',
                border: `1px solid ${COLORS.light}`,
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white',
                minWidth: '140px'
              }}
            >
              {getFilterOptions().map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder={`Digite para filtrar por ${filterField}...`}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '8px 12px',
                border: `1px solid ${COLORS.light}`,
                borderRadius: '4px',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = COLORS.primary}
              onBlur={(e) => e.target.style.borderColor = COLORS.light}
            />
            {filterValue && (
              <button
                onClick={() => setFilterValue('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.tertiary,
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px'
                }}
                title="Limpar filtro"
              >
                ✕
              </button>
            )}
            <div style={{ 
              fontSize: '12px', 
              color: COLORS.tertiary,
              minWidth: '100px',
              textAlign: 'right'
            }}>
              {filterValue ? 
                `${sortedData?.length || 0} de ${data?.length || 0} registros` : 
                `${data?.length || 0} registros`
              }
            </div>
          </div>
        )}

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
          ) : !data || data.length === 0 ? (
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
                    {type === 'vendas' && (
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
                  </tr>
                </thead>
                <tbody>
                  {(sortedData || []).map((item, index) => {
                    const isOrganic = item['Fonte'] === 'Orgânico';
                    const rowBgColor = isOrganic 
                      ? (index % 2 === 0 ? 'rgba(76, 224, 179, 0.05)' : 'rgba(76, 224, 179, 0.1)')
                      : (index % 2 === 0 ? 'white' : COLORS.lightBg);
                    
                    return (
                      <tr key={index} style={{ 
                        backgroundColor: rowBgColor,
                        borderBottom: `1px solid ${COLORS.light}`,
                        borderLeft: isOrganic ? `3px solid #4ce0b3` : `3px solid ${COLORS.secondary}`
                      }}>
                        {type === 'leads' && (
                          <>
                            <td style={{ padding: '12px' }}>{item['Data de Criação']}</td>
                            <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                            <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                            <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                            <td style={{ padding: '12px' }}>{item['Produto'] || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>{item['Anúncio'] || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>{item['Público'] || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>{item['Funil']}</td>
                            <td style={{ padding: '12px' }}>{item['Etapa']}</td>
                          </>
                        )}
                        {type === 'reunioes' && (
                          <>
                            <td style={{ padding: '12px' }}>{item['Data da Reunião']}</td>
                            <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                            <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                            <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                            <td style={{ padding: '12px' }}>{item['Produto'] || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>{item['Anúncio'] || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>{item['Público'] || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>{item['Funil']}</td>
                            <td style={{ padding: '12px' }}>{item['Etapa']}</td>
                          </>
                        )}
                        {type === 'propostas' && (
                        <>
                          <td style={{ padding: '12px' }}>{item['Data da Proposta']}</td>
                          <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                          <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                          <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                          <td style={{ padding: '12px' }}>{item['Produto'] || 'N/A'}</td>
                          <td style={{ padding: '12px' }}>{item['Anúncio'] || 'N/A'}</td>
                          <td style={{ padding: '12px' }}>{item['Público'] || 'N/A'}</td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            {item['is_proposta'] === true ? (
                              <span style={{ 
                                color: '#28a745', 
                                fontWeight: 'bold',
                                backgroundColor: '#d4edda',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                ✓ SIM
                              </span>
                            ) : (
                              <span style={{ 
                                color: '#dc3545', 
                                fontWeight: 'bold',
                                backgroundColor: '#f8d7da',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                ✗ NÃO
                              </span>
                            )}
                          </td>
                        </>
                      )}
                      {type === 'vendas' && (
                        <>
                          <td style={{ padding: '12px' }}>{item['Data da Venda']}</td>
                          <td style={{ padding: '12px' }}>{item['Nome do Lead']}</td>
                          <td style={{ padding: '12px' }}>{item['Corretor']}</td>
                          <td style={{ padding: '12px' }}>{item['Fonte']}</td>
                          <td style={{ padding: '12px' }}>{item['Produto'] || 'N/A'}</td>
                          <td style={{ padding: '12px' }}>{item['Anúncio'] || 'N/A'}</td>
                          <td style={{ padding: '12px' }}>{item['Público'] || 'N/A'}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: COLORS.success }}>
                            {item['Valor da Venda']}
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
                marginTop: '16px', 
                padding: '12px',
                backgroundColor: COLORS.lightBg,
                borderRadius: '4px',
                textAlign: 'center',
                fontWeight: 'bold',
                color: COLORS.primary
              }}>
                Total: {sortedData.length} {type}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
});

export default DetailModal;