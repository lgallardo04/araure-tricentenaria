// =============================================================
// Layout de Mi Calle (Jefe de Calle)
// Usa el mismo DashboardLayout
// =============================================================

import DashboardLayout from '@/components/DashboardLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
