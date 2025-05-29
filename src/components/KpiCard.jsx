// src/components/KpiCard.jsx
import PropTypes from 'prop-types';
import './KpiCard.css'; // Adicionar o arquivo CSS

/**
 * Componente de cartão KPI para exibir métricas importantes
 */
const KpiCard = ({ title, value, subtitle, trend, icon, color }) => {
  return (
    <div className="kpi-card">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value" style={{ color: color }}>
        {value}
      </div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      {trend && (
        <div className="kpi-trend">
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
        </div>
      )}
      {icon && <div className="kpi-icon">{icon}</div>}
    </div>
  );
};

KpiCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  trend: PropTypes.number,
  icon: PropTypes.node,
  color: PropTypes.string
};

KpiCard.defaultProps = {
  subtitle: null,
  trend: null,
  icon: null,
  color: '#4E5859' // cor primária da SA IMOB
};

export default KpiCard;