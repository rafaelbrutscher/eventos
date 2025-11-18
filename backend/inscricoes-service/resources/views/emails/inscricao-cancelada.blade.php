<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inscrição Cancelada</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #f44336;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
        }
        .event-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            color: #666;
        }
        .cancel-icon {
            font-size: 48px;
            margin: 10px 0;
        }
        .note {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="cancel-icon">❌</div>
        <h1>Inscrição Cancelada</h1>
    </div>

    <div class="content">
        <p>Olá <strong>{{ $usuario['name'] }}</strong>,</p>

        <p>Informamos que sua inscrição foi cancelada. Veja os detalhes abaixo:</p>

        <div class="event-details">
            <h3>{{ $evento['nome'] }}</h3>

            @if(isset($evento['data_inicio']))
            <p><strong>Data do Evento:</strong> {{ \Carbon\Carbon::parse($evento['data_inicio'])->format('d/m/Y H:i') }}</p>
            @endif

            @if(isset($evento['local']))
            <p><strong>Local:</strong> {{ $evento['local'] }}</p>
            @endif

            <p><strong>Número da Inscrição:</strong> #{{ $inscricao['id'] }}</p>
            <p><strong>Status Anterior:</strong> {{ $inscricao['status_anterior'] ?? 'Confirmada' }}</p>
            <p><strong>Data do Cancelamento:</strong> {{ now()->format('d/m/Y H:i') }}</p>
        </div>

        <div class="note">
            <p><strong>📝 Importante:</strong></p>
            <ul>
                <li>Sua vaga foi liberada e pode ser ocupada por outro participante</li>
                <li>Caso deseje se inscrever novamente, verifique se ainda há vagas disponíveis</li>
                <li>Se o cancelamento foi um engano, entre em contato conosco o mais rápido possível</li>
            </ul>
        </div>

        <p>Se você tem outras inscrições ativas, elas não foram afetadas por este cancelamento.</p>

        <p>Em caso de dúvidas ou se precisar de ajuda, não hesite em entrar em contato conosco.</p>

        <p>Atenciosamente,<br>
        <strong>Equipe de Eventos</strong></p>
    </div>

    <div class="footer">
        <p>Este é um email automático, não responda a esta mensagem.</p>
    </div>
</body>
</html>
