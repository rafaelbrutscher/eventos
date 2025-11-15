// /src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.tsx';
import './index.css';

// 1. Importar a nova página


import { Home } from './pages/Home.tsx';
import { Login } from './pages/Login.tsx';
import { ProtectedRoute } from './routes/ProtectedRoute.tsx';

// 1. Importar a nova página (será criada a seguir)
import { EventDetails } from './pages/EventDetails.tsx';
import { MinhasInscricoes } from './pages/MinhasInscricoes.tsx';
import { MeusCertificados } from './pages/MeusCertificados.tsx';
import { ValidacaoCertificado } from './pages/ValidacaoCertificado.tsx';
import { Register } from './pages/Register.tsx';
import { MeuPerfil } from './pages/MeuPerfil.tsx';
import { CheckIn } from './pages/CheckIn.tsx';

import { ProtectedRoute as RoleProtectedRoute } from './components/ProtectedRoute.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // Rotas Públicas (apenas login e register)
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/register',
        element: <Register />,
      },
      // Todas as outras rotas são protegidas
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/',
            element: <Home />,
          },
          {
            path: '/eventos/:id',
            element: <EventDetails />,
          },
          {
            path: '/minhas-inscricoes',
            element: <MinhasInscricoes />,
          },
          {
            path: '/meus-certificados',
            element: <MeusCertificados />,
          },
          {
            path: '/meu-perfil',
            element: <MeuPerfil />,
          },
          {
            path: '/checkin',
            element: (
              <RoleProtectedRoute requireCheckInAccess={true}>
                <CheckIn />
              </RoleProtectedRoute>
            ),
          },
          {
            path: '/validar-certificado',
            element: <ValidacaoCertificado />,
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);