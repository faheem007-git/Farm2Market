import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './hooks/useAuth.tsx'
import { ChatProvider } from './hooks/useChat.tsx'
import { LanguageProvider } from './i18n/LanguageContext.tsx'
import { NotificationsProvider } from './hooks/useNotifications.tsx'
import { OrdersProvider } from './hooks/useOrders.tsx'
import { ProduceProvider } from './hooks/useProduce.tsx'
import { RequirementsProvider } from './hooks/useRequirements.tsx'
import { SupplierResponsesProvider } from './hooks/useSupplierResponses.tsx'
import { ToastProvider } from './hooks/useToast.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <RequirementsProvider>
          <OrdersProvider>
            <ProduceProvider>
              <SupplierResponsesProvider>
                <ChatProvider>
                  <NotificationsProvider>
                    <ToastProvider>
                      <App />
                    </ToastProvider>
                  </NotificationsProvider>
                </ChatProvider>
              </SupplierResponsesProvider>
            </ProduceProvider>
          </OrdersProvider>
        </RequirementsProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
)
