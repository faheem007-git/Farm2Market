import { Navigate, Route, BrowserRouter, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { ToastViewport } from "./components/domain/cards";
import { useToast } from "./hooks/useToast";
import LoginPage from "./pages/auth/LoginPage";
import BuyerDashboard from "./pages/buyer/BuyerDashboard";
import ChatPage from "./pages/buyer/ChatPage";
import DiscoverPage from "./pages/buyer/DiscoverPage";
import MatchesPage from "./pages/buyer/MatchesPage";
import OrderDetailsPage from "./pages/buyer/OrderDetailsPage";
import OrdersPage from "./pages/buyer/OrdersPage";
import RequirementsPage from "./pages/buyer/RequirementsPage";
import ProfilePage from "./pages/buyer/ProfilePage";
import SettingsPage from "./pages/buyer/SettingsPage";
import SupplierPage from "./pages/buyer/SupplierPage";
import BuyerDetailsPage from "./pages/supplier/BuyerDetailsPage";
import BuyerRequestsPage from "./pages/supplier/BuyerRequestsPage";
import ProducePage from "./pages/supplier/ProducePage";
import SupplierChatPage from "./pages/supplier/SupplierChatPage";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierMatchesPage from "./pages/supplier/SupplierMatchesPage";
import SupplierOrderDetailsPage from "./pages/supplier/SupplierOrderDetailsPage";
import SupplierOrdersPage from "./pages/supplier/SupplierOrdersPage";
import SupplierProfilePage from "./pages/supplier/SupplierProfilePage";
import SupplierSettingsPage from "./pages/supplier/SupplierSettingsPage";
import { AdminDashboard, NotFoundPage, PlaceholderPage } from "./pages/dashboards";

function Shell({ children }: { children: React.ReactNode }) {
  const { toasts, dismiss } = useToast();
  return (
    <>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route
            path="/buyer"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><BuyerDashboard /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/discover"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><DiscoverPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/requirements"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><RequirementsPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/matches"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><MatchesPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/suppliers/:supplierId"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><SupplierPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/orders"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><OrdersPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/orders/:orderId"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><OrderDetailsPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/chat"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><ChatPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/chat/:conversationId"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><ChatPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/profile"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/settings"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/buyer/*"
            element={<ProtectedRoute roles={["buyer"]}><AppLayout><PlaceholderPage title="Buyer workspace" /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><SupplierDashboard /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/produce"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><ProducePage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/requests"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><BuyerRequestsPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/buyers/:buyerId"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><BuyerDetailsPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/orders"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><SupplierOrdersPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/orders/:orderId"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><SupplierOrderDetailsPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/matches"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><SupplierMatchesPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/chat"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><SupplierChatPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/chat/:conversationId"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><SupplierChatPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/profile"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><SupplierProfilePage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/settings"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><SupplierSettingsPage /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/supplier/*"
            element={<ProtectedRoute roles={["supplier"]}><AppLayout><PlaceholderPage title="Supplier workspace" /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute roles={["admin"]}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Shell>
    </BrowserRouter>
  );
}
