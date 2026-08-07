import { useCallback, useEffect, useReducer, useRef } from 'react';

import type { AnalysisState, SourceOrder } from '../../types/domain';
import { AnalysisOrchestrator, type AnalysisOrchestratorOptions } from './orchestrator';
import { initialAnalysisState } from './reducer';

export interface UseAnalysisOrchestratorResult {
  state: AnalysisState;
  submit: (input: string, order?: SourceOrder) => Promise<void>;
  cancel: () => void;
}

export function useAnalysisOrchestrator(options: AnalysisOrchestratorOptions = {}): UseAnalysisOrchestratorResult {
  const [state, setState] = useReducer((_state: AnalysisState, nextState: AnalysisState) => nextState, initialAnalysisState);
  const orchestratorRef = useRef<AnalysisOrchestrator | undefined>(undefined);
  orchestratorRef.current ??= new AnalysisOrchestrator({ ...options, dispatch: setState });
  const orchestrator = orchestratorRef.current;

  useEffect(() => {
    return () => {
      orchestrator.dispose();
    };
  }, [orchestrator]);

  const submit = useCallback(
    (input: string, order?: SourceOrder) => orchestrator.submit(input, order),
    [orchestrator],
  );
  const cancel = useCallback(() => {
    orchestrator.cancel();
  }, [orchestrator]);

  return { state, submit, cancel };
}
