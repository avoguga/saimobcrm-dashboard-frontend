// src/components/MetricsTable.jsx
import PropTypes from 'prop-types';
import './MetricsTable.css';

/**
 * Componente de tabela para exibir métricas e KPIs
 */
const MetricsTable = ({ title, data, columns }) => {
  if (!data || !data.length || !columns || !columns.length) {
    return (
      <div className="metrics-section">
        <h3>{title}</h3>
        <div className="empty-table-message">Nenhum dado disponível</div>
      </div>
    );
  }

  return (
    <div className="metrics-section">
      <h3>{title}</h3>
      <div className="table-header">
        {columns.map((column, index) => (
          <div key={index} className="table-cell">{column.header}</div>
        ))}
      </div>
      {data.map((row, rowIndex) => (
        <div key={rowIndex} className="table-row">
          {columns.map((column, colIndex) => (
            <div 
              key={colIndex} 
              className={`table-cell ${column.numeric ? 'numeric' : ''}`}
            >
              {column.format ? column.format(row[column.field]) : row[column.field]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

MetricsTable.propTypes = {
  title: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.object),
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      numeric: PropTypes.bool,
      format: PropTypes.func
    })
  )
};

MetricsTable.defaultProps = {
  data: [],
  columns: []
};

export default MetricsTable;