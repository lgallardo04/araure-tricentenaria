// =============================================================
// Layout del Dashboard (Admin)
// Envuelve todas las páginas del dashboard con el DashboardLayout
// =============================================================

import DashboardLayout from '@/components/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
