from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, blue, gray
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from io import BytesIO
import textwrap
from datetime import datetime

class CertificadoPDFGenerator:
    def __init__(self):
        self.width, self.height = landscape(A4)  # Certificado em paisagem
        
    def gerar_certificado_pdf(self, participante_nome, evento_info, codigo_validacao):
        """
        Gera um PDF de certificado simples
        """
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=landscape(A4))
        
        # Configurações básicas
        margin = 50
        center_x = self.width / 2
        
        # Título principal
        p.setFont("Helvetica-Bold", 32)
        p.setFillColor(blue)
        p.drawCentredText(center_x, self.height - 100, "CERTIFICADO")
        
        # Subtítulo
        p.setFont("Helvetica-Bold", 18)
        p.setFillColor(black)
        p.drawCentredText(center_x, self.height - 140, "DE PARTICIPAÇÃO")
        
        # Linha decorativa
        p.setStrokeColor(blue)
        p.setLineWidth(2)
        p.line(center_x - 150, self.height - 160, center_x + 150, self.height - 160)
        
        # Texto principal
        p.setFont("Helvetica", 14)
        y_position = self.height - 220
        
        # Certificamos que
        p.drawCentredText(center_x, y_position, "Certificamos que")
        
        # Nome do participante (destaque)
        p.setFont("Helvetica-Bold", 20)
        p.setFillColor(blue)
        y_position -= 40
        p.drawCentredText(center_x, y_position, participante_nome.upper())
        
        # Texto de participação
        p.setFont("Helvetica", 14)
        p.setFillColor(black)
        y_position -= 40
        p.drawCentredText(center_x, y_position, "participou do evento")
        
        # Nome do evento
        p.setFont("Helvetica-Bold", 16)
        y_position -= 30
        
        # Quebrar texto do evento se for muito longo
        evento_nome = evento_info.get('nome', 'Evento')
        if len(evento_nome) > 50:
            linhas = textwrap.wrap(evento_nome, width=50)
            for linha in linhas:
                p.drawCentredText(center_x, y_position, linha)
                y_position -= 20
        else:
            p.drawCentredText(center_x, y_position, evento_nome)
            y_position -= 30
        
        # Informações do evento (se disponíveis)
        p.setFont("Helvetica", 12)
        y_position -= 20
        
        if evento_info.get('data_inicio'):
            data_texto = f"Realizado em: {evento_info['data_inicio']}"
            if evento_info.get('data_fim') and evento_info['data_fim'] != evento_info['data_inicio']:
                data_texto += f" a {evento_info['data_fim']}"
            p.drawCentredText(center_x, y_position, data_texto)
            y_position -= 20
        
        if evento_info.get('local'):
            p.drawCentredText(center_x, y_position, f"Local: {evento_info['local']}")
            y_position -= 20
        
        if evento_info.get('carga_horaria'):
            p.drawCentredText(center_x, y_position, f"Carga Horária: {evento_info['carga_horaria']} horas")
            y_position -= 20
        
        # Data de emissão
        y_position -= 30
        data_emissao = datetime.now().strftime("%d/%m/%Y")
        p.drawCentredText(center_x, y_position, f"Emitido em: {data_emissao}")
        
        # Código de validação (no rodapé)
        p.setFont("Helvetica", 10)
        p.setFillColor(gray)
        p.drawCentredText(center_x, 50, f"Código de Validação: {codigo_validacao}")
        p.drawCentredText(center_x, 35, "Este certificado pode ser validado em nosso sistema")
        
        # Borda decorativa
        p.setStrokeColor(blue)
        p.setLineWidth(3)
        p.rect(20, 20, self.width - 40, self.height - 40)
        
        # Borda interna
        p.setLineWidth(1)
        p.rect(30, 30, self.width - 60, self.height - 60)
        
        p.showPage()
        p.save()
        
        buffer.seek(0)
        return buffer
    
    def gerar_certificado_simples(self, participante_nome, evento_nome, codigo_validacao):
        """
        Versão mais simples do certificado
        """
        evento_info = {
            'nome': evento_nome,
            'data_inicio': None,
            'local': None,
            'carga_horaria': None
        }
        
        return self.gerar_certificado_pdf(participante_nome, evento_info, codigo_validacao)