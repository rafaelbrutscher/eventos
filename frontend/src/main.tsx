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
import { Checkin } from './pages/Checkin.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      // Rotas Protegidas
      {
        element: <ProtectedRoute />,
        children: [

        ],
      },
      // Rotas Públicas
      {
        path: '/minhas-inscricoes',
        element: <MinhasInscricoes />,
      },
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/',
        element: <Home />,
      },
      {
        // O ':id' é o parâmetro dinâmico
        path: '/eventos/:id',
        element: <EventDetails />,
      },
      {
        path: '/meus-certificados',
        element: <MeusCertificados />,
      },
      {
        path: '/validar-certificado',
        element: <ValidacaoCertificado />,
      },
      {
        path: '/register',
        element: <Register />,
      },
      {
        path: '/meu-perfil',
        element: <MeuPerfil />,
      },
      {
            path: '/checkin',
            element: <Checkin />,
          },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);