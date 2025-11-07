import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Calendar, Briefcase, FileText, Plus, Edit, Trash2, Download, DollarSign } from 'lucide-react';

function Documentacion() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Documentación de Hourly
          </h1>
          <p className="text-lg text-gray-600">
            Guía completa para aprovechar al máximo tu control de horas de trabajo
          </p>
        </div>

        {/* Contenido */}
        <div className="space-y-8">
          {/* Sección: Horas Trabajadas */}
          <section className="card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Horas Trabajadas</h2>
            </div>
            
            <div className="space-y-4 text-gray-700">
              <p>
                En esta sección puedes registrar todas las horas que trabajas en tus proyectos freelance.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar una Nueva Hora
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Haz clic en el botón <strong>"Nueva Hora"</strong></li>
                  <li>Selecciona el proyecto en el que trabajaste</li>
                  <li>Indica la fecha y el horario (inicio y fin)</li>
                  <li>El sistema calculará automáticamente la duración y el total a cobrar</li>
                  <li>Opcionalmente, agrega una descripción del trabajo realizado</li>
                  <li>Guarda y listo</li>
                </ol>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Horas Trabajadas
                </h3>
                <p className="text-sm mb-2">
                  Al editar una hora trabajada:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>La tarifa/hora es de solo lectura</strong> - se toma del proyecto</li>
                  <li>Si el precio del proyecto cambió, usa el botón <strong>"Actualizar precio"</strong> para aplicar la nueva tarifa</li>
                  <li>El botón actualiza el total con el precio actual del proyecto</li>
                  <li>Para cambiar la tarifa, edita el proyecto correspondiente</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">💡 Consejos</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Usa el filtro de fechas para ver horas de períodos específicos</li>
                  <li>El resumen muestra total de horas y ganancias del período seleccionado</li>
                  <li>Puedes exportar tus datos a CSV para enviar a clientes</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Sección: Proyectos */}
          <section className="card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Proyectos</h2>
            </div>
            
            <div className="space-y-4 text-gray-700">
              <p>
                Organiza tu trabajo por proyectos. Cada proyecto tiene un color personalizado y una tarifa por hora.
              </p>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear un Nuevo Proyecto
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Haz clic en <strong>"Nuevo Proyecto"</strong></li>
                  <li>Asigna un nombre descriptivo (Ej: "Cliente ABC - Desarrollo Web")</li>
                  <li>Elige un color para identificarlo visualmente</li>
                  <li>Define la tarifa por hora que cobras en ese proyecto</li>
                  <li>Opcionalmente, agrega una descripción</li>
                </ol>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">⚙️ Gestión de Proyectos</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Editar</strong>: Actualiza nombre, color o tarifa (las horas ya registradas mantienen su precio original)</li>
                  <li><strong>Ver Detalles</strong>: Muestra estadísticas y horas trabajadas del proyecto</li>
                  <li><strong>Eliminar</strong>: Desactiva el proyecto (no borra las horas trabajadas asociadas)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Sección: Contratos */}
          <section className="card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Contratos</h2>
            </div>
            
            <div className="space-y-4 text-gray-700">
              <p>
                Gestiona trabajos con contratos donde tienes horas semanales fijas y cobras horas extras por el excedente.
              </p>
              
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear un Contrato
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>En la pestaña <strong>"Contratos"</strong>, haz clic en <strong>"Nuevo Contrato"</strong></li>
                  <li>Asigna un nombre (Ej: "Empresa ABC - Soporte Técnico")</li>
                  <li>Define las <strong>horas semanales</strong> que debes cumplir (Ej: 40 horas)</li>
                  <li>Establece el <strong>valor por hora extra</strong> (Ej: $25 por hora)</li>
                  <li>Guarda el contrato</li>
                </ol>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Registrar Horarios
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Selecciona un contrato de la lista</li>
                  <li>Haz clic en <strong>"Registrar Horario"</strong></li>
                  <li>Indica la fecha y hora de entrada</li>
                  <li>Indica la hora de salida</li>
                  <li>El sistema calculará automáticamente la duración</li>
                  <li>Opcionalmente, agrega una descripción</li>
                </ol>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cálculo de Horas Extras
                </h3>
                <p className="text-sm mb-2">
                  El sistema calcula automáticamente tus horas extras de la semana actual (lunes a domingo):
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Horas Normales</strong>: Hasta el límite de tu contrato (Ej: 40h semanales)</li>
                  <li><strong>Horas Extras</strong>: Todo lo que excede ese límite</li>
                  <li><strong>Total a Cobrar</strong>: Horas extras × Valor hora extra</li>
                </ul>
                <p className="text-sm mt-2 font-medium text-orange-800">
                  Ejemplo: Si tu contrato es de 40h semanales y trabajaste 45h, tienes 5 horas extras.
                  Si cada hora extra vale $25, cobrarás $125 adicionales.
                </p>
              </div>
            </div>
          </section>

          {/* Sección: Informes */}
          <section className="card">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Informes</h2>
            </div>
            
            <div className="space-y-4 text-gray-700">
              <p>
                Visualiza estadísticas detalladas de tu trabajo y genera reportes profesionales.
              </p>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Datos
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Usa el botón <strong>"Exportar CSV"</strong> para descargar tus datos</li>
                  <li>El archivo incluye todas las horas del período seleccionado</li>
                  <li>Ideal para enviar reportes a clientes o para tu contabilidad</li>
                  <li>Puedes filtrar por rango de fechas antes de exportar</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">📊 Estadísticas Disponibles</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Total de horas trabajadas por proyecto</li>
                  <li>Ganancias totales y por proyecto</li>
                  <li>Distribución del tiempo entre proyectos</li>
                  <li>Resúmenes mensuales y personalizados</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Sección: Consejos Generales */}
          <section className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">💡 Consejos y Buenas Prácticas</h2>
            
            <div className="space-y-3 text-gray-700 text-sm">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">📱 Instalable en Móvil</h3>
                <p>Puedes instalar Hourly como una app en tu móvil. En Chrome/Safari, busca la opción "Agregar a pantalla de inicio" en el menú del navegador.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">🔄 Actualización de Precios</h3>
                <p>Si cambias la tarifa de un proyecto, las horas antiguas mantienen su precio original. Usa el botón "Actualizar precio" al editar cada hora si quieres aplicar la nueva tarifa.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">📅 Filtros de Fecha</h3>
                <p>Usa los filtros de fecha en la parte superior para ver tus horas y ganancias de períodos específicos (semana, mes, trimestre, etc.).</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">🎨 Colores de Proyectos</h3>
                <p>Asigna colores diferentes a cada proyecto para identificarlos rápidamente en las listas y reportes.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">⏰ Contratos vs Proyectos</h3>
                <p>
                  <strong>Proyectos</strong>: Para trabajos freelance donde cobras por hora.<br/>
                  <strong>Contratos</strong>: Para trabajos con horas semanales fijas donde cobras horas extras por el excedente.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">📊 Resumen Semanal en Contratos</h3>
                <p>El módulo de Contratos calcula automáticamente tu semana laboral (lunes a domingo) y separa horas normales de horas extras.</p>
              </div>
            </div>
          </section>

          {/* Sección: Preguntas Frecuentes */}
          <section className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">❓ Preguntas Frecuentes</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">¿Puedo cambiar el precio de un proyecto?</h3>
                <p className="text-sm text-gray-700">
                  Sí, edita el proyecto y cambia la tarifa. Las horas antiguas mantendrán su precio original a menos que uses el botón "Actualizar precio" en cada hora.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">¿Cómo funcionan las horas extras en Contratos?</h3>
                <p className="text-sm text-gray-700">
                  El sistema suma todas las horas trabajadas en la semana. Las que excedan las horas semanales del contrato se consideran extras y se multiplican por el valor de hora extra configurado.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">¿Puedo tener múltiples contratos activos?</h3>
                <p className="text-sm text-gray-700">
                  Sí, puedes crear tantos contratos como necesites. Cada uno tiene su propio cálculo de horas extras independiente.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">¿Se guardan mis datos de forma segura?</h3>
                <p className="text-sm text-gray-700">
                  Sí, todos los datos están encriptados y solo tú tienes acceso a ellos. Cada usuario ve únicamente su propia información.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">¿Puedo exportar mis datos?</h3>
                <p className="text-sm text-gray-700">
                  Sí, usa el botón "Exportar CSV" en la parte superior del Dashboard para descargar tus horas trabajadas en formato CSV compatible con Excel.
                </p>
              </div>
            </div>
          </section>

          {/* Botón volver */}
          <div className="text-center pt-4">
            <Link
              to="/dashboard"
              className="btn-primary inline-flex items-center space-x-2 px-6 py-3"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Documentacion;

