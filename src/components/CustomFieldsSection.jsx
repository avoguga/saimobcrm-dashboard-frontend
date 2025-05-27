import { useState, useEffect } from 'react';
import { KommoAPI } from '../services/api';

const CustomFieldsSection = () => {
  const [customFields, setCustomFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedField, setExpandedField] = useState(null);

  // Buscar campos personalizados ao montar o componente
  useEffect(() => {
    fetchCustomFields();
  }, []);

  // Buscar valores de campo quando um campo é expandido
  useEffect(() => {
    if (expandedField) {
      fetchFieldValues(expandedField);
    }
  }, [expandedField]);

  // Buscar todos os campos personalizados
  const fetchCustomFields = async () => {
    setLoading(true);
    try {
      const response = await KommoAPI.getCustomFields();
      if (response && response.custom_fields) {
        setCustomFields(response.custom_fields);
      }
    } catch (error) {
      console.error('Erro ao buscar campos personalizados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar valores para um campo específico
  const fetchFieldValues = async (fieldId) => {
    try {
      const response = await KommoAPI.getCustomFieldValues(fieldId);
      if (response && response.values) {
        setFieldValues(prev => ({
          ...prev,
          [fieldId]: response.values
        }));
      }
    } catch (error) {
      console.error(`Erro ao buscar valores para o campo ${fieldId}:`, error);
    }
  };

  // Expandir/recolher detalhes de um campo
  const toggleFieldExpansion = (fieldId) => {
    setExpandedField(expandedField === fieldId ? null : fieldId);
  };

  // Converter valores de campo para formato de tabela
  const renderFieldValues = (fieldId) => {
    const values = fieldValues[fieldId] || {};
    const entries = Object.entries(values);
    
    if (entries.length === 0) {
      return <p className="no-data">Sem dados disponíveis</p>;
    }

    return (
      <div className="field-values-table">
        <div className="field-values-header">
          <div className="field-value-cell">Valor</div>
          <div className="field-value-cell">Contagem</div>
        </div>
        {entries.map(([value, count], index) => (
          <div className="field-values-row" key={index}>
            <div className="field-value-cell">{value}</div>
            <div className="field-value-cell">{count}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="custom-fields-section">
      <h2>Campos Personalizados</h2>
      
      {loading ? (
        <div className="loading-fields">Carregando campos...</div>
      ) : (
        <div className="custom-fields-list">
          {customFields.length === 0 ? (
            <p className="no-fields">Nenhum campo personalizado encontrado</p>
          ) : (
            customFields.map((field, index) => (
              <div className="custom-field-card" key={index}>
                <div 
                  className="field-header" 
                  onClick={() => toggleFieldExpansion(field.id)}
                >
                  <h3>{field.name}</h3>
                  <span className="field-type">{field.type}</span>
                  <span className="expand-icon">
                    {expandedField === field.id ? '▼' : '▶'}
                  </span>
                </div>
                
                {expandedField === field.id && (
                  <div className="field-details">
                    <div className="field-info">
                      <p><strong>ID:</strong> {field.id}</p>
                      <p><strong>Tipo:</strong> {field.type}</p>
                      {field.enums && (
                        <p><strong>Opções:</strong> {field.enums.length}</p>
                      )}
                    </div>
                    
                    <div className="field-values">
                      <h4>Distribuição de valores</h4>
                      {fieldValues[field.id] ? renderFieldValues(field.id) : (
                        <div className="loading-values">Carregando valores...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CustomFieldsSection;