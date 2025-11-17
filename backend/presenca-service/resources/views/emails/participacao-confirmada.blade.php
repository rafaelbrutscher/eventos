<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Participação Confirmada</title>
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
            background: #2196F3;
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
        .check-icon {
            font-size: 48px;
            margin: 10px 0;
        }
        .highlight {
            background: #e8f5e9;
            border-left: 4px solid #4CAF50;
            padding: 15px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="check-icon">🎯</div>
        <h1>Participação Confirmada!</h1>
    </div>

    <div class="content">
        <p>Parabéns <strong>{{ $usuario['nome'] }}</strong>!</p>

        <p>Sua participação no evento foi registrada com sucesso. Você agora está elegível para receber o certificado de participação!</p>

        <div class="event-details">
            <h3>{{ $evento['nome'] }}</h3>

            @if(isset($evento['descricao']))
            <p><strong>Descrição:</strong> {{ $evento['descricao'] }}</p>
            @endif

            @if(isset($evento['data_inicio']))
            <p><strong>Data do Evento:</strong> {{ \Carbon\Carbon::parse($evento['data_inicio'])->format('d/m/Y H:i') }}</p>
            @endif

            @if(isset($evento['local']))
            <p><strong>Local:</strong> {{ $evento['local'] }}</p>
            @endif

            <p><strong>Check-in realizado em:</strong> {{ \Carbon\Carbon::parse($presenca['created_at'])->format('d/m/Y H:i') }}</p>
        </div>

        <div class="highlight">
            <h4>🏆 Próximos Passos:</h4>
            <ul>
                <li><strong>Certificado:</strong> Será disponibilizado em breve na sua área do usuário</li>
                <li><strong>Avaliação:</strong> Sua opinião sobre o evento é muito importante</li>
                <li><strong>Networking:</strong> Continue conectado com outros participantes</li>
            </ul>
        </div>

        <p>Obrigado por participar do nosso evento! Esperamos que tenha sido uma experiência enriquecedora.</p>

        <p>Fique atento aos próximos eventos que temos preparado para você!</p>

        <p>Atenciosamente,<br>
        <strong>Equipe de Eventos</strong></p>
    </div>

    <div class="footer">
        <p>Este é um email automático, não responda a esta mensagem.</p>
    </div>
</body>
</html>
