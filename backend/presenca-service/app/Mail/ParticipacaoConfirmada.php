<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ParticipacaoConfirmada extends Mailable
{
    use SerializesModels;

    public function __construct(
        public readonly array $presenca,
        public readonly array $evento,
        public readonly array $usuario
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Participação Confirmada - ' . $this->evento['nome']
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.participacao-confirmada',
            with: [
                'presenca' => $this->presenca,
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
