# ================================
# Emissor NF-e 2025 - Backend Setup
# ================================

Write-Host "🚀 Iniciando setup do backend..."

# Criar pasta do backend
New-Item -ItemType Directory -Force -Path .\backend | Out-Null
Set-Location .\backend

# Inicializar Node e instalar dependências
npm init -y
npm install express mysql2 sequelize dotenv nodemailer axios xml2js pdfkit cors body-parser multer formidable node-fetch --save
npm install nodemon --save-dev

# Criar arquivo .env
@"
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=nfedb
SMTP_HOST=smtp.seudominio.com
SMTP_USER=suporte@seudominio.com
SMTP_PASS=sua-senha
SMTP_PORT=587
SEFAZ_API=https://www.sefaz.rs.gov.br/NF-e
"@ | Out-File -Encoding utf8 .env

# Criar estrutura de pastas
mkdir routes,controllers,models,services,sefaz_xsd,uploads | Out-Null

# Baixar XSDs atualizados da SEFAZ
Write-Host "📦 Baixando XSDs da SEFAZ..."
$sefazXSDs = @(
  "https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=JQWzQ0CBvYo=",
  "https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=pQ6IoXH6m1o=",
  "https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=fakeexemplo"
)
foreach ($url in $sefazXSDs) {
  $file = "sefaz_xsd\" + [System.IO.Path]::GetFileName($url)
  Invoke-WebRequest -Uri $url -OutFile $file -ErrorAction SilentlyContinue
}

# Criar server.js
@"
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';
import fs from 'fs';
import pdfkit from 'pdfkit';
import { Sequelize } from 'sequelize';
import axios from 'axios';

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database MySQL
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  dialect: 'mysql',
});

try {
  await sequelize.authenticate();
  console.log('✅ Conexão MySQL estabelecida com sucesso.');
} catch (error) {
  console.error('❌ Erro ao conectar no banco:', error);
}

// Exemplo de endpoint SEFAZ mock
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', sefaz: 'online' });
});

// Emissão fictícia DANFE
app.post('/api/emitir', (req, res) => {
  const { cliente, valor } = req.body;
  const pdf = new pdfkit();
  const nome = `danfe_${Date.now()}.pdf`;
  pdf.text(\`DANFE Fictícia - Cliente: \${cliente}\nValor: R\$ \${valor}\`);
  pdf.pipe(fs.createWriteStream(\`./uploads/\${nome}\`));
  pdf.end();
  res.json({ sucesso: true, arquivo: nome });
});

app.listen(process.env.PORT, () => {
  console.log(\`🚀 Backend rodando na porta \${process.env.PORT}\`);
});
"@ | Out-File -Encoding utf8 server.js

Write-Host "✅ Backend pronto. Execute com: cd backend && npx nodemon server.js"
