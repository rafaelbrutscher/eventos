// /src/services/emailService.ts
import { createPublicApi } from './api'; // E-mail pode ser um serviço público

// (Vamos assumir a porta 8005)
const EMAIL_SERVICE_URL = 'http://localhost:8005/api';

// O envio de e-mail pode não precisar de token de usuário,
// mas sim de uma chave de API interna (tratada pelo backend).
// Usaremos createPublicApi por simplicidade.
const publicApi = createPublicApi(EMAIL_SERVICE_URL);

// --- Tipos ---

export type EmailType = 'inscricao' | 'cancelamento' | 'checkin';

export interface EmailPayload {
  to_email: string; // Email do destinatário
  to_name: string;  // Nome do destinatário
  event_name: string; // Nome do evento
  type: EmailType; // O tipo de e-mail
}

/**
 * Envia uma solicitação para a API de e-mails.
 * Corresponde a: POST /emails
 */
export const enviarEmail = async (payload: EmailPayload): Promise<void> => {
  try {
    await publicApi.post('/emails', payload);
  } catch (error: any) {
    // Falha no envio de e-mail não deve quebrar a aplicação principal.
    // Apenas registramos o erro no console.
    console.error("Falha ao enviar e-mail (serviço de notificação):", error.message);
  }
};