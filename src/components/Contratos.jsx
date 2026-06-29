import React, { useState, useEffect } from 'react';
import { Plus, Briefcase } from 'lucide-react';
import apiService from '../services/api';
import ContratoForm from './ContratoForm';
import ContratosList from './ContratosList';
import HorarioContratoForm from './HorarioContratoForm';
import HorariosContratoList from './HorariosContratoList';
import LiquidacionesContratoList from './LiquidacionesContratoList';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';

function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [contratoSeleccionado, setContratoSeleccionado] = useState(null);
  const [contratoFiltro, setContratoFiltro] = useState('all'); // 'all' o id de contrato
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState('');
  const [fechaFinFiltro, setFechaFinFiltro] = useState('');
  const [showContratoForm, setShowContratoForm] = useState(false);
  const [showHorarioForm, setShowHorarioForm] = useState(false);
  const [editingContrato, setEditingContrato] = useState(null);
  const [editingHorario, setEditingHorario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contratoToDelete, setContratoToDelete] = useState(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
  const [vistaSeccion, setVistaSeccion] = useState('horarios');
  
  // Referencia para acceder a las funciones del componente HorariosContratoList
  const horariosListRef = React.useRef(null);
  const liquidacionesListRef = React.useRef(null);

  useEffect(() => {
    loadContratos();
  }, []);

  useEffect(() => {
    if (contratoSeleccionado) {
      setContratoFiltro(contratoSeleccionado.id.toString());
    }
  }, [contratoSeleccionado]);

  const loadContratos = async () => {
    try {
      setLoading(true);
      const response = await apiService.getContratos();
      if (response.success) {
        setContratos(response.data);
        // Seleccionar el primer contrato por defecto
        if (response.data.length > 0 && !contratoSeleccionado) {
          setContratoSeleccionado(response.data[0]);
        }
      }
    } catch (error) {
      console.error('Error cargando contratos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContratoSaved = () => {
    setShowContratoForm(false);
    setEditingContrato(null);
    loadContratos();
  };

  const handleHorarioSaved = () => {
    setShowHorarioForm(false);
    setEditingHorario(null);
    if (horariosListRef.current) {
      horariosListRef.current.loadHorarios();
    }
  };

  const handleEditContrato = (contrato) => {
    setEditingContrato(contrato);
    setShowContratoForm(true);
  };

  const handleEditHorario = (horario) => {
    setEditingHorario(horario);
    setShowHorarioForm(true);
  };

  const handleDeleteClick = (id) => {
    const contrato = contratos.find((c) => c.id === id);
    if (!contrato) return;
    setContratoToDelete(contrato);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contratoToDelete) return;

    try {
      const response = await apiService.deleteContrato(contratoToDelete.id);
      if (response.success) {
        loadContratos();
        if (contratoSeleccionado?.id === contratoToDelete.id) {
          setContratoSeleccionado(null);
        }
        setShowDeleteModal(false);
        setContratoToDelete(null);
      } else {
        setAlertModal({
          isOpen: true,
          title: 'Error al eliminar',
          message: response.error || 'No se pudo eliminar el contrato.',
          type: 'error'
        });
      }
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error al eliminar',
        message: 'No se pudo eliminar el contrato. Inténtalo de nuevo.',
        type: 'error'
      });
      console.error('Error eliminando contrato:', error);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setContratoToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con selector de contrato */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900">Contratos</h3>
          </div>
          <button
            onClick={() => {
              setEditingContrato(null);
              setShowContratoForm(true);
            }}
            className="btn-primary flex items-center justify-center space-x-2 text-sm px-4 py-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Contrato</span>
          </button>
        </div>

        {/* Lista de contratos */}
        <ContratosList 
          contratos={contratos}
          contratoSeleccionado={contratoSeleccionado}
          onSelect={setContratoSeleccionado}
          onEdit={handleEditContrato}
          onDelete={handleDeleteClick}
        />
      </div>

      {/* Registrar horario del contrato seleccionado */}
      {contratoSeleccionado && (
        <>
          <div className="card">
            <button
              onClick={() => {
                setEditingHorario(null);
                setShowHorarioForm(true);
              }}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar nuevo horario</span>
            </button>
          </div>

          {/* Horarios y liquidaciones */}
          <div className="card">
            <div className="flex flex-col space-y-3 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setVistaSeccion('horarios')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      vistaSeccion === 'horarios'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Horarios
                  </button>
                  <button
                    type="button"
                    onClick={() => setVistaSeccion('liquidaciones')}
                    className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      vistaSeccion === 'liquidaciones'
                        ? 'bg-white text-primary-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Liquidaciones
                  </button>
                </div>
              </div>
              
              {/* Filtros */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="flex-1 sm:flex-initial">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Contrato
                  </label>
                  <select
                    value={contratoFiltro}
                    onChange={(e) => setContratoFiltro(e.target.value)}
                    className="input-field text-sm py-1.5 px-2 w-full sm:w-auto"
                  >
                    <option value="all">Todos los contratos</option>
                    {contratos.map((contrato) => (
                      <option key={contrato.id} value={contrato.id}>
                        {contrato.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 sm:flex-initial">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={fechaInicioFiltro}
                    onChange={(e) => setFechaInicioFiltro(e.target.value)}
                    className="input-field text-sm py-1.5 px-2 w-full sm:w-auto"
                  />
                </div>
                
                <div className="flex-1 sm:flex-initial">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={fechaFinFiltro}
                    onChange={(e) => setFechaFinFiltro(e.target.value)}
                    className="input-field text-sm py-1.5 px-2 w-full sm:w-auto"
                  />
                </div>
                
                {(fechaInicioFiltro || fechaFinFiltro) && (
                  <button
                    onClick={() => {
                      setFechaInicioFiltro('');
                      setFechaFinFiltro('');
                    }}
                    className="btn-secondary text-sm py-1.5 px-3 whitespace-nowrap"
                  >
                    Limpiar fechas
                  </button>
                )}
              </div>
            </div>
            {vistaSeccion === 'horarios' ? (
            <HorariosContratoList 
              ref={horariosListRef}
              contratoId={contratoFiltro === 'all' ? null : parseInt(contratoFiltro)}
              fechaInicio={fechaInicioFiltro || null}
              fechaFin={fechaFinFiltro || null}
              color={contratoSeleccionado.color}
              contratos={contratos}
              onEdit={handleEditHorario}
              onDataChange={() => {
                if (liquidacionesListRef.current) {
                  liquidacionesListRef.current.loadLiquidaciones();
                }
              }}
            />
            ) : (
            <LiquidacionesContratoList
              ref={liquidacionesListRef}
              contratoId={contratoFiltro === 'all' ? null : parseInt(contratoFiltro)}
              fechaInicio={fechaInicioFiltro || null}
              fechaFin={fechaFinFiltro || null}
              contratos={contratos}
              onDataChange={() => {
                if (horariosListRef.current) {
                  horariosListRef.current.loadLiquidaciones();
                }
              }}
            />
            )}
          </div>
        </>
      )}

      {/* Formularios modales */}
      {showContratoForm && (
        <ContratoForm 
          contrato={editingContrato}
          onClose={() => {
            setShowContratoForm(false);
            setEditingContrato(null);
          }}
          onSave={handleContratoSaved}
        />
      )}

      {showHorarioForm && contratoSeleccionado && (
        <HorarioContratoForm 
          horario={editingHorario}
          contratoId={contratoSeleccionado.id}
          onClose={() => {
            setShowHorarioForm(false);
            setEditingHorario(null);
          }}
          onSave={handleHorarioSaved}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Eliminar contrato"
        message={`¿Eliminar el contrato "${contratoToDelete?.nombre}"? Se eliminarán también todos sus horarios registrados. Esta acción no se puede deshacer.`}
        confirmText="Eliminar contrato"
        cancelText="Cancelar"
        type="danger"
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
}

export default Contratos;

