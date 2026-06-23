import React from 'react';
import { X, AlertTriangle, Info, XCircle } from 'lucide-react';

function AlertModal({
  isOpen,
  onClose,
  title = 'Aviso',
  message = '',
  type = 'info',
  buttonText = 'Entendido'
}) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          Icon: XCircle,
          icon: 'text-red-600',
          iconBg: 'bg-red-100',
          button: 'bg-red-600 hover:bg-red-700 text-white'
        };
      case 'warning':
        return {
          Icon: AlertTriangle,
          icon: 'text-amber-600',
          iconBg: 'bg-amber-100',
          button: 'bg-amber-600 hover:bg-amber-700 text-white'
        };
      default:
        return {
          Icon: Info,
          icon: 'text-blue-600',
          iconBg: 'bg-blue-100',
          button: 'bg-blue-600 hover:bg-blue-700 text-white'
        };
    }
  };

  const styles = getTypeStyles();
  const IconComponent = styles.Icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 sm:p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className={`p-1.5 sm:p-2 rounded-full ${styles.iconBg}`}>
              <IconComponent className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.icon}`} />
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 sm:p-6">
          {message && (
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6 whitespace-pre-line">
              {message}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${styles.button}`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;
