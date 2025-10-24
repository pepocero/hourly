import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Download, Euro, Clock, BarChart3, FileDown } from 'lucide-react';
import apiService from '../services/api';
import pdfService from '../services/pdfService';

function Informes() {
  const [tipoInforme, setTipoInforme] = useState('detallado');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [proyectoFiltro, setProyectoFiltro] = useState('');
  const [proyectos, setProyectos] = useState([]);
  const [horas, setHoras] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  }, []);

  useEffect(() => {
    if (fechaInicio && fechaFin) {
      loadDatos();
    }
  }, [fechaInicio, fechaFin, proyectoFiltro]);

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

  const loadDatos = async () => {
    try {
      setLoading(true);
      setError('');

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

    } catch (error) {
      setError('Error al cargar los datos del informe');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarInforme = () => {
    loadDatos();
  };

  const handleExportarCSV = async () => {
    try {
      await apiService.exportarCSV(fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error exportando CSV:', error);
      alert('Error al exportar el archivo CSV');
    }
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

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

  const subtotalesPorProyecto = calcularSubtotalesPorProyecto();

  // Calcular totales generales
  const totalGeneralHoras = horas.reduce((sum, hora) => sum + (parseFloat(hora.duracion_minutos || 0) / 60), 0);
  const totalGeneralMinutos = horas.reduce((sum, hora) => sum + parseInt(hora.duracion_minutos || 0), 0);
  const totalGeneralGanancias = horas.reduce((sum, hora) => sum + parseFloat(hora.total || 0), 0);

  const tiposInforme = [
    { id: 'detallado', label: 'Informe Detallado', icon: FileText, description: 'Lista completa de horas trabajadas con subtotales por proyecto' },
    { id: 'por_proyecto', label: 'Por Proyecto', icon: BarChart3, description: 'Resumen agrupado por proyecto' },
    { id: 'mensual', label: 'Mensual', icon: Calendar, description: 'Resumen mensual de horas trabajadas' }
  ];

  const handleExportarPDF = () => {
    if (horas.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const title = 'Informe de Horas Trabajadas';
    const subtitle = `Tipo: ${tiposInforme.find(t => t.id === tipoInforme)?.label || 'Detallado'}`;
    
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
          <button
            onClick={handleExportarCSV}
            className="btn-secondary flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <Download className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <button
            onClick={handleExportarPDF}
            className="btn-primary flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <FileDown className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="space-y-4">
          {/* Tipo de informe */}
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

          {/* Filtros de fecha y proyecto */}
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
            </div>
          </div>

          {/* Botón generar */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerarInforme}
              disabled={loading}
              className="btn-primary flex items-center space-x-2 text-sm px-4 py-2"
            >
              <FileText className="h-4 w-4" />
              <span>{loading ? 'Generando...' : 'Generar Informe'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Resumen general */}
      {resumen && (
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
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Ganancias</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {totalGeneralGanancias.toFixed(2)}
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
                  {horas.length}
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
                <p className="text-xs sm:text-sm font-medium text-gray-600">Proyectos</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {Object.keys(subtotalesPorProyecto).length}
                </p>
              </div>
            </div>
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

      {/* Sin datos */}
      {horas.length === 0 && !loading && (
        <div className="card text-center py-8">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos para mostrar</h3>
          <p className="text-gray-600">
            Selecciona un rango de fechas y genera un informe para ver tus horas trabajadas.
          </p>
        </div>
      )}
    </div>
  );
}

export default Informes;
