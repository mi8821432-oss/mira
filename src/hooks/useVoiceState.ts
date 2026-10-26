import { useState, useCallback, useRef } from 'react';
import { VoiceState } from '../types/session.types';

export function useVoiceState(initialState: VoiceState = 'disconnected') {
  const [state, setState] = useState<VoiceState>(initialState);
  const [lastStateChange, setLastStateChange] = useState<number>(Date.now());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const previousStateRef = useRef<VoiceState>(initialState);

  const transitionTo = useCallback((nextState: VoiceState, errorMsg?: string) => {
    setState((prev) => {
      if (prev === nextState) return prev;
      previousStateRef.current = prev;
      setLastStateChange(Date.now());
      if (nextState === 'error') {
        setErrorMessage(errorMsg || 'A connection error occurred');
      } else if (errorMsg === undefined) {
        setErrorMessage(null);
      }
      return nextState;
    });
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (state === 'error') {
      transitionTo('disconnected');
    }
  }, [state, transitionTo]);

  return {
    state,
    previousState: previousStateRef.current,
    lastStateChange,
    errorMessage,
    transitionTo,
    clearError,
  };
}
