import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider } from './application/contexts/SessionContext';
import { TableListProvider } from './application/contexts/TableListContext';
import { TableProvider } from './application/contexts/TableContext';
import { LoginPage } from './presentation/pages/LoginPage';
import { LobbyPage } from './presentation/pages/LobbyPage';
import { CreateTablePage } from './presentation/pages/CreateTablePage';
import { TablePage } from './presentation/pages/TablePage';
import { ResultsPage } from './presentation/pages/ResultsPage';
import { ProtectedRoute } from './presentation/pages/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <TableListProvider>
          <TableProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <LobbyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create-table"
                element={
                  <ProtectedRoute>
                    <CreateTablePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/table/:tableId"
                element={
                  <ProtectedRoute>
                    <TablePage />
                  </ProtectedRoute>
                }
              />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </TableProvider>
        </TableListProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
