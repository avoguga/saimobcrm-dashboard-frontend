import * as XLSX from 'xlsx';

/**
 * Utilitário para exportar dados para Excel
 */
export class ExcelExporter {
  /**
   * Exporta dados de gráficos para Excel
   * @param {Array} data - Dados do gráfico
   * @param {string} filename - Nome do arquivo (sem extensão)
   * @param {string} sheetName - Nome da planilha
   * @param {Object} options - Opções adicionais
   */
  static exportChartData(data, filename, sheetName = 'Dados', options = {}) {
    try {
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Dados inválidos ou vazios para exportação');
      }

      // Criar workbook
      const workbook = XLSX.utils.book_new();
      
      // Converter dados para worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Adicionar metadados se fornecidos
      if (options.metadata) {
        this.addMetadataSheet(workbook, options.metadata);
      }
      
      // Fazer download
      const fileName = `${filename}_${this.formatDate()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      return { success: true, fileName };
    } catch (error) {
      console.error('Erro ao exportar dados para Excel:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Exporta dados de reuniões para Excel
   * @param {Array} meetingsData - Dados das reuniões
   * @param {Object} filters - Filtros aplicados
   * @param {string} period - Período dos dados
   */
  static exportMeetingsData(meetingsData, filters = {}, period = '') {
    const filename = 'relatorio_reunioes';
    
    // Preparar dados para exportação
    const exportData = meetingsData.map(meeting => ({
      'Corretor': meeting.name || meeting.corretor || '',
      'Reuniões Realizadas': meeting.meetingsHeld || meeting.meetings || 0,
      'Total de Leads': meeting.totalLeads || meeting.leads || 0,
      'Taxa de Conversão (%)': meeting.totalLeads > 0 
        ? ((meeting.meetingsHeld || 0) / meeting.totalLeads * 100).toFixed(2)
        : '0.00'
    }));

    const metadata = {
      'Relatório': 'Reuniões Realizadas',
      'Período': period,
      'Data de Geração': new Date().toLocaleString('pt-BR'),
      'Total de Registros': exportData.length,
      ...this.formatFilters(filters)
    };

    return this.exportChartData(exportData, filename, 'Reuniões', { metadata });
  }

  /**
   * Exporta dados de vendas para Excel
   * @param {Array} salesData - Dados das vendas
   * @param {Object} filters - Filtros aplicados
   * @param {string} period - Período dos dados
   */
  static exportSalesData(salesData, filters = {}, period = '') {
    const filename = 'relatorio_vendas';
    
    // Preparar dados para exportação
    const exportData = salesData.map(sale => ({
      'Corretor': sale.name || sale.corretor || '',
      'Vendas Realizadas': sale.sales || sale.vendas || 0,
      'Total de Reuniões': sale.meetingsHeld || sale.meetings || 0,
      'Taxa de Conversão (%)': (sale.meetingsHeld || 0) > 0 
        ? ((sale.sales || 0) / (sale.meetingsHeld || 0) * 100).toFixed(2)
        : '0.00',
      'Ticket Médio': sale.averageTicket || sale.ticketMedio || 0,
      'Receita Total': sale.totalRevenue || sale.receitaTotal || 0
    }));

    const metadata = {
      'Relatório': 'Vendas Realizadas',
      'Período': period,
      'Data de Geração': new Date().toLocaleString('pt-BR'),
      'Total de Registros': exportData.length,
      ...this.formatFilters(filters)
    };

    return this.exportChartData(exportData, filename, 'Vendas', { metadata });
  }

  /**
   * Exporta dados de leads para Excel
   * @param {Array} leadsData - Dados dos leads
   * @param {Object} filters - Filtros aplicados
   * @param {string} period - Período dos dados
   */
  static exportLeadsData(leadsData, filters = {}, period = '') {
    const filename = 'relatorio_leads';
    
    // Preparar dados para exportação
    const exportData = leadsData.map(lead => ({
      'Corretor': lead.name || lead.corretor || '',
      'Leads Pagos': lead.paidLeads || lead.leadsPagos || 0,
      'Leads Orgânicos': lead.organicLeads || lead.leadsOrganicos || 0,
      'Total de Leads': (lead.paidLeads || 0) + (lead.organicLeads || 0),
      'Reuniões Agendadas': lead.meetingsHeld || lead.meetings || 0,
      'Taxa de Conversão Lead→Reunião (%)': ((lead.paidLeads || 0) + (lead.organicLeads || 0)) > 0 
        ? ((lead.meetingsHeld || 0) / ((lead.paidLeads || 0) + (lead.organicLeads || 0)) * 100).toFixed(2)
        : '0.00'
    }));

    const metadata = {
      'Relatório': 'Leads Gerados',
      'Período': period,
      'Data de Geração': new Date().toLocaleString('pt-BR'),
      'Total de Registros': exportData.length,
      ...this.formatFilters(filters)
    };

    return this.exportChartData(exportData, filename, 'Leads', { metadata });
  }

  /**
   * Exporta dados de marketing para Excel
   * @param {Object} marketingData - Dados de marketing completos
   * @param {Object} filters - Filtros aplicados
   * @param {string} period - Período dos dados
   */
  static exportMarketingData(marketingData, filters = {}, period = '') {
    const filename = 'relatorio_marketing';
    
    try {
      const workbook = XLSX.utils.book_new();
      
      // Aba 1: Resumo Geral
      const summaryData = [{
        'Total de Leads': marketingData?.totalLeads || 0,
        'Leads Orgânicos': marketingData?.organicLeads || 0,
        'Leads Pagos': marketingData?.paidLeads || 0,
        'Custo Total': marketingData?.totalCost || 0,
        'CPL (Custo por Lead)': marketingData?.costPerLead || 0,
        'ROAS': marketingData?.roas || 0,
        'Taxa de Conversão (%)': marketingData?.conversionRate || 0
      }];
      
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

      // Aba 2: Dados por Fonte
      if (marketingData?.leadsBySource && marketingData.leadsBySource.length > 0) {
        const sourceData = marketingData.leadsBySource.map(source => ({
          'Fonte': source.name || source.fonte || '',
          'Leads': source.leads || source.value || 0,
          'Custo': source.cost || source.custo || 0,
          'CPL': source.cpl || (source.cost && source.leads ? source.cost / source.leads : 0),
          'Percentual (%)': source.percentage || 0
        }));
        
        const sourceSheet = XLSX.utils.json_to_sheet(sourceData);
        XLSX.utils.book_append_sheet(workbook, sourceSheet, 'Por Fonte');
      }

      // Aba 3: Campanhas Facebook (se houver)
      if (marketingData?.campaignInsights && marketingData.campaignInsights.length > 0) {
        const campaignData = marketingData.campaignInsights.map(campaign => ({
          'Nome da Campanha': campaign.campaign_name || '',
          'Impressões': campaign.impressions || 0,
          'Cliques': campaign.clicks || 0,
          'CTR (%)': campaign.ctr || 0,
          'CPC': campaign.cpc || 0,
          'Gasto': campaign.spend || 0,
          'Leads': campaign.leads || 0,
          'CPL': campaign.cost_per_lead || 0
        }));
        
        const campaignSheet = XLSX.utils.json_to_sheet(campaignData);
        XLSX.utils.book_append_sheet(workbook, campaignSheet, 'Campanhas Facebook');
      }

      // Adicionar metadados
      const metadata = {
        'Relatório': 'Marketing Completo',
        'Período': period,
        'Data de Geração': new Date().toLocaleString('pt-BR'),
        ...this.formatFilters(filters)
      };
      
      this.addMetadataSheet(workbook, metadata);
      
      // Fazer download
      const fileName = `${filename}_${this.formatDate()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      return { success: true, fileName };
    } catch (error) {
      console.error('Erro ao exportar dados de marketing:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Adiciona aba de metadados ao workbook
   * @param {Object} workbook - Workbook do Excel
   * @param {Object} metadata - Metadados para adicionar
   */
  static addMetadataSheet(workbook, metadata) {
    const metadataArray = Object.entries(metadata).map(([key, value]) => ({
      'Campo': key,
      'Valor': value
    }));
    
    const metadataSheet = XLSX.utils.json_to_sheet(metadataArray);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Informações');
  }

  /**
   * Formata filtros para exibição nos metadados
   * @param {Object} filters - Filtros aplicados
   */
  static formatFilters(filters) {
    const formattedFilters = {};
    
    if (filters.corretor) {
      formattedFilters['Corretor Filtrado'] = filters.corretor;
    }
    
    if (filters.fonte) {
      formattedFilters['Fonte Filtrada'] = filters.fonte;
    }
    
    if (filters.campanha) {
      formattedFilters['Campanha Filtrada'] = filters.campanha;
    }
    
    return formattedFilters;
  }

  /**
   * Formata data para nome do arquivo
   */
  static formatDate() {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
  }

  /**
   * Exporta dados de uma tabela específica (para modais)
   * @param {Array} tableData - Dados da tabela
   * @param {string} tableName - Nome da tabela
   * @param {Object} options - Opções adicionais
   */
  static exportTableData(tableData, tableName, options = {}) {
    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
      alert('Não há dados para exportar');
      return { success: false, error: 'Dados vazios' };
    }

    const filename = `tabela_${tableName.toLowerCase().replace(/\s+/g, '_')}`;
    
    // Preparar metadados
    const metadata = {
      'Tabela': tableName,
      'Data de Geração': new Date().toLocaleString('pt-BR'),
      'Total de Registros': tableData.length,
      ...(options.period && { 'Período': options.period }),
      ...(options.filters && this.formatFilters(options.filters))
    };

    return this.exportChartData(tableData, filename, tableName, { metadata });
  }
}

export default ExcelExporter;