import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Clock, DollarSign, Calendar } from 'lucide-react';
import apiService from '../services/api';
import ContratoForm from './ContratoForm';
import ContratosList from './ContratosList';
import HorarioContratoForm from './HorarioContratoForm';
import HorariosContratoList from './HorariosContratoList';
import {
  calcularHorasEsperadasSemana,
  formatDiasLaborables,
  getMondayOfWeek,
  getFechaDiaCierreSemana,
  esLiquidacionDefinitiva,
  DIAS_LABORABLES_DEFAULT
} from '../utils/contratoHoras';

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
  const [resumenSemanal, setResumenSemanal] = useState(null);
  
  // Referencia para acceder a las funciones del componente HorariosContratoList
  const horariosListRef = React.useRef(null);

  // Calcular fechas de la semana actual
  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lunes
    
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      inicio: monday.toISOString().split('T')[0],
      fin: sunday.toISOString().split('T')[0]
    };
  };

  const [fechasSemana, setFechasSemana] = useState(getWeekDates());

  useEffect(() => {
    loadContratos();
  }, []);

  useEffect(() => {
    if (contratoSeleccionado) {
      const lunes = getMondayOfWeek(new Date().toISOString().split('T')[0]);
      const fin = getFechaDiaCierreSemana(
        lunes,
        contratoSeleccionado.dias_laborables ?? DIAS_LABORABLES_DEFAULT,
        contratoSeleccionado.dia_cierre_liquidacion
      );
      setFechasSemana({ inicio: lunes, fin });
      loadResumenSemanal(lunes, fin);
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

  const loadResumenSemanal = async (inicio = fechasSemana.inicio, fin = fechasSemana.fin) => {
    if (!contratoSeleccionado) return;
    
    try {
      const response = await apiService.getResumenSemanalContrato(
        contratoSeleccionado.id,
        inicio,
        fin
      );
      if (response.success) {
        setResumenSemanal(response.data);
      }
    } catch (error) {
      console.error('Error cargando resumen semanal:', error);
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
    loadResumenSemanal();
    // Recargar la lista de horarios
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

  const handleDeleteContrato = async (id) => {
    if (confirm('¿Estás seguro de eliminar este contrato?')) {
      try {
        await apiService.deleteContrato(id);
        loadContratos();
        if (contratoSeleccionado?.id === id) {
          setContratoSeleccionado(null);
        }
      } catch (error) {
        console.error('Error eliminando contrato:', error);
      }
    }
  };

  // Calcular horas extras
  const calcularHorasExtras = () => {
    if (!resumenSemanal || !contratoSeleccionado) return { normal: 0, extras: 0, totalExtras: 0, horasEsperadas: 0 };

    const totalHoras = (resumenSemanal.total_minutos || 0) / 60;
    const horasEsperadas = calcularHorasEsperadasSemana(
      contratoSeleccionado.horas_semanales || 0,
      contratoSeleccionado.dias_laborables ?? DIAS_LABORABLES_DEFAULT,
      getMondayOfWeek(fechasSemana.inicio),
      fechasSemana.inicio,
      fechasSemana.fin
    );

    const horasNormales = Math.min(totalHoras, horasEsperadas);
    const horasExtras = Math.max(0, totalHoras - horasEsperadas);
    const totalExtras = horasExtras * (contratoSeleccionado.valor_hora_extra || 0);

    return {
      normal: horasNormales.toFixed(2),
      extras: horasExtras.toFixed(2),
      totalExtras: totalExtras.toFixed(2),
      horasEsperadas: horasEsperadas.toFixed(2)
    };
  };

  const { normal, extras, totalExtras, horasEsperadas } = calcularHorasExtras();
  const diasLaborablesLabel = formatDiasLaborables(contratoSeleccionado?.dias_laborables);
  const semanaAbierta = contratoSeleccionado && !esLiquidacionDefinitiva(
    new Date().toISOString().split('T')[0],
    fechasSemana.inicio,
    contratoSeleccionado
  );

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
          onDelete={handleDeleteContrato}
        />
      </div>

      {/* Resumen semanal y botón para registrar horario */}
      {contratoSeleccionado && (
        <>
          {/* Resumen de horas semanales */}
          <div 
            className="card border-2" 
            style={{ 
              backgroundColor: `${contratoSeleccionado.color}15`,
              borderColor: contratoSeleccionado.color 
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="h-5 w-5" style={{ color: contratoSeleccionado.color }} />
                <span>Resumen Semanal - {contratoSeleccionado.nombre}</span>
              </h4>
              {semanaAbierta && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  Semana abierta
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Horas normales */}
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-green-600" />
                  <p className="text-xs sm:text-sm text-gray-600">Horas Normales</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{normal}h</p>
                <p className="text-xs text-gray-500 mt-1">de {horasEsperadas}h esperadas ({diasLaborablesLabel}, cierre {fechasSemana.fin})</p>
              </div>

              {/* Horas extras */}
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <p className="text-xs sm:text-sm text-gray-600">Horas Extras</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{extras}h</p>
                <p className="text-xs text-gray-500 mt-1">
                  {contratoSeleccionado.valor_hora_extra > 0 
                    ? `a $${contratoSeleccionado.valor_hora_extra}/h` 
                    : 'Sin valor configurado'}
                </p>
              </div>

              {/* Total horas extras */}
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <p className="text-xs sm:text-sm text-gray-600">Total Horas Extras</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">${totalExtras}</p>
                <p className="text-xs text-gray-500 mt-1">Esta semana</p>
              </div>
            </div>

            {/* Botón para registrar horario */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setEditingHorario(null);
                  setShowHorarioForm(true);
                }}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Registrar Horario</span>
              </button>
            </div>
          </div>

          {/* Lista de horarios con filtro */}
          <div className="card">
            <div className="flex flex-col space-y-3 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <h4 className="text-base sm:text-lg font-semibold text-gray-900">
                  Horarios Registrados
                </h4>
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
            <HorariosContratoList 
              ref={horariosListRef}
              contratoId={contratoFiltro === 'all' ? null : parseInt(contratoFiltro)}
              fechaInicio={fechaInicioFiltro || null}
              fechaFin={fechaFinFiltro || null}
              color={contratoSeleccionado.color}
              contratos={contratos}
              onEdit={handleEditHorario}
              onDataChange={loadResumenSemanal}
            />
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
    </div>
  );
}

export default Contratos;

