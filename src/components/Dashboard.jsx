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
  danger: '#ff3a5e'
};


const Dashboard = () => {
  

  // Array de cores da paleta para uso nos gráficos
  const colorPalette = [
    COLORS.primary,
    COLORS.secondary,
    COLORS.tertiary,
    COLORS.success,
    COLORS.warning,
    COLORS.danger,
    COLORS.dark,
    COLORS.light
  ];


  return (
    <div className="dashboard">
     
    </div>
  );
};

export default Dashboard;