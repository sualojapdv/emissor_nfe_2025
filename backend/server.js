// ===========================================
// 🚀 Emissor NF-e 2025 - Backend Node.js (Render Ready)
// ===========================================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { Sequelize } from "sequelize";
import axios from "axios";
import { fileURLToPath } from "url";

// ===========================================
// 🧩 Inicialização e Configurações
// ===========================================
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ===========================================
// 🗄️ Conexão MySQL
// ===========================================
const sequelize = new Sequelize(
  process.env.DB_NAME || "emissornfe",
  process.env.DB_USER || "root",
  process.env.DB_PASS || "",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  }
);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexão MySQL estabelecida com sucesso.");
  } catch (error) {
    console.error("❌ Erro ao conectar no banco:", error.message);
  }
})();

// ===========================================
// 🧠 Endpoint de status SEFAZ mock
// ===========================================
app.get("/api/status", (req, res) => {
  res.json({
    status: "ok",
    sefaz: "online",
    timestamp: new Date(),
  });
});

// ===========================================
// 📄 Emissão fictícia DANFE (PDF)
// ===========================================
app.post("/api/emitir", async (req, res) => {
  try {
    const { cliente, valor } = req.body;

    if (!cliente || !valor) {
      return res.status(400).json({ erro: "Cliente e valor são obrigatórios" });
    }

    // 📁 Garante que a pasta uploads exista
    const uploadsDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const nomeArquivo = `danfe_ficticia_${Date.now()}.pdf`;
    const filePath = path.join(uploadsDir, nomeArquivo);

    // 🧾 Cria o PDF
    const pdf = new PDFDocument();
    pdf.pipe(fs.createWriteStream(filePath));
    pdf.fontSize(20).text("DANFE Fictícia", { align: "center" });
    pdf.moveDown();
    pdf.fontSize(14).text(`Cliente: ${cliente}`);
    pdf.text(`Valor: R$ ${valor}`);
    pdf.text(`Data: ${new Date().toLocaleString("pt-BR")}`);
    pdf.moveDown();
    pdf.fontSize(10).text("Documento sem valor fiscal.", { align: "center" });
    pdf.end();

    console.log(`📄 DANFE fictícia gerada: ${filePath}`);

    res.json({
      sucesso: true,
      arquivo: nomeArquivo,
      url: `/uploads/${nomeArquivo}`,
    });
  } catch (err) {
    console.error("❌ Erro ao gerar DANFE:", err);
    res.status(500).json({ erro: "Falha ao gerar DANFE" });
  }
});

// Servir PDFs gerados publicamente (Render-friendly)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===========================================
// ✉️ Envio de e-mail (SMTP)
// ===========================================
app.post("/api/enviar-email", async (req, res) => {
  const { para, assunto, mensagem } = req.body;

  if (!para || !assunto || !mensagem) {
    return res.status(400).json({ erro: "Campos obrigatórios ausentes" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || process.env.SMTP_HOST,
      port: process.env.MAIL_PORT || process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER || process.env.SMTP_USER,
        pass: process.env.MAIL_PASS || process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Emissor NF-e 2025" <${process.env.MAIL_USER || process.env.SMTP_USER}>`,
      to: para,
      subject: assunto,
      text: mensagem,
    });

    console.log(`📧 E-mail enviado para ${para}`);
    res.json({ sucesso: true });
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail:", error.message);
    res.status(500).json({ erro: "Falha no envio de e-mail" });
  }
});

// ===========================================
// 🚀 Inicialização do servidor
// ===========================================
const PORT = process.env.PORT || 3333;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend Emissor NF-e rodando na porta ${PORT}`);
});
