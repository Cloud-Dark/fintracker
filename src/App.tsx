import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { ToastProvider } from '@/hooks/useToast'
import { LedgerProvider } from '@/hooks/useLedger'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import GeneralLedger from '@/pages/GeneralLedger'
import Reports from '@/pages/Reports'
import Accounts from '@/pages/Accounts'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <ToastProvider>
      <LedgerProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transaksi" element={<Transactions />} />
            <Route path="/buku-besar" element={<GeneralLedger />} />
            <Route path="/laporan" element={<Reports />} />
            <Route path="/akun" element={<Accounts />} />
            <Route path="/pengaturan" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </LedgerProvider>
    </ToastProvider>
  )
}
