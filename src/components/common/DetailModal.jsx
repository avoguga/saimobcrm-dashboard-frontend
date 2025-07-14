import React, { memo } from 'react';
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
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Funil</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Etapa</th>
                      </>
                    )}
                    {type === 'reunioes' && (
                      <>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Data da Reunião</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Nome do Lead</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Corretor</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Fonte</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Funil</th>
                        <th style={{ padding: '12px', textAlign: 'left', borderBottom: `1px solid ${COLORS.light}` }}>Etapa</th>
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
                  {data.map((item, index) => {
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

export default DetailModal;