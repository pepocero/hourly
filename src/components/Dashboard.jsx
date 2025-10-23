import React, { useState, useEffect, useRef } from 'react';
import { Plus, Clock, Euro, Calendar, Download, Filter, FileText } from 'lucide-react';
import apiService from '../services/api';
import HorasList from './HorasList';
import HorasForm from './HorasForm';
import ProyectosList from './ProyectosList';
import ProyectoForm from './ProyectoForm';
import ProyectoDetails from './ProyectoDetails';
import Informes from './Informes';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('horas');
  const [showHorasForm, setShowHorasForm] = useState(false);
  const [showProyectoForm, setShowProyectoForm] = useState(false);
  const [editingHora, setEditingHora] = useState(null);
  const [editingProyecto, setEditingProyecto] = useState(null);
  const [viewingProyecto, setViewingProyecto] = useState(null);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  // Referencias para acceder a las funciones de los componentes
  const proyectosListRef = useRef(null);
  const horasListRef = useRef(null);

  // Establecer fechas por defecto (último mes)
  useEffect(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    setFechaFin(today.toISOString().split('T')[0]);
    setFechaInicio(lastMonth.toISOString().split('T')[0]);
  }, []);

  // Cargar resumen cuando cambien las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      loadResumen();
    }
  }, [fechaInicio, fechaFin]);

  const loadResumen = async () => {
    try {
      setLoading(true);
      const response = await apiService.getResumenHoras(fechaInicio, fechaFin);
      if (response.success) {
        setResumen(response.data);
      }
    } catch (error) {
      console.error('Error cargando resumen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = async () => {
    try {
      await apiService.exportarCSV(fechaInicio, fechaFin);
    } catch (error) {
      console.error('Error exportando CSV:', error);
      alert('Error al exportar el archivo CSV');
    }
  };

  const handleHoraSaved = () => {
    setShowHorasForm(false);
    setEditingHora(null);
    loadResumen();
    // Recargar la lista de horas
    if (horasListRef.current) {
      horasListRef.current.loadHoras();
    }
  };

  const handleProyectoSaved = () => {
    setShowProyectoForm(false);
    setEditingProyecto(null);
    // Recargar la lista de proyectos
    if (proyectosListRef.current) {
      proyectosListRef.current.loadProyectos();
    }
  };

  const handleEditHora = (hora) => {
    setEditingHora(hora);
    setShowHorasForm(true);
  };

  const handleEditProyecto = (proyecto) => {
    setEditingProyecto(proyecto);
    setShowProyectoForm(true);
  };

  const handleViewProyecto = (proyecto) => {
    setViewingProyecto(proyecto);
  };

  const tabs = [
    { id: 'horas', label: 'Horas Trabajadas', icon: Clock },
    { id: 'proyectos', label: 'Proyectos', icon: Calendar },
    { id: 'informes', label: 'Informes', icon: FileText },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Gestiona tus horas de trabajo y proyectos</p>
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
        </div>
      </div>

      {/* Resumen de horas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Horas</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {loading ? '...' : (resumen?.totalHoras || 0).toFixed(1)}
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
                {loading ? '...' : (resumen?.totalGanancias || 0).toFixed(2)}
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
                {loading ? '...' : resumen?.totalRegistros || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-orange-600" />
            </div>
            <div className="ml-2 sm:ml-3 lg:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Promedio/Día</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                {loading ? '...' : (resumen?.promedioMinutos || 0).toFixed(0)}m
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros de fecha */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtros:</span>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
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
            <div className="flex-1">
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
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 sm:space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 sm:space-x-2 py-2 px-1 border-b-2 font-medium text-xs sm:text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.id === 'horas' ? 'Horas' : tab.id === 'proyectos' ? 'Proyectos' : 'Informes'}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-4 sm:space-y-6">
        {activeTab === 'horas' && (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Horas Trabajadas</h2>
              <button
                onClick={() => {
                  setEditingHora(null);
                  setShowHorasForm(true);
                }}
                className="btn-primary flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Nueva Hora</span>
              </button>
            </div>
            <HorasList 
              ref={horasListRef}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
              onEdit={handleEditHora}
              onDataChange={loadResumen}
            />
          </>
        )}

        {activeTab === 'proyectos' && (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Proyectos</h2>
              <button
                onClick={() => {
                  setEditingProyecto(null);
                  setShowProyectoForm(true);
                }}
                className="btn-primary flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Nuevo Proyecto</span>
              </button>
            </div>
            <ProyectosList 
              ref={proyectosListRef}
              onEdit={handleEditProyecto}
              onViewDetails={handleViewProyecto}
              onDataChange={handleProyectoSaved}
            />
          </>
        )}

        {activeTab === 'informes' && (
          <Informes />
        )}
      </div>

      {/* Modals */}
      {showHorasForm && (
        <HorasForm
          hora={editingHora}
          onClose={() => {
            setShowHorasForm(false);
            setEditingHora(null);
          }}
          onSave={handleHoraSaved}
        />
      )}

      {showProyectoForm && (
        <ProyectoForm
          proyecto={editingProyecto}
          onClose={() => {
            setShowProyectoForm(false);
            setEditingProyecto(null);
          }}
          onSave={handleProyectoSaved}
        />
      )}

      {viewingProyecto && (
        <ProyectoDetails
          proyecto={viewingProyecto}
          onClose={() => setViewingProyecto(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;
