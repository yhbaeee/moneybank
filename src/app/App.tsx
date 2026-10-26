import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '../components/Toast'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { HomePage } from '../features/summary/HomePage'
import { TransactionsPage } from '../features/transactions/TransactionsPage'
import { DevComponents } from './DevComponents'
import { Layout } from './Layout'
import { LedgerDataProvider } from './LedgerDataProvider'
import { LedgerProvider } from './LedgerProvider'
import { ThemeProvider } from './ThemeProvider'
import { TransactionEditorProvider } from './TransactionEditorProvider'

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <LedgerProvider>
          <LedgerDataProvider>
            <TransactionEditorProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<HomePage />} />
                    <Route path="transactions" element={<TransactionsPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    {import.meta.env.DEV && <Route path="dev/components" element={<DevComponents />} />}
                    <Route path="*" element={<HomePage />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </TransactionEditorProvider>
          </LedgerDataProvider>
        </LedgerProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
