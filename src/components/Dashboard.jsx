import React, { useState, useEffect, useRef } from 'react';
import { Plus, Clock, Calendar, FileText, Briefcase, Filter } from 'lucide-react';
import apiService from '../services/api';
import HorasList from './HorasList';
import HorasForm from './HorasForm';
import ProyectosList from './ProyectosList';
import ProyectoForm from './ProyectoForm';
import ProyectoDetails from './ProyectoDetails';
import Informes from './Informes';
import Contratos from './Contratos';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import { formatFechaEU, formatEuro } from '../utils/formatFecha';

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [informesNav, setInformesNav] = useState(null);
  
  // Referencias para acceder a las funciones de los componentes
  const proyectosListRef = useRef(null);
  const horasListRef = useRef(null);

  // Establecer fechas por defecto (mes actual)
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setFechaInicio(firstDayOfMonth.toISOString().split('T')[0]);
    setFechaFin(lastDayOfMonth.toISOString().split('T')[0]);
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

  const formatDate = formatFechaEU;

  const handleExportarCSVClick = () => {
    if (!fechaInicio || !fechaFin) {
      setAlertModal({
        isOpen: true,
        title: 'Fechas requeridas',
        message: 'Selecciona un rango de fechas en el filtro antes de exportar.',
        type: 'warning'
      });
      return;
    }
    setShowExportModal(true);
  };

  const handleExportarCSVConfirm = async () => {
    setShowExportModal(false);
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
    {
      id: 'horas',
      label: 'Horas Trabajadas',
      shortLabel: 'Horas',
      icon: Clock,
      activeClass: 'bg-blue-600 text-white shadow-lg shadow-blue-200/80 ring-2 ring-blue-400/30',
      inactiveClass: 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 hover:border-blue-300',
      iconClass: 'text-blue-600',
      accentClass: 'text-blue-700',
      btnClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      panelClass: 'border-blue-300 bg-blue-100/70 shadow-sm shadow-blue-100',
      filterClass: 'border-blue-200 bg-blue-50/90'
    },
    {
      id: 'proyectos',
      label: 'Proyectos',
      shortLabel: 'Proyectos',
      icon: Calendar,
      activeClass: 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/80 ring-2 ring-emerald-400/30',
      inactiveClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300',
      iconClass: 'text-emerald-600',
      accentClass: 'text-emerald-700',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
      panelClass: 'border-emerald-300 bg-emerald-100/70 shadow-sm shadow-emerald-100',
      filterClass: 'border-emerald-200 bg-emerald-50/90'
    },
    {
      id: 'contratos',
      label: 'Contratos',
      shortLabel: 'Contratos',
      icon: Briefcase,
      activeClass: 'bg-orange-600 text-white shadow-lg shadow-orange-200/80 ring-2 ring-orange-400/30',
      inactiveClass: 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 hover:border-orange-300',
      iconClass: 'text-orange-600',
      accentClass: 'text-orange-700',
      btnClass: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500',
      panelClass: 'border-orange-300 bg-orange-100/70 shadow-sm shadow-orange-100',
      filterClass: 'border-orange-200 bg-orange-50/90'
    },
    {
      id: 'informes',
      label: 'Informes',
      shortLabel: 'Informes',
      icon: FileText,
      activeClass: 'bg-amber-500 text-white shadow-lg shadow-amber-200/80 ring-2 ring-amber-400/30',
      inactiveClass: 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 hover:border-amber-300',
      iconClass: 'text-amber-600',
      accentClass: 'text-amber-800',
      btnClass: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500',
      panelClass: 'border-amber-300 bg-amber-100/70 shadow-sm shadow-amber-100',
      filterClass: 'border-amber-200 bg-amber-50/90'
    }
  ];

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Navegación principal */}
      <nav className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center sm:justify-start gap-2 sm:gap-3 rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 font-semibold text-sm transition-all duration-200 ${
                isActive ? tab.activeClass : tab.inactiveClass
              }`}
            >
              <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : tab.iconClass}`} />
              <span className="hidden sm:inline truncate">{tab.label}</span>
              <span className="sm:hidden truncate">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div
        className={`space-y-4 sm:space-y-6 rounded-xl border-2 p-3 sm:p-4 lg:p-5 transition-colors ${activeTabConfig.panelClass}`}
      >
        {activeTab === 'horas' && (
          <>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <h2 className={`text-base sm:text-lg font-semibold ${activeTabConfig.accentClass}`}>
                Horas Trabajadas
              </h2>
              <button
                onClick={() => {
                  setEditingHora(null);
                  setShowHorasForm(true);
                }}
                className={`${activeTabConfig.btnClass} text-white flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Nueva Hora</span>
              </button>
            </div>

            <div className={`rounded-lg border p-3 sm:p-4 ${activeTabConfig.filterClass}`}>
              <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:pb-2">
                  <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Periodo</span>
                </div>
                <div className="flex flex-1 flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-medium text-blue-900/80 mb-1">
                      Fecha inicio
                    </label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="input-field w-full bg-white"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs sm:text-sm font-medium text-blue-900/80 mb-1">
                      Fecha fin
                    </label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="input-field w-full bg-white"
                    />
                  </div>
                </div>
                {fechaInicio && fechaFin && (
                  <p className="text-xs sm:text-sm text-blue-800/90 sm:pb-2 sm:max-w-[12rem] sm:text-right">
                    {formatDate(fechaInicio)} – {formatDate(fechaFin)}
                  </p>
                )}
              </div>
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
              <h2 className={`text-base sm:text-lg font-semibold ${activeTabConfig.accentClass}`}>
                Proyectos
              </h2>
              <button
                onClick={() => {
                  setEditingProyecto(null);
                  setShowProyectoForm(true);
                }}
                className={`${activeTabConfig.btnClass} text-white flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
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

        {activeTab === 'contratos' && (
          <Contratos
            onNavigateToInformes={(nav) => {
              setInformesNav(nav);
              setActiveTab('informes');
            }}
          />
        )}

        {activeTab === 'informes' && (
          <Informes
            navState={informesNav}
            onNavConsumed={() => setInformesNav(null)}
          />
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

      <ConfirmModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onConfirm={handleExportarCSVConfirm}
        title="Exportar horas a CSV"
        message="Se descargará un archivo con las horas trabajadas del periodo seleccionado."
        confirmText="Descargar CSV"
        cancelText="Cancelar"
        type="info"
      >
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Periodo</span>
            <span className="font-medium text-gray-900">
              {formatDate(fechaInicio)} – {formatDate(fechaFin)}
            </span>
          </div>
          {resumen && (
            <div className="flex justify-between">
              <span className="text-gray-600">Total horas</span>
              <span className="font-medium text-blue-600">
                {(resumen.totalHoras || 0).toFixed(1)}h
              </span>
            </div>
          )}
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

export default Dashboard;
