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
const DetailModal = memo(({ isOpen, onClose, type, title, isLoading, data, error, initialFilterField, initialFilterValue, onFilterChange }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filterField, setFilterField] = useState(initialFilterField || 'Nome do Lead');
  const [filterValue, setFilterValue] = useState(initialFilterValue || '');

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
  
  const renderSortableHeader = (key, label) => (
    <th 
      style={{ 
        padding: '12px', 
        textAlign: 'left', 
        borderBottom: `1px solid ${COLORS.light}`,
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        backgroundColor: COLORS.lightBg,
        whiteSpace: 'nowrap',
        fontWeight: '600',
        color: COLORS.primary
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
          maxWidth: '120vw',
          maxHeight: '80vh',
          width: '1200px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do modal - FIXO */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '24px 24px 12px 24px',
          borderBottom: `2px solid ${COLORS.primary}`,
          backgroundColor: 'white',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <h3 style={{ margin: 0, color: COLORS.primary }}>{title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Botão de exportar para Excel */}
            <button 
              onClick={handleExportToExcel}
              disabled={!data || data.length === 0}
              style={{
                backgroundColor: COLORS.success,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                cursor: !data || data.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: !data || data.length === 0 ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (data && data.length > 0) {
                  e.target.style.backgroundColor = '#45b649';
                }
              }}
              onMouseLeave={(e) => {
                if (data && data.length > 0) {
                  e.target.style.backgroundColor = COLORS.success;
                }
              }}
              title="Exportar dados para Excel"
            >
              📊 Excel
            </button>
            
            {/* Botão de fechar */}
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
        </div>

        {/* Filtro por campo selecionável - FIXO */}
        {!isLoading && !error && data && data.length > 0 && (
          <div style={{ 
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e2e8f0',
            position: 'sticky',
            top: '60px',
            zIndex: 99
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
                // Notificar o componente pai
                if (onFilterChange) {
                  onFilterChange(e.target.value, '');
                }
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
              onChange={(e) => {
                setFilterValue(e.target.value);
                // Notificar o componente pai
                if (onFilterChange) {
                  onFilterChange(filterField, e.target.value);
                }
              }}
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
                onClick={() => {
                  setFilterValue('');
                  // Notificar o componente pai
                  if (onFilterChange) {
                    onFilterChange(filterField, '');
                  }
                }}
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

        {/* Conteúdo do modal - SCROLLABLE */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column'
        }}>
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
            <div style={{ 
              overflow: 'auto',
              flex: 1,
              position: 'relative',
              border: '1px solid #e2e8f0',
              borderRadius: '4px'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'separate',
                borderSpacing: 0,
                fontSize: '14px',
                position: 'relative'
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
                            <td style={{ padding: '12px' }}>{formatDate(item['Data de Criação'])}</td>
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
                            <td style={{ padding: '12px' }}>{formatDate(item['Data da Reunião'])}</td>
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
                          <td style={{ padding: '12px' }}>{formatDate(item['Data da Proposta'])}</td>
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
                          <td style={{ padding: '12px' }}>{formatDate(item['Data da Venda'])}</td>
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