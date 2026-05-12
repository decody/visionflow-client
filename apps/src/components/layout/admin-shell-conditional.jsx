'use client';
import { ROUTES } from '@visionflow/routes';
import { usePathname } from 'next/navigation';
import { AdminShell } from './admin-shell';
const SHELL_FREE_PREFIXES = [ROUTES.ADMIN.LOGIN, ROUTES.ADMIN.SIGNIN];
const TOPBAR_FREE_PREFIXES = [`${ROUTES.ADMIN.WORK_PORTFOLIO.ROOT}/`];
export function AdminShellConditional({ children }) {
    const pathname = usePathname() ?? '';
    const skipShell = SHELL_FREE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
    if (skipShell) {
        return <>{children}</>;
    }
    const hideTopbar = TOPBAR_FREE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    return <AdminShell hideTopbar={hideTopbar}>{children}</AdminShell>;
}
