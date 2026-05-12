'use client';
import { createContext, useContext, useEffect, useMemo, useState, } from 'react';
const EMPTY_CONFIG = { action: null, breadcrumb: [] };
const TopbarContext = createContext(null);
export function TopbarProvider({ children }) {
    const [config, setConfig] = useState(EMPTY_CONFIG);
    const value = useMemo(() => ({ config, setConfig }), [config]);
    return <TopbarContext.Provider value={value}>{children}</TopbarContext.Provider>;
}
export function useTopbarConfig() {
    return useContext(TopbarContext)?.config ?? EMPTY_CONFIG;
}
export function useTopbar(build, deps) {
    const ctx = useContext(TopbarContext);
    useEffect(() => {
        if (!ctx)
            return;
        ctx.setConfig(build());
        return () => ctx.setConfig(EMPTY_CONFIG);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
}
