'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type BreadcrumbItem = {
  href?: string;
  label: string;
};

export type TopbarConfig = {
  action?: ReactNode;
  breadcrumb: ReadonlyArray<BreadcrumbItem>;
};

const EMPTY_CONFIG: TopbarConfig = { action: null, breadcrumb: [] };

type ContextValue = {
  config: TopbarConfig;
  setConfig: (config: TopbarConfig) => void;
};

const TopbarContext = createContext<ContextValue | null>(null);

export function TopbarProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TopbarConfig>(EMPTY_CONFIG);
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}

export function useTopbarConfig(): TopbarConfig {
  return useContext(TopbarContext)?.config ?? EMPTY_CONFIG;
}

export function useTopbar(
  build: () => TopbarConfig,
  deps: ReadonlyArray<unknown>,
): void {
  const ctx = useContext(TopbarContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setConfig(build());
    return () => ctx.setConfig(EMPTY_CONFIG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
