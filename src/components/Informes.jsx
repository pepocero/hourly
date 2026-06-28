import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Download, Euro, Clock, BarChart3, FileDown, FileCheck, Trash2 } from 'lucide-react';
import apiService from '../services/api';
import { calcularHorasExtrasPorSemanas, formatDiasLaborables, getSundayOfWeek } from '../utils/contratoHoras';
import { formatFechaEU, formatFechaEUCorta, formatFechaRegistro } from '../utils/formatFecha';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';

function Informes() {
  const [tipoInforme, setTipoInforme] = useState('detallado');
  const [tipoDatos, setTipoDatos] = useState('proyectos'); // 'proyectos' o 'contratos'
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [proyectoFiltro, setProyectoFiltro] = useState('');
  const [contratoFiltro, setContratoFiltro] = useState('');
  const [proyectos, setProyectos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [horas, setHoras] = useState([]);
  const [horariosContrato, setHorariosContrato] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportModal, setExportModal] = useState({ isOpen: false, type: null });
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [grupoLiquidacionToAnular, setGrupoLiquidacionToAnular] = useState(null);
  const [showAnularLiquidacionModal, setShowAnularLiquidacionModal] = useState(false);
  const [anulandoLiquidacion, setAnulandoLiquidacion] = useState(false);

  // Establecer fechas por defecto (mes actual)
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setFechaInicio(firstDayOfMonth.toISOString().split('T')[0]);
    setFechaFin(lastDayOfMonth.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    loadProyectos();
    loadContratos();
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      loadDatos();
    }
  }, [fechaInicio, fechaFin, proyectoFiltro, contratoFiltro, tipoDatos]);

  const loadProyectos = async () => {
    try {
      const response = await apiService.getProyectos();
      if (response.success) {
        setProyectos(response.data);
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error);
    }
  };

  const loadContratos = async () => {
    try {
      const response = await apiService.getContratos();
      if (response.success) {
        setContratos(response.data);
      }
    } catch (error) {
      console.error('Error cargando contratos:', error);
    }
  };

  const loadDatos = async () => {
    try {
      setLoading(true);
      setError('');

      if (tipoDatos === 'proyectos') {
        setLiquidaciones([]);
        // Cargar horas trabajadas
        const horasResponse = await apiService.getHoras(fechaInicio, fechaFin);
        if (horasResponse.success) {
          let horasFiltradas = horasResponse.data;
          
          // Aplicar filtro por proyecto si está seleccionado
          if (proyectoFiltro) {
            horasFiltradas = horasResponse.data.filter(hora => 
              hora.proyecto_id === parseInt(proyectoFiltro)
            );
          }
          
          setHoras(horasFiltradas);
        }

        // Cargar resumen
        const resumenResponse = await apiService.getResumenHoras(fechaInicio, fechaFin);
        if (resumenResponse.success) {
          setResumen(resumenResponse.data);
        }
      } else if (tipoDatos === 'contratos') {
        setLiquidaciones([]);
        // Cargar horarios de contrato
        const horariosResponse = await apiService.getHorariosContrato(
          contratoFiltro || null,
          fechaInicio,
          fechaFin
        );
        if (horariosResponse.success) {
          setHorariosContrato(horariosResponse.data);
        }
      } else if (tipoDatos === 'liquidaciones') {
        setHoras([]);
        setHorariosContrato([]);
        setResumen(null);

        const liquidacionesResponse = await apiService.getLiquidacionesContrato(
          contratoFiltro ? parseInt(contratoFiltro) : null,
          null,
          fechaInicio,
          fechaFin
        );
        if (liquidacionesResponse.success) {
          setLiquidaciones(liquidacionesResponse.data || []);
        }
      }

    } catch (error) {
      setError('Error al cargar los datos del informe');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateLong = formatFechaEUCorta;
  const formatDate = formatFechaEU;

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5); // HH:MM
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Calcular subtotales por proyecto
  const calcularSubtotalesPorProyecto = () => {
    const subtotales = {};
    
    horas.forEach(hora => {
      const proyectoId = hora.proyecto_id;
      const proyectoNombre = hora.proyecto_nombre;
      
      if (!subtotales[proyectoId]) {
        subtotales[proyectoId] = {
          nombre: proyectoNombre,
          color: hora.proyecto_color,
          totalHoras: 0,
          totalMinutos: 0,
          totalGanancias: 0,
          registros: []
        };
      }
      
      subtotales[proyectoId].totalHoras += parseFloat(hora.duracion_minutos || 0) / 60;
      subtotales[proyectoId].totalMinutos += parseInt(hora.duracion_minutos || 0);
      subtotales[proyectoId].totalGanancias += parseFloat(hora.total || 0);
      subtotales[proyectoId].registros.push(hora);
    });
    
    return subtotales;
  };

  // Calcular subtotales por contrato con horas extras
  const calcularSubtotalesPorContrato = () => {
    const subtotales = {};
    
    horariosContrato.forEach(horario => {
      const contratoId = horario.contrato_id;
      const contratoNombre = horario.contrato_nombre;
      
      if (!subtotales[contratoId]) {
        subtotales[contratoId] = {
          nombre: contratoNombre,
          horasSemanales: horario.horas_semanales || 0,
          valorHoraExtra: horario.valor_hora_extra || 0,
          diasLaborables: horario.dias_laborables,
          diaCierreLiquidacion: horario.dia_cierre_liquidacion,
          totalMinutos: 0,
          registros: []
        };
      }
      
      subtotales[contratoId].totalMinutos += parseInt(horario.duracion_minutos || 0);
      subtotales[contratoId].registros.push(horario);
    });

    Object.keys(subtotales).forEach(contratoId => {
      const subtotal = subtotales[contratoId];
      const resultado = calcularHorasExtrasPorSemanas(
        subtotal.registros,
        {
          horas_semanales: subtotal.horasSemanales,
          valor_hora_extra: subtotal.valorHoraExtra,
          dias_laborables: subtotal.diasLaborables,
          dia_cierre_liquidacion: subtotal.diaCierreLiquidacion
        },
        fechaInicio,
        fechaFin
      );

      const totalHoras = subtotal.totalMinutos / 60;

      subtotal.totalHoras = totalHoras;
      subtotal.horasEsperadas = resultado.semanas.reduce((sum, s) => sum + s.horasEsperadas, 0);
      subtotal.horasExtras = resultado.horasExtras;
      subtotal.horasNormales = Math.min(totalHoras, subtotal.horasEsperadas);
      subtotal.totalExtras = resultado.importe;
      subtotal.semanas = resultado.semanas;
    });
    
    return subtotales;
  };

  const subtotalesPorProyecto = tipoDatos === 'proyectos' ? calcularSubtotalesPorProyecto() : {};
  const subtotalesPorContrato = tipoDatos === 'contratos' ? calcularSubtotalesPorContrato() : {};

  // Calcular totales generales
  const totalGeneralHoras = tipoDatos === 'proyectos' 
    ? horas.reduce((sum, hora) => sum + (parseFloat(hora.duracion_minutos || 0) / 60), 0)
    : horariosContrato.reduce((sum, horario) => sum + (parseFloat(horario.duracion_minutos || 0) / 60), 0);
  
  const totalGeneralMinutos = tipoDatos === 'proyectos'
    ? horas.reduce((sum, hora) => sum + parseInt(hora.duracion_minutos || 0), 0)
    : horariosContrato.reduce((sum, horario) => sum + parseInt(horario.duracion_minutos || 0), 0);
  
  const totalGeneralGanancias = tipoDatos === 'proyectos'
    ? horas.reduce((sum, hora) => sum + parseFloat(hora.total || 0), 0)
    : Object.values(subtotalesPorContrato).reduce((sum, subtotal) => sum + subtotal.totalExtras, 0);
  
  const totalRegistros = tipoDatos === 'proyectos' ? horas.length : horariosContrato.length;

  const tiposInforme = [
    { id: 'detallado', label: 'Informe Detallado', icon: FileText, description: 'Lista completa de horas trabajadas con subtotales por proyecto' },
    { id: 'por_proyecto', label: 'Por Proyecto', icon: BarChart3, description: 'Resumen agrupado por proyecto' },
    { id: 'mensual', label: 'Mensual', icon: Calendar, description: 'Resumen mensual de horas trabajadas' }
  ];

  const getFinSemana = (semanaLunes) => getSundayOfWeek(semanaLunes);

  const agruparLiquidacionesPorSemana = () => {
    const grupos = {};

    liquidaciones.forEach((liq) => {
      const key = `${liq.contrato_id}-${liq.semana_lunes}`;
      if (!grupos[key]) {
        grupos[key] = {
          contratoId: liq.contrato_id,
          contratoNombre: liq.contrato_nombre,
          contratoColor: liq.contrato_color || '#8b5cf6',
          semanaLunes: liq.semana_lunes,
          semanaFin: getFinSemana(liq.semana_lunes),
          registros: []
        };
      }
      grupos[key].registros.push(liq);
    });

    return Object.values(grupos).sort((a, b) => {
      const cmpSemana = b.semanaLunes.localeCompare(a.semanaLunes);
      if (cmpSemana !== 0) return cmpSemana;
      return (a.contratoNombre || '').localeCompare(b.contratoNombre || '');
    });
  };

  const liquidacionesPorSemana = tipoDatos === 'liquidaciones' ? agruparLiquidacionesPorSemana() : [];
  const totalSemanasLiquidadas = liquidacionesPorSemana.length;
  const totalImporteLiquidaciones = liquidaciones.reduce((sum, liq) => sum + parseFloat(liq.importe || 0), 0);
  const totalHorasExtrasLiquidaciones = liquidacionesPorSemana.reduce((sum, grupo) => {
    const refLiq = grupo.registros.find((r) => r.tipo === 'definitiva')
      || grupo.registros.find((r) => r.tipo === 'anticipada');
    return sum + (refLiq ? parseFloat(refLiq.horas_extras || 0) : 0);
  }, 0);
  const liquidacionesPorTipo = liquidaciones.reduce((acc, liq) => {
    acc[liq.tipo] = (acc[liq.tipo] || 0) + 1;
    return acc;
  }, {});

  const getTipoLiquidacionStyle = (tipo) => {
    switch (tipo) {
      case 'anticipada':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'definitiva':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ajuste':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatFechaRegistroDisplay = formatFechaRegistro;

  const handleExportarCSVClick = () => {
    if (!fechaInicio || !fechaFin) {
      setAlertModal({
        isOpen: true,
        title: 'Fechas requeridas',
        message: 'Selecciona un rango de fechas antes de exportar.',
        type: 'warning'
      });
      return;
    }
    if (tipoDatos === 'proyectos' && horas.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Sin datos',
        message: 'No hay horas registradas en el periodo seleccionado para exportar.',
        type: 'info'
      });
      return;
    }
    setExportModal({ isOpen: true, type: 'csv' });
  };

  const handleExportarPDFClick = () => {
    if (!fechaInicio || !fechaFin) {
      setAlertModal({
        isOpen: true,
        title: 'Fechas requeridas',
        message: 'Selecciona un rango de fechas antes de exportar.',
        type: 'warning'
      });
      return;
    }
    if (tipoDatos === 'proyectos' && horas.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Sin datos',
        message: 'No hay horas registradas en el periodo seleccionado para generar el PDF.',
        type: 'info'
      });
      return;
    }
    if (tipoDatos === 'contratos' && horariosContrato.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Sin datos',
        message: 'No hay horarios de contrato en el periodo seleccionado para generar el PDF.',
        type: 'info'
      });
      return;
    }
    if (tipoDatos === 'liquidaciones' && liquidaciones.length === 0) {
      setAlertModal({
        isOpen: true,
        title: 'Sin datos',
        message: 'No hay liquidaciones en el periodo seleccionado para generar el PDF.',
        type: 'info'
      });
      return;
    }
    setExportModal({ isOpen: true, type: 'pdf' });
  };

  const handleExportConfirm = async () => {
    const exportType = exportModal.type;
    setExportModal({ isOpen: false, type: null });

    if (exportType === 'csv') {
      try {
        await apiService.exportarCSV(fechaInicio, fechaFin);
      } catch (error) {
        console.error('Error exportando CSV:', error);
        setAlertModal({
          isOpen: true,
          title: 'Error al exportar',
          message: 'No se pudo generar el archivo CSV. Inténtalo de nuevo.',
          type: 'error'
        });
      }
      return;
    }

    if (exportType === 'pdf') {
      const title = tipoDatos === 'proyectos'
        ? 'Informe de Horas Trabajadas'
        : tipoDatos === 'contratos'
          ? 'Informe de Horarios de Contrato'
          : 'Informe de Liquidaciones';

      const subtitle = tipoDatos === 'liquidaciones'
        ? 'Liquidaciones registradas por semana'
        : `Tipo: ${tiposInforme.find(t => t.id === tipoInforme)?.label || 'Detallado'}`;

      try {
        const { default: pdfService } = await import('../services/pdfService');

        if (tipoDatos === 'proyectos') {
          pdfService.generatePDF(
            title,
            subtitle,
            fechaInicio,
            fechaFin,
            horas,
            subtotalesPorProyecto,
            {
              totalHoras: totalGeneralHoras,
              totalGanancias: totalGeneralGanancias,
              totalRegistros: horas.length,
              promedioMinutos: horas.length > 0 ? totalGeneralMinutos / horas.length : 0
            }
          );
        } else if (tipoDatos === 'contratos') {
          pdfService.generatePDF(
            title,
            subtitle,
            fechaInicio,
            fechaFin,
            horariosContrato,
            subtotalesPorContrato,
            {
              totalHoras: totalGeneralHoras,
              totalGanancias: totalGeneralGanancias,
              totalRegistros: horariosContrato.length,
              promedioMinutos: horariosContrato.length > 0 ? totalGeneralMinutos / horariosContrato.length : 0
            }
          );
        } else {
          pdfService.generateLiquidacionesPDF(
            title,
            subtitle,
            fechaInicio,
            fechaFin,
            liquidacionesPorSemana,
            {
              totalSemanas: totalSemanasLiquidadas,
              totalRegistros: liquidaciones.length,
              totalHorasExtras: totalHorasExtrasLiquidaciones,
              totalImporte: totalImporteLiquidaciones
            }
          );
        }
      } catch (error) {
        console.error('Error exportando PDF:', error);
        setAlertModal({
          isOpen: true,
          title: 'Error al exportar',
          message: 'No se pudo generar el archivo PDF. Inténtalo de nuevo.',
          type: 'error'
        });
      }
    }
  };

  const exportModalTitle = exportModal.type === 'pdf' ? 'Exportar informe PDF' : 'Exportar horas a CSV';
  const exportModalMessage = exportModal.type === 'pdf'
    ? 'Se generará un documento PDF con los datos del informe actual.'
    : 'Se descargará un archivo CSV con las horas del periodo seleccionado.';
  const exportConfirmText = exportModal.type === 'pdf' ? 'Generar PDF' : 'Descargar CSV';

  const tieneDatosParaInforme = (
    (tipoDatos === 'proyectos' && horas.length > 0) ||
    (tipoDatos === 'contratos' && horariosContrato.length > 0) ||
    (tipoDatos === 'liquidaciones' && liquidaciones.length > 0)
  );

  const handleAnularLiquidacionClick = (grupo) => {
    setGrupoLiquidacionToAnular(grupo);
    setShowAnularLiquidacionModal(true);
  };

  const handleAnularLiquidacionConfirm = async () => {
    if (!grupoLiquidacionToAnular) return;
    setShowAnularLiquidacionModal(false);
    setAnulandoLiquidacion(true);

    try {
      const response = await apiService.anularLiquidacionesSemana(
        grupoLiquidacionToAnular.contratoId,
        grupoLiquidacionToAnular.semanaLunes
      );
      if (response.success) {
        await loadDatos();
      } else {
        setAlertModal({
          isOpen: true,
          title: 'No se pudo anular',
          message: response.error || 'Error al anular la liquidación.',
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'No se pudo anular',
        message: 'Error al anular la liquidación. Inténtalo de nuevo.',
        type: 'error'
      });
    } finally {
      setAnulandoLiquidacion(false);
      setGrupoLiquidacionToAnular(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Informes</h2>
          <p className="text-sm text-gray-600">Genera reportes detallados de tus horas trabajadas</p>
        </div>
        
        <div className="flex space-x-2 sm:space-x-3">
          {tipoDatos === 'proyectos' && (
            <button
              onClick={handleExportarCSVClick}
              className="btn-secondary flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="space-y-4">
          {/* Selector de tipo de datos */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Tipo de Datos
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => setTipoDatos('proyectos')}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  tipoDatos === 'proyectos'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Proyectos</span>
              </button>
              <button
                onClick={() => setTipoDatos('contratos')}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  tipoDatos === 'contratos'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Contratos</span>
              </button>
              <button
                onClick={() => setTipoDatos('liquidaciones')}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  tipoDatos === 'liquidaciones'
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileCheck className="h-5 w-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Liquidaciones</span>
              </button>
            </div>
          </div>

          {/* Tipo de informe */}
          {tipoDatos !== 'liquidaciones' && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
              Tipo de Informe
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tiposInforme.map((tipo) => {
                const Icon = tipo.icon;
                return (
                  <button
                    key={tipo.id}
                    onClick={() => setTipoInforme(tipo.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      tipoInforme === tipo.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{tipo.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{tipo.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {tipoDatos === 'liquidaciones' && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-900">
                Consulta qué semanas han sido liquidadas en el rango de fechas seleccionado.
                Se muestran las semanas cuyo periodo (lunes a domingo) coincide con el filtro.
              </p>
            </div>
          )}

          {/* Filtros de fecha y proyecto/contrato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div>
              {tipoDatos === 'proyectos' ? (
                <>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Proyecto (opcional)
                  </label>
                  <select
                    value={proyectoFiltro}
                    onChange={(e) => setProyectoFiltro(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Todos los proyectos</option>
                    {proyectos.map((proyecto) => (
                      <option key={proyecto.id} value={proyecto.id}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </select>
                </>
              ) : tipoDatos === 'contratos' ? (
                <>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Contrato (opcional)
                  </label>
                  <select
                    value={contratoFiltro}
                    onChange={(e) => setContratoFiltro(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Todos los contratos</option>
                    {contratos.map((contrato) => (
                      <option key={contrato.id} value={contrato.id}>
                        {contrato.nombre}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Contrato (opcional)
                  </label>
                  <select
                    value={contratoFiltro}
                    onChange={(e) => setContratoFiltro(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Todos los contratos</option>
                    {contratos.map((contrato) => (
                      <option key={contrato.id} value={contrato.id}>
                        {contrato.nombre}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          {loading && fechaInicio && fechaFin && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              <span>Actualizando informe...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Resumen general */}
      {tipoDatos !== 'liquidaciones' && (resumen || horariosContrato.length > 0) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Horas</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {totalGeneralHoras.toFixed(1)}h
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <Euro className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  {tipoDatos === 'contratos' ? 'Total Horas Extras' : 'Total Ganancias'}
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {tipoDatos === 'contratos' ? `$${totalGeneralGanancias.toFixed(2)}` : totalGeneralGanancias.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-purple-600" />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Registros</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {totalRegistros}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  {tipoDatos === 'proyectos' ? 'Proyectos' : 'Contratos'}
                </p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {tipoDatos === 'proyectos' ? Object.keys(subtotalesPorProyecto).length : Object.keys(subtotalesPorContrato).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de liquidaciones */}
      {tipoDatos === 'liquidaciones' && liquidaciones.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <div className="card">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
                <FileCheck className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Semanas liquidadas</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {totalSemanasLiquidadas}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Registros</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {liquidaciones.length}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-amber-600" />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Horas extras (liq.)</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-600">
                  {totalHorasExtrasLiquidaciones.toFixed(2)}h
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                <Euro className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-green-600" />
              </div>
              <div className="ml-2 sm:ml-3 lg:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Importe total</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                  ${totalImporteLiquidaciones.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalle de liquidaciones por semana */}
      {tipoDatos === 'liquidaciones' && liquidacionesPorSemana.length > 0 && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-orange-600" />
              <span>Semanas liquidadas</span>
            </h3>
            <p className="text-xs text-gray-500">
              {formatDateLong(fechaInicio)} – {formatDateLong(fechaFin)}
              {contratoFiltro && contratos.find((c) => c.id === parseInt(contratoFiltro)) && (
                <span> • {contratos.find((c) => c.id === parseInt(contratoFiltro)).nombre}</span>
              )}
            </p>
          </div>

          {(liquidacionesPorTipo.anticipada || liquidacionesPorTipo.definitiva || liquidacionesPorTipo.ajuste) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {liquidacionesPorTipo.anticipada > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {liquidacionesPorTipo.anticipada} anticipada{liquidacionesPorTipo.anticipada !== 1 ? 's' : ''}
                </span>
              )}
              {liquidacionesPorTipo.definitiva > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                  {liquidacionesPorTipo.definitiva} definitiva{liquidacionesPorTipo.definitiva !== 1 ? 's' : ''}
                </span>
              )}
              {liquidacionesPorTipo.ajuste > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  {liquidacionesPorTipo.ajuste} ajuste{liquidacionesPorTipo.ajuste !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          <div className="space-y-3">
            {liquidacionesPorSemana.map((grupo) => {
              const importeGrupo = grupo.registros.reduce((sum, r) => sum + parseFloat(r.importe || 0), 0);
              const refLiq = grupo.registros.find((r) => r.tipo === 'definitiva')
                || grupo.registros.find((r) => r.tipo === 'anticipada');
              const horasExtrasGrupo = refLiq ? parseFloat(refLiq.horas_extras || 0) : 0;

              return (
                <div
                  key={`${grupo.contratoId}-${grupo.semanaLunes}`}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                  style={{ borderLeftWidth: '4px', borderLeftColor: grupo.contratoColor }}
                >
                  <div className="bg-gray-50 px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: grupo.contratoColor }}
                        />
                        <span className="font-medium text-gray-900">{grupo.contratoNombre}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Semana {formatDateLong(grupo.semanaLunes)} – {formatDateLong(grupo.semanaFin)}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-orange-600 font-medium">{horasExtrasGrupo.toFixed(2)}h extras</span>
                        {importeGrupo !== 0 && (
                          <span className="text-green-600 font-medium">${importeGrupo.toFixed(2)}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAnularLiquidacionClick(grupo)}
                        disabled={anulandoLiquidacion}
                        className="btn-secondary flex items-center gap-1 text-xs text-red-700 border-red-200 hover:bg-red-50 w-full sm:w-auto justify-center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Anular
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {grupo.registros.map((liq) => (
                      <div key={liq.id} className="px-3 sm:px-4 py-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${getTipoLiquidacionStyle(liq.tipo)}`}>
                              {liq.tipo}
                            </span>
                            <span className="text-xs text-gray-500">
                              Registrada: {formatFechaRegistroDisplay(liq.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-gray-600">
                              {parseFloat(liq.horas_trabajadas).toFixed(2)}h trab. / {parseFloat(liq.horas_esperadas).toFixed(2)}h esp.
                            </span>
                            <span className="font-medium text-orange-600">
                              {parseFloat(liq.horas_extras).toFixed(2)}h extras
                            </span>
                            {parseFloat(liq.importe) !== 0 && (
                              <span className={`font-medium ${parseFloat(liq.importe) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${parseFloat(liq.importe).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        {liq.notas && (
                          <p className="text-xs text-gray-500 mt-2">{liq.notas}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Informe detallado */}
      {tipoInforme === 'detallado' && horas.length > 0 && (
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Informe Detallado - {formatDate(fechaInicio)} a {formatDate(fechaFin)}
          </h3>

          {/* Vista móvil - Tarjetas por proyecto */}
          <div className="block sm:hidden space-y-4">
            {Object.entries(subtotalesPorProyecto).map(([proyectoId, subtotal]) => (
              <div key={proyectoId} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: subtotal.color }}
                    ></div>
                    <h4 className="text-sm font-semibold text-gray-900">{subtotal.nombre}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      <Euro className="h-3 w-3 inline mr-1" />
                      {subtotal.totalGanancias.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {subtotal.totalHoras.toFixed(1)}h
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {subtotal.registros.map((hora) => (
                    <div key={hora.id} className="flex justify-between items-center py-2 border-t border-gray-100">
                      <div className="text-xs text-gray-600">
                        <div>{formatDate(hora.fecha)}</div>
                        <div>{formatTime(hora.hora_inicio)} - {formatTime(hora.hora_fin)}</div>
                        {hora.descripcion && (
                          <div className="text-gray-500">{hora.descripcion}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-gray-900">
                          {formatDuration(hora.duracion_minutos)}
                        </div>
                        <div className="text-xs text-green-600">
                          <Euro className="h-2 w-2 inline mr-1" />
                          {parseFloat(hora.total || 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Vista desktop - Tabla */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duración
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(subtotalesPorProyecto).map(([proyectoId, subtotal]) => (
                  <React.Fragment key={proyectoId}>
                    {subtotal.registros.map((hora) => (
                      <tr key={hora.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(hora.fecha)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: hora.proyecto_color }}
                            ></div>
                            <span className="text-sm text-gray-900">{hora.proyecto_nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(hora.hora_inicio)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(hora.hora_fin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(hora.duracion_minutos)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {hora.descripcion || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <Euro className="h-4 w-4 text-green-600 mr-1" />
                            {parseFloat(hora.total || 0).toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Subtotal por proyecto */}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan="6" className="px-6 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: subtotal.color }}
                          ></div>
                          Subtotal {subtotal.nombre}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-900">
                        <div className="flex items-center">
                          <Euro className="h-4 w-4 text-green-600 mr-1" />
                          {subtotal.totalGanancias.toFixed(2)}
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                {/* Total general */}
                <tr className="bg-primary-50 font-bold">
                  <td colSpan="6" className="px-6 py-3 text-sm text-gray-900">
                    TOTAL GENERAL
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">
                    <div className="flex items-center">
                      <Euro className="h-4 w-4 text-green-600 mr-1" />
                      {totalGeneralGanancias.toFixed(2)}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Informe por proyecto */}
      {tipoInforme === 'por_proyecto' && horas.length > 0 && (
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Resumen por Proyecto - {formatDate(fechaInicio)} a {formatDate(fechaFin)}
          </h3>

          <div className="space-y-4">
            {Object.entries(subtotalesPorProyecto).map(([proyectoId, subtotal]) => (
              <div key={proyectoId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: subtotal.color }}
                    ></div>
                    <h4 className="text-base font-semibold text-gray-900">{subtotal.nombre}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      <Euro className="h-4 w-4 inline mr-1" />
                      {subtotal.totalGanancias.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {subtotal.totalHoras.toFixed(1)} horas • {subtotal.registros.length} registros
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total general */}
          <div className="mt-6 bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-gray-900">TOTAL GENERAL</h4>
              <div className="text-right">
                <div className="text-xl font-bold text-green-600">
                  <Euro className="h-5 w-5 inline mr-1" />
                  {totalGeneralGanancias.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  {totalGeneralHoras.toFixed(1)} horas • {horas.length} registros
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informe mensual */}
      {tipoInforme === 'mensual' && horas.length > 0 && (
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Resumen Mensual - {formatDate(fechaInicio)} a {formatDate(fechaFin)}
          </h3>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary-600">
                  {totalGeneralHoras.toFixed(1)}h
                </div>
                <div className="text-sm text-gray-600">Total Horas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  <Euro className="h-6 w-6 inline mr-1" />
                  {totalGeneralGanancias.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Total Ganancias</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {horas.length}
                </div>
                <div className="text-sm text-gray-600">Registros</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informe de Contratos - Resumen por contrato */}
      {tipoDatos === 'contratos' && horariosContrato.length > 0 && (
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Informe de Contratos - {formatDate(fechaInicio)} a {formatDate(fechaFin)}
          </h3>

          <div className="space-y-4">
            {Object.entries(subtotalesPorContrato).map(([contratoId, subtotal]) => (
              <div key={contratoId} className="bg-white border border-purple-200 rounded-lg p-4 shadow-sm">
                {/* Nombre del contrato */}
                <h4 className="text-base font-semibold text-gray-900 mb-3">{subtotal.nombre}</h4>
                
                {/* Resumen de horas */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Total Horas</p>
                    <p className="text-lg font-bold text-gray-900">{subtotal.totalHoras.toFixed(2)}h</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">Horas Normales</p>
                    <p className="text-lg font-bold text-green-600">{subtotal.horasNormales.toFixed(2)}h</p>
                    <p className="text-xs text-gray-500">
                      de {subtotal.horasEsperadas.toFixed(2)}h esperadas ({subtotal.horasSemanales}h sem. {formatDiasLaborables(subtotal.diasLaborables)})
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                    <p className="text-xs text-gray-600 mb-1">Horas Extras</p>
                    <p className="text-lg font-bold text-orange-600">{subtotal.horasExtras.toFixed(2)}h</p>
                    <p className="text-xs text-gray-500">${subtotal.valorHoraExtra}/h</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                    <p className="text-xs text-gray-600 mb-1">Total a Cobrar</p>
                    <p className="text-lg font-bold text-purple-600">${subtotal.totalExtras.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">horas extras</p>
                  </div>
                </div>

                {/* Lista de horarios */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Horarios Registrados ({subtotal.registros.length})</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {subtotal.registros.map((horario) => (
                      <div key={horario.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded border border-gray-200 text-sm">
                        <div>
                          <span className="font-medium">{formatDate(horario.fecha)}</span>
                          <span className="mx-2 text-gray-400">•</span>
                          <span>{formatTime(horario.hora_entrada)} - {formatTime(horario.hora_salida)}</span>
                        </div>
                        <div className="text-primary-600 font-medium">
                          {formatDuration(horario.duracion_minutos)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Total general de horas extras */}
            <div className="bg-purple-50 border border-purple-300 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-900">TOTAL HORAS EXTRAS A COBRAR</h4>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">
                    <Euro className="h-6 w-6 inline mr-1" />
                    {totalGeneralGanancias.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {totalGeneralHoras.toFixed(1)} horas totales • {totalRegistros} registros
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sin datos */}
      {((tipoDatos === 'proyectos' && horas.length === 0) || (tipoDatos === 'contratos' && horariosContrato.length === 0) || (tipoDatos === 'liquidaciones' && liquidaciones.length === 0)) && !loading && fechaInicio && fechaFin && (
        <div className="card text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos para mostrar</h3>
          <p className="text-gray-600">
            {tipoDatos === 'liquidaciones'
              ? 'No hay liquidaciones registradas en el rango de fechas seleccionado.'
              : `Selecciona un rango de fechas para ver tus ${tipoDatos === 'proyectos' ? 'horas trabajadas' : 'horarios de contrato'}.`}
          </p>
        </div>
      )}

      {/* Exportar informe a PDF (al final) */}
      {tieneDatosParaInforme && !loading && (
        <div className="card border-2 border-primary-100 bg-primary-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Exportar informe</h3>
              <p className="text-sm text-gray-600 mt-1">
                Descarga el informe actual ({formatDateLong(fechaInicio)} – {formatDateLong(fechaFin)}) en PDF.
              </p>
            </div>
            <button
              onClick={handleExportarPDFClick}
              className="btn-primary flex items-center justify-center space-x-2 text-sm px-4 py-2 w-full sm:w-auto"
            >
              <FileDown className="h-4 w-4" />
              <span>Exportar a PDF</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showAnularLiquidacionModal}
        onClose={() => {
          setShowAnularLiquidacionModal(false);
          setGrupoLiquidacionToAnular(null);
        }}
        onConfirm={handleAnularLiquidacionConfirm}
        title="Anular liquidación de la semana"
        message={`¿Anular la liquidación de la semana del ${grupoLiquidacionToAnular ? formatDate(grupoLiquidacionToAnular.semanaLunes) : ''}? Podrás volver a registrarla después.`}
        confirmText="Anular liquidación"
        cancelText="Cancelar"
        type="danger"
      />

      <ConfirmModal
        isOpen={exportModal.isOpen}
        onClose={() => setExportModal({ isOpen: false, type: null })}
        onConfirm={handleExportConfirm}
        title={exportModalTitle}
        message={exportModalMessage}
        confirmText={exportConfirmText}
        cancelText="Cancelar"
        type="info"
      >
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Periodo</span>
            <span className="font-medium text-gray-900">
              {formatDateLong(fechaInicio)} – {formatDateLong(fechaFin)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tipo de datos</span>
            <span className="font-medium text-gray-900 capitalize">{tipoDatos}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Registros</span>
            <span className="font-medium text-gray-900">{totalRegistros}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total horas</span>
            <span className="font-medium text-blue-600">{totalGeneralHoras.toFixed(1)}h</span>
          </div>
        </div>
      </ConfirmModal>

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

export default Informes;
