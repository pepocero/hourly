import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Edit, Trash2, Clock, Euro, Eye, ChevronUp, ChevronDown, CheckCircle2, CircleDollarSign } from 'lucide-react';
import apiService from '../services/api';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import HoraDetailsModal from './HoraDetailsModal';
import { formatFechaEU } from '../utils/formatFecha';

function isHoraPagada(hora) {
  return hora.pagado === 1 || hora.pagado === true || hora.pagado === '1';
}

function getFilaPagadoClass(pagada) {
  return pagada
    ? 'bg-green-50 border-l-4 border-l-green-500 hover:bg-green-100/80'
    : 'hover:bg-gray-50';
}

const HorasList = forwardRef(({ fechaInicio, fechaFin, onEdit, onDataChange }, ref) => {
  const [horas, setHoras] = useState([]);
  const [horasSinFiltrar, setHorasSinFiltrar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [horaToDelete, setHoraToDelete] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [horaToView, setHoraToView] = useState(null);
  const [proyectos, setProyectos] = useState([]);
  const [proyectoFiltro, setProyectoFiltro] = useState('');
  const [estadoPagoFiltro, setEstadoPagoFiltro] = useState('todos');
  const [pagadoUpdatingId, setPagadoUpdatingId] = useState(null);
  const [sortField, setSortField] = useState('fecha');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    loadProyectos();
  }, []);

  useEffect(() => {
    loadHoras();
  }, [fechaInicio, fechaFin, proyectoFiltro, estadoPagoFiltro, sortField, sortDirection]);

  useImperativeHandle(ref, () => ({
    loadHoras
  }));

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

  const loadHoras = async () => {
    try {
      setLoading(true);
      const response = await apiService.getHoras(fechaInicio, fechaFin);
      if (response.success) {
        setHorasSinFiltrar(response.data);
        let horasFiltradas = response.data;

        if (proyectoFiltro) {
          horasFiltradas = horasFiltradas.filter(hora =>
            hora.proyecto_id === parseInt(proyectoFiltro)
          );
        }

        if (estadoPagoFiltro === 'pagados') {
          horasFiltradas = horasFiltradas.filter(hora => isHoraPagada(hora));
        } else if (estadoPagoFiltro === 'pendientes') {
          horasFiltradas = horasFiltradas.filter(hora => !isHoraPagada(hora));
        }

        horasFiltradas = sortHoras(horasFiltradas, sortField, sortDirection);

        setHoras(horasFiltradas);
      }
    } catch (error) {
      setError('Error al cargar las horas trabajadas');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const contadoresPago = horasSinFiltrar.reduce(
    (acc, hora) => {
      if (isHoraPagada(hora)) {
        acc.pagados += 1;
      } else {
        acc.pendientes += 1;
      }
      return acc;
    },
    { pagados: 0, pendientes: 0 }
  );

  const handleTogglePagado = async (hora) => {
    const nuevoEstado = !isHoraPagada(hora);
    setPagadoUpdatingId(hora.id);

    try {
      const response = await apiService.setHoraPagado(hora.id, nuevoEstado);
      if (response.success) {
        setHorasSinFiltrar((prev) =>
          prev.map((h) => (h.id === hora.id ? { ...h, pagado: nuevoEstado ? 1 : 0 } : h))
        );
        setHoras((prev) => {
          const actualizada = prev.map((h) =>
            h.id === hora.id ? { ...h, pagado: nuevoEstado ? 1 : 0 } : h
          );
          if (estadoPagoFiltro === 'pagados' && !nuevoEstado) {
            return actualizada.filter((h) => h.id !== hora.id);
          }
          if (estadoPagoFiltro === 'pendientes' && nuevoEstado) {
            return actualizada.filter((h) => h.id !== hora.id);
          }
          return actualizada;
        });
        if (onDataChange) onDataChange();
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error al actualizar',
          message: response.error || 'No se pudo actualizar el estado de pago.',
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error al actualizar',
        message: 'No se pudo actualizar el estado de pago. Inténtalo de nuevo.',
        type: 'error'
      });
      console.error('Error:', error);
    } finally {
      setPagadoUpdatingId(null);
    }
  };

  const sortHoras = (horasData, field, direction) => {
    return [...horasData].sort((a, b) => {
      let aValue, bValue;
      
      switch (field) {
        case 'fecha':
          aValue = new Date(a.fecha);
          bValue = new Date(b.fecha);
          break;
        case 'proyecto_nombre':
          aValue = a.proyecto_nombre?.toLowerCase() || '';
          bValue = b.proyecto_nombre?.toLowerCase() || '';
          break;
        case 'duracion_minutos':
          aValue = a.duracion_minutos || 0;
          bValue = b.duracion_minutos || 0;
          break;
        case 'total':
          aValue = parseFloat(a.total) || 0;
          bValue = parseFloat(b.total) || 0;
          break;
        case 'descripcion':
          aValue = a.descripcion?.toLowerCase() || '';
          bValue = b.descripcion?.toLowerCase() || '';
          break;
        default:
          return 0;
      }
      
      if (direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ChevronUp className="h-4 w-4 text-gray-300" />;
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-primary-600" />
      : <ChevronDown className="h-4 w-4 text-primary-600" />;
  };

  const handleDeleteClick = (hora) => {
    setHoraToDelete(hora);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!horaToDelete) return;

    try {
      const response = await apiService.deleteHora(horaToDelete.id);
      if (response.success) {
        loadHoras();
        if (onDataChange) onDataChange();
        setShowDeleteModal(false);
        setHoraToDelete(null);
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error al eliminar',
          message: `No se pudo eliminar la hora trabajada: ${response.error}`,
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error al eliminar',
        message: 'No se pudo eliminar la hora trabajada. Inténtalo de nuevo.',
        type: 'error'
      });
      console.error('Error:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setHoraToDelete(null);
  };

  const handleViewClick = (hora) => {
    setHoraToView(hora);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setHoraToView(null);
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

  const formatDate = formatFechaEU;

  if (loading) {
    return (
      <div className="card">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadHoras}
            className="btn-primary mt-4"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (horasSinFiltrar.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay horas registradas en este período</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Filtros */}
      <div className="mb-3 sm:mb-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="proyecto-filtro" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Filtrar por proyecto
            </label>
            <select
              id="proyecto-filtro"
              value={proyectoFiltro}
              onChange={(e) => setProyectoFiltro(e.target.value)}
              className="input-field w-full text-sm sm:text-base"
            >
              <option value="">Todos los proyectos</option>
              {proyectos.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="estado-pago-filtro" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Estado de pago
            </label>
            <select
              id="estado-pago-filtro"
              value={estadoPagoFiltro}
              onChange={(e) => setEstadoPagoFiltro(e.target.value)}
              className="input-field w-full text-sm sm:text-base"
            >
              <option value="todos">Todos ({horasSinFiltrar.length})</option>
              <option value="pendientes">Pendientes ({contadoresPago.pendientes})</option>
              <option value="pagados">Pagados ({contadoresPago.pagados})</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-400"></span>
            Pagado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-white border border-gray-200"></span>
            Pendiente de cobro
          </span>
        </div>
      </div>

      {horas.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
          <CircleDollarSign className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No hay registros con el filtro seleccionado</p>
        </div>
      ) : (
        <>
      {/* Vista móvil - Tarjetas */}
      <div className="block sm:hidden space-y-3">
        {horas.map((hora) => {
          const pagada = isHoraPagada(hora);
          return (
          <div
            key={hora.id}
            className={`border rounded-lg p-3 shadow-sm ${pagada ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: hora.proyecto_color }}
                ></div>
                <span className="text-sm font-medium text-gray-900">{hora.proyecto_nombre}</span>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => handleViewClick(hora)}
                  className="text-blue-600 hover:text-blue-900 p-1"
                  title="Ver detalles"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onEdit(hora)}
                  className="text-primary-600 hover:text-primary-900 p-1"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(hora)}
                  className="text-red-600 hover:text-red-900 p-1"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
              <div>
                <span className="font-medium">Fecha:</span> {formatDate(hora.fecha)}
              </div>
              <div>
                <span className="font-medium">Duración:</span> {formatDuration(hora.duracion_minutos)}
              </div>
              <div className="col-span-2">
                <span className="font-medium">Observaciones:</span> {hora.descripcion || 'Sin observaciones'}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pagada}
                  disabled={pagadoUpdatingId === hora.id}
                  onChange={() => handleTogglePagado(hora)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className={pagada ? 'text-green-700 font-medium' : ''}>
                  {pagada ? 'Pagado' : 'Pendiente'}
                </span>
              </label>
              <div className="flex items-center text-sm font-semibold text-green-600">
                <Euro className="h-3 w-3 mr-1" />
                {hora.total ? parseFloat(hora.total).toFixed(2) : '0.00'}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Vista desktop - Tabla */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('fecha')}
                  className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                >
                  <span>Fecha</span>
                  {getSortIcon('fecha')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('proyecto_nombre')}
                  className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                >
                  <span>Proyecto</span>
                  {getSortIcon('proyecto_nombre')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('descripcion')}
                  className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                >
                  <span>Observaciones</span>
                  {getSortIcon('descripcion')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('duracion_minutos')}
                  className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                >
                  <span>Duración</span>
                  {getSortIcon('duracion_minutos')}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('total')}
                  className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                >
                  <span>Total</span>
                  {getSortIcon('total')}
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {horas.map((hora) => {
              const pagada = isHoraPagada(hora);
              return (
              <tr key={hora.id} className={getFilaPagadoClass(pagada)}>
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
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate" title={hora.descripcion || 'Sin observaciones'}>
                    {hora.descripcion || 'Sin observaciones'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDuration(hora.duracion_minutos)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <Euro className="h-4 w-4 text-green-600 mr-1" />
                    {hora.total ? parseFloat(hora.total).toFixed(2) : '0.00'}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <label
                    className="inline-flex items-center justify-center cursor-pointer"
                    title={pagada ? 'Marcar como pendiente de cobro' : 'Marcar como pagado'}
                  >
                    <input
                      type="checkbox"
                      checked={pagada}
                      disabled={pagadoUpdatingId === hora.id}
                      onChange={() => handleTogglePagado(hora)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 h-4 w-4"
                    />
                  </label>
                  {pagada && (
                    <CheckCircle2 className="inline-block h-4 w-4 text-green-600 ml-1 align-middle" aria-hidden="true" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewClick(hora)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(hora)}
                      className="text-primary-600 hover:text-primary-900"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(hora)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
        </>
      )}
      
      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Hora Trabajada"
        message={`¿Estás seguro de que quieres eliminar esta hora trabajada del ${horaToDelete ? formatDate(horaToDelete.fecha) : ''}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Modal de detalles */}
      <HoraDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseDetailsModal}
        hora={horaToView}
      />

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '', type: 'info' })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
});

HorasList.displayName = 'HorasList';

export default HorasList;
