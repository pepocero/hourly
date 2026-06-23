import { useState, useRef, useCallback } from 'react';

export function useFormConfirmations({ onClose }) {
  const snapshotRef = useRef('');
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const saveHandlerRef = useRef(null);

  const resetSnapshot = useCallback((data) => {
    snapshotRef.current = JSON.stringify(data);
  }, []);

  const isDirty = useCallback((currentData) => {
    if (!snapshotRef.current) return false;
    return JSON.stringify(currentData) !== snapshotRef.current;
  }, []);

  const requestClose = useCallback((currentData) => {
    if (isDirty(currentData)) {
      setShowDiscardModal(true);
    } else {
      onClose();
    }
  }, [isDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setShowDiscardModal(false);
    onClose();
  }, [onClose]);

  const cancelDiscard = useCallback(() => {
    setShowDiscardModal(false);
  }, []);

  const requestSave = useCallback((event, saveFn) => {
    event.preventDefault();
    saveHandlerRef.current = saveFn;
    setShowSaveModal(true);
  }, []);

  const confirmSave = useCallback(async () => {
    setShowSaveModal(false);
    if (saveHandlerRef.current) {
      await saveHandlerRef.current();
      saveHandlerRef.current = null;
    }
  }, []);

  const cancelSave = useCallback(() => {
    setShowSaveModal(false);
    saveHandlerRef.current = null;
  }, []);

  return {
    showDiscardModal,
    showSaveModal,
    resetSnapshot,
    requestClose,
    confirmDiscard,
    cancelDiscard,
    requestSave,
    confirmSave,
    cancelSave,
    isDirty
  };
}
