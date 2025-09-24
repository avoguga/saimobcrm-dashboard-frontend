import { useState, useMemo, useEffect } from 'react';

/**
 * Hook customizado para gerenciar dados de vendas
 * Centraliza a lógica de estado dos dados originais, filtrados e opções
 */
export const useSalesData = (data) => {
  const [rawSalesData, setRawSalesData] = useState(data); // Dados originais sem filtro
  const [salesData, setSalesData] = useState(data); // Dados filtrados
  const [comparisonData, setComparisonData] = useState(null);

  // Sincronizar dados quando prop data muda
  useEffect(() => {
    setRawSalesData(data);
    setSalesData(data);
  }, [data]);

  // Extrair opções de corretores dos dados ORIGINAIS COMPLETOS
  const corretorOptions = useMemo(() => {
    if (!data?._rawTablesData) return [];
    
    // Extrair nomes únicos dos corretores dos dados ORIGINAIS COMPLETOS
    const allLeads = [
      ...(data._rawTablesData.leadsDetalhes || []),
      ...(data._rawTablesData.organicosDetalhes || []),
      ...(data._rawTablesData.reunioesDetalhes || []),
      ...(data._rawTablesData.reunioesOrganicasDetalhes || []),
      ...(data._rawTablesData.vendasDetalhes || [])
    ];
    
    const uniqueCorretores = [...new Set(allLeads.map(item => {
      // Renomear 'SA IMOB' para 'Não atribuído' (como no filtro de busca avançada)
      const corretor = item.Corretor;
      return corretor === 'SA IMOB' ? 'Não atribuído' : corretor;
    }).filter(name => name && name.trim() !== ''))].sort();
    
    return uniqueCorretores.map(name => ({
      value: name,
      label: name
    }));
  }, [data?._rawTablesData]);

  // Extrair opções de fontes dos dados ORIGINAIS COMPLETOS  
  const sourceSelectOptions = useMemo(() => {
    if (!data?._rawTablesData) return [];
    
    // Extrair fontes únicas de todos os dados ORIGINAIS COMPLETOS
    const allLeads = [
      ...(data._rawTablesData.leadsDetalhes || []),
      ...(data._rawTablesData.organicosDetalhes || []),
      ...(data._rawTablesData.reunioesDetalhes || []),
      ...(data._rawTablesData.reunioesOrganicasDetalhes || []),
      ...(data._rawTablesData.vendasDetalhes || [])
    ];
    
    const uniqueFontes = [...new Set(allLeads.map(item => {
      // Tentar diferentes campos possíveis para fonte
      return item.fonte || item.Fonte || item.source || item.utm_source || '';
    }).filter(fonte => fonte && fonte.trim() !== ''))].sort();
    
    return uniqueFontes.map(fonte => ({
      value: fonte,
      label: fonte
    }));
  }, [data?._rawTablesData]);

  return {
    // Estados
    rawSalesData,
    salesData,
    comparisonData,
    
    // Setters
    setRawSalesData,
    setSalesData,
    setComparisonData,
    
    // Opções computadas
    corretorOptions,
    sourceSelectOptions
  };
};