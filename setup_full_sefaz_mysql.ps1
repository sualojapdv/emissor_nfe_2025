# ======================================================
# ⚙️ Script: setup_full_sefaz_mysql.ps1
# SEFAZ MG Multiempresa + MySQL + Painel React
# ======================================================

Write-Host "🚀 Iniciando configuração completa SEFAZ MG Multiempresa + MySQL..." -ForegroundColor Cyan

$backend = "backend"
$frontend = "frontend"
$configDir = "$backend\storage\config"
$certDir = "$backend\storage\certificados"

# 1️⃣ Criar diretórios
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

# 2️⃣ Criar backend atualizado
Write-Host "⚙️ Gerando setup_sefaz_mysql.js..."
@'
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import xmlbuilder2 from "xmlbuilder2";
import https from "https";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
const upload = multer({ dest: "storage/certificados" });

// 🧱 Banco de Dados
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

// Cria tabela se não existir
await db.execute(`
  CREATE TABLE IF NOT EXISTS empresas_sefaz (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cnpj VARCHAR(20) UNIQUE NOT NULL,
    ambiente ENUM('production','homolog') DEFAULT 'production',
    certificado_path VARCHAR(255),
    certificado_senha VARCHAR(255),
    ultima_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`);

// Funções utilitárias
async function getEmpresa(cnpj) {
  const [rows] = await db.execute("SELECT * FROM empresas_sefaz WHERE cnpj = ?", [cnpj]);
  if (rows.length === 0) {
    await db.execute("INSERT INTO empresas_sefaz (cnpj) VALUES (?)", [cnpj]);
    return { cnpj, ambiente: "production" };
  }
  return rows[0];
}

async function saveEmpresa(data) {
  await db.execute(
    `UPDATE empresas_sefaz SET ambiente=?, certificado_path=?, certificado_senha=? WHERE cnpj=?`,
    [data.ambiente, data.certificado_path, data.certificado_senha, data.cnpj]
  );
}

// 📤 Upload de certificado
app.post("/api/config/upload-certificado", upload.single("certificado"), async (req, res) => {
  try {
    const { cnpj, senha } = req.body;
    const file = req.file;
    if (!cnpj) return res.status(400).json({ error: "CNPJ é obrigatório." });
    const newPath = `storage/certificados/${cnpj}_${Date.now()}_${file.originalname}`;
    fs.renameSync(file.path, newPath);

    const empresa = await getEmpresa(cnpj);
    empresa.certificado_path = newPath;
    empresa.certificado_senha = senha;
    await saveEmpresa(empresa);

    res.json({ message: "✅ Certificado salvo com sucesso!", empresa });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔁 Alterar ambiente
app.post("/api/config/ambiente", async (req, res) => {
  const { cnpj, ambiente } = req.body;
  if (!["production", "homolog"].includes(ambiente))
    return res.status(400).json({ error: "Ambiente inválido" });

  const empresa = await getEmpresa(cnpj);
  empresa.ambiente = ambiente;
  await saveEmpresa(empresa);
  res.json({ message: `🌐 Ambiente alterado para ${ambiente}`, empresa });
});

// 📋 Obter dados da empresa
app.get("/api/config/:cnpj", async (req, res) => {
  const { cnpj } = req.params;
  const empresa = await getEmpresa(cnpj);
  res.json(empresa);
});

// 🔍 Testar conexão com SEFAZ
app.get("/api/config/testar/:cnpj", async (req, res) => {
  const { cnpj } = req.params;
  const empresa = await getEmpresa(cnpj);

  const urls = {
    production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
    homolog: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4"
  };
  const url = urls[empresa.ambiente];

  const xml = xmlbuilder2.create({
    NFeStatusServico4: {
      "@xmlns": "http://www.portalfiscal.inf.br/nfe",
      tpAmb: empresa.ambiente === "homolog" ? 2 : 1,
      cUF: "31",
      xServ: "STATUS"
    }
  }).end({ prettyPrint: true });

  try {
    const reqOpts = new URL(url);
    const options = { method: "POST", headers: { "Content-Type": "application/soap+xml" } };

    const httpReq = https.request(reqOpts, options, (resp) => {
      let data = "";
      resp.on("data", (chunk) => (data += chunk));
      resp.on("end", () => res.jso
