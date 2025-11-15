// /src/services/eventService.ts
import { createPrivateApi } from './api';

// !!! Ajuste a porta se necessário
const EVENTOS_SERVICE_URL = 'http://localhost:8001/api';

// API privada para Eventos
const privateApi = createPrivateApi(EVENTOS_SERVICE_URL);

// (Interface Event...)

export const getEvents = async (): Promise<Event[]> => {
  try {
    const { data } = await privateApi.get<Event[]>('/eventos');
    return data;
  } catch (error: any) {
    // ... (lógica de erro)
  }
};

export const getEventById = async (id: string): Promise<Event> => {
  try {
    const { data } = await privateApi.get<Event>(`/eventos/${id}`);
    return data;
  } catch (error: any) {
    // ... (lógica de erro)
  }
};