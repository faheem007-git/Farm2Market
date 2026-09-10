import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { useAuth } from "../../hooks/useAuth";
import type { Role } from "../../types";

export function ProtectedRoute({ children, roles }: { children: ReactElement; roles?: Role[] }) {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && role && !roles.includes(role)) {
    const fallback = role === "buyer" ? "/buyer" : role === "supplier" ? "/supplier" : "/admin";
    return <Navigate to={fallback} replace />;
  }
  return children;
}
