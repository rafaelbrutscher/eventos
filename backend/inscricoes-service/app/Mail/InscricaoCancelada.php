<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InscricaoCancelada extends Mailable
{
    use SerializesModels;

    public function __construct(
        public readonly array $inscricao,
        public readonly array $evento,
        public readonly array $usuario
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Inscrição Cancelada - ' . $this->evento['nome']
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.inscricao-cancelada',
            with: [
                'inscricao' => $this->inscricao,
                'evento' => $this->evento,
                'usuario' => $this->usuario,
            ]
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
