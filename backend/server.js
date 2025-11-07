import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Sequelize } from 'sequelize';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔧 Conexão MySQL
const sequelize = new Sequelize(
  process.env.DB_NAME || 'emissornfe',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
  }
);

try {
  await sequelize.authenticate();
  console.log('✅ Conexão MySQL estabelecida com sucesso.');
} catch (error) {
  console.error('❌ Erro ao conectar no banco:', error);
}

// 🧠 Endpoint básico SEFAZ mock
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', sefaz: 'online', timestamp: new Date() });
});

// 📄 Emissão fictícia DANFE
app.post('/api/emitir', async (req, res) => {
  try {
    const { cliente, valor } = req.body;

    // 📁 Garante que a pasta uploads exista
    const uploadsDir = path.resolve('./uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const nomeArquivo = `danfe_ficticia_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, nomeArquivo);

    // 🧾 Cria o PDF
    const pdf = new PDFDocument();
    pdf.pipe(fs.createWriteStream(filePath));
    pdf.fontSize(20).text('DANFE Fictícia', { align: 'center' });
    pdf.moveDown();
    pdf.fontSize(14).text(`Cliente: ${cliente}`);
    pdf.text(`Valor: R$ ${valor}`);
    pdf.text(`Data: ${new Date().toLocaleString('pt-BR')}`);
    pdf.moveDown();
    pdf.fontSize(10).text('Documento sem valor fiscal.', { align: 'center' });
    pdf.end();

    console.log(`📄 DANFE fictícia gerada: ${filePath}`);
    res.json({ sucesso: true, arquivo: nomeArquivo });
  } catch (err) {
    console.error('❌ Erro ao gerar DANFE:', err);
    res.status(500).json({ erro: 'Falha ao gerar DANFE' });
  }
});

// ✉️ Envio de e-mail (exemplo)
app.post('/api/enviar-email', async (req, res) => {
  const { para, assunto, mensagem } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Emissor NF-e 2025" <${process.env.SMTP_USER}>`,
      to: para,
      subject: assunto,
      text: mensagem,
    });

    res.json({ sucesso: true });
  } catch (error) {
    console.error('❌ Erro ao enviar e-mail:', error);
    res.status(500).json({ erro: 'Falha no envio de e-mail' });
  }
});

// 🚀 Inicialização do servidor
const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
