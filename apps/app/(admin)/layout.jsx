import { AdminShellConditional } from '@/components/layout/admin-shell-conditional';
export default function AdminGroupLayout({ children }) {
    return <AdminShellConditional>{children}</AdminShellConditional>;
}
