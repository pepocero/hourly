import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Euro, Filter, ArrowLeft } from 'lucide-react';
import apiService from '../services/api';

function ProyectoDetails({ proyecto, onClose }) {
  const [horas, setHoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [resumen, setResumen] = useState(null);

  // Establecer fechas por defecto (último mes)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    setFechaFin(today.toISOString().split('T')[0]);
    setFechaInicio(lastMonth.toISOString().split('T')[0]);
  }, []);

  // Cargar horas cuando cambien las fechas o el proyecto
  useEffect(() => {
    if (proyecto && fechaInicio && fechaFin) {
      loadHoras();
    }
  }, [proyecto, fechaInicio, fechaFin]);

  const loadHoras = async () => {
    try {
      setLoading(true);
      const response = await apiService.getHoras(fechaInicio, fechaFin);
      if (response.success) {
        // Filtrar solo las horas de este proyecto
        const horasProyecto = response.data.filter(hora => hora.proyecto_id === proyecto.id);
        setHoras(horasProyecto);
        
        // Calcular resumen
        const totalHoras = horasProyecto.reduce((sum, hora) => sum + (hora.duracion_minutos / 60), 0);
        const totalGanancias = horasProyecto.reduce((sum, hora) => sum + (hora.total || 0), 0);
        const totalRegistros = horasProyecto.length;
        
        setResumen({
          totalHoras,
          totalGanancias,
          totalRegistros
        });
      }
    } catch (error) {
      setError('Error al cargar las horas del proyecto');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatHours = (minutes) => {
    const hours = minutes / 60;
    return hours.toFixed(2);
  };

  const formatTime = (time) => {
    if (!time) return '-';
    return time.substring(0, 5); // HH:MM
  };

  if (!proyecto) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: proyecto.color }}
            ></div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {proyecto.nombre}
              </h2>
              <p className="text-sm text-gray-500">
                {proyecto.tarifa_hora}/hora
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Filtros de fecha */}
          <div className="card">
            <div className="flex items-center space-x-4">
              <Filter className="h-5 w-5 text-gray-500" />
              <div className="flex space-x-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resumen */}
          {resumen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Horas</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {resumen.totalHoras.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Euro className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Ganancias</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {resumen.totalGanancias.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Registros</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {resumen.totalRegistros}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Lista de horas */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Registros de Horas
            </h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={loadHoras}
                  className="btn-primary mt-4"
                >
                  Reintentar
                </button>
              </div>
            ) : horas.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay registros de horas en este rango de fechas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Inicio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fin
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Horas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {horas.map((hora) => (
                      <tr key={hora.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(hora.fecha)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(hora.hora_inicio)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(hora.hora_fin)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatHours(hora.duracion_minutos)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {hora.total?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {hora.descripcion || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProyectoDetails;
