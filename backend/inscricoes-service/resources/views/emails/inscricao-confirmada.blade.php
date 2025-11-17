<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Inscrição Confirmada</title>
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
            background: #4CAF50;
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
        .success-icon {
            font-size: 48px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="success-icon">✅</div>
        <h1>Inscrição Confirmada!</h1>
    </div>

    <div class="content">
        <p>Olá <strong>{{ $usuario['nome'] }}</strong>,</p>

        <p>Sua inscrição foi confirmada com sucesso! Aqui estão os detalhes do seu evento:</p>

        <div class="event-details">
            <h3>{{ $evento['nome'] }}</h3>

            @if(isset($evento['descricao']))
            <p><strong>Descrição:</strong> {{ $evento['descricao'] }}</p>
            @endif

            @if(isset($evento['data_inicio']))
            <p><strong>Data:</strong> {{ \Carbon\Carbon::parse($evento['data_inicio'])->format('d/m/Y H:i') }}</p>
            @endif

            @if(isset($evento['local']))
            <p><strong>Local:</strong> {{ $evento['local'] }}</p>
            @endif

            @if(isset($evento['vagas']))
            <p><strong>Vagas:</strong> {{ $evento['vagas'] }}</p>
            @endif

            <p><strong>Número da Inscrição:</strong> #{{ $inscricao['id'] }}</p>
            <p><strong>Status:</strong> {{ $inscricao['status'] ?? 'Confirmada' }}</p>
        </div>

        <p><strong>O que fazer agora?</strong></p>
        <ul>
            <li>Anote a data e horário do evento</li>
            <li>Chegue com antecedência para fazer o check-in</li>
            <li>Traga um documento com foto para identificação</li>
            <li>Em caso de dúvidas, entre em contato conosco</li>
        </ul>

        <p>Estamos ansiosos para vê-lo(a) no evento!</p>

        <p>Atenciosamente,<br>
        <strong>Equipe de Eventos</strong></p>
    </div>

    <div class="footer">
        <p>Este é um email automático, não responda a esta mensagem.</p>
    </div>
</body>
</html>
