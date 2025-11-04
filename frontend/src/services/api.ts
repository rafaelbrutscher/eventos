// /src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // (Ajustar se necessário)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default api; 