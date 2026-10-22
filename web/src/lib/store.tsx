// Shared answers and the latest screening result for the wizard and results pages.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { apiConfigured, fetchModels, scoreLocal } from './api';
import { DEFAULT_ANSWERS } from './questions';
import type { Answers, Prediction } from './types';

interface Store {
  answers: Answers; setAnswers: (a: Answers) => void;
  height: number; setHeight: (v: number) => void;
  weight: number; setWeight: (v: number) => void;
  result: Prediction | null;
  run: (row: Answers) => Promise<void>;
  retryModels: () => void;
}
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(75);
  const [result, setResult] = useState<Prediction | null>(null);
  const req = useRef(0);

  const askApi = useCallback((row: Answers, id: number) => {
    fetchModels(row).then((models) => {
      if (id !== req.current) return; // a newer screening replaced this one
      setResult((r) => (r ? { ...r, models, status: models ? 'api' : 'offline' } : r));
    });
  }, []);

  // ANN result first (instant, in the browser); Model 1 fills in when the API answers.
  const run = useCallback(async (row: Answers) => {
    const id = ++req.current;
    const ann = await scoreLocal(row);
    setResult({ input: row, ann, models: null, status: apiConfigured ? 'loading' : 'browser-only' });
    if (apiConfigured) askApi(row, id);
  }, [askApi]);

  const retryModels = useCallback(() => {
    if (!result || !apiConfigured) return;
    const id = ++req.current;
    setResult({ ...result, models: null, status: 'loading' });
    askApi(result.input, id);
  }, [result, askApi]);

  return (
    <Ctx.Provider value={{ answers, setAnswers, height, setHeight, weight, setWeight, result, run, retryModels }}>
      {children}
    </Ctx.Provider>
  );
}
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
