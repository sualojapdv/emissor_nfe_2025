# ======================================================
# 🧩 Script: setup_full_sefaz_multi.ps1
# Configura API SEFAZ MG (multiempresa) + painel React
# ======================================================

Write-Host "🚀 Iniciando automação completa do módulo SEFAZ MG (multiempresa)..." -ForegroundColor Cyan

$backend = "backend"
$frontend = "frontend"
$configDir = "$backend\storage\config"
$certDir = "$backend\storage\certificados"

# 1️⃣ Criar diretórios
Write-Host "📁 Criando diretórios..."
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
New-Item -ItemType Directory -Force -Path $certDir | Out-Null

# 2️⃣ Criar backend (setup_sefaz_multi.js)
Write-Host "⚙️ Gerando setup_sefaz_multi.js..."
@'
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import https from "https";
import xmlbuilder2 from "xmlbuilder2";

const app = express();
app.use(express.json());

const configDir = path.resolve("storage/config");
const certDir = path.resolve("storage/certificados");
fs.mkdirSync(configDir, { recursive: true });
fs.mkdirSync(certDir, { recursive: true });

const upload = multer({ dest: certDir });

function getConfigPath(cnpj) {
  return path.join(configDir, `config_${cnpj}.json`);
}

function loadConfig(cnpj) {
  const file = getConfigPath(cnpj);
  if (!fs.existsSync(file)) {
    const defaultConfig = {
      cnpj,
      ambiente: "production",
      certificado: { path: "", senha: "" },
      sefaz: {
        urls: {
          production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
          homolog: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4"
        }
      }
    };
    fs.writeFileSync(file, JSON.stringify(defaultConfig, null, 2));
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function saveConfig(cnpj, cfg) {
  fs.writeFileSync(getConfigPath(cnpj), JSON.stringify(cfg, null, 2));
}

app.post("/api/config/upload-certificado", upload.single("certificado"), (req, res) => {
  try {
    const { cnpj, senha } = req.body;
    if (!cnpj) return res.status(400).json({ error: "CNPJ é obrigatório." });

    const file = req.file;
    const newPath = path.join(certDir, `${cnpj}_${Date.now()}_${file.originalname}`);
    fs.renameSync(file.path, newPath);

    const cfg = loadConfig(cnpj);
    cfg.certificado.path = newPath;
    cfg.certificado.senha = senha;
    saveConfig(cnpj, cfg);

    res.json({ message: "Certificado salvo!", config: cfg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/config/ambiente", (req, res) => {
  const { cnpj, ambiente } = req.body;
  if (!["production", "homolog"].includes(ambiente)) {
    return res.status(400).json({ error: "Ambiente inválido." });
  }
  const cfg = loadConfig(cnpj);
  cfg.ambiente = ambiente;
  saveConfig(cnpj, cfg);
  res.json({ message: `Ambiente alterado para ${ambiente}`, config: cfg });
});

app.get("/api/config/:cnpj", (req, res) => {
  const { cnpj } = req.params;
  res.json(loadConfig(cnpj));
});

// 🧠 Testar Status do Serviço SEFAZ
app.get("/api/config/testar/:cnpj", (req, res) => {
  const { cnpj } = req.params;
  const cfg = loadConfig(cnpj);
  const url = cfg.ambiente === "homolog" ? cfg.sefaz.urls.homolog : cfg.sefaz.urls.production;

  const xml = xmlbuilder2.create({
    NFeStatusServico4: {
      "@xmlns": "http://www.portalfiscal.inf.br/nfe",
      tpAmb: cfg.ambiente === "homolog" ? 2 : 1,
      cUF: "31",
      xServ: "STATUS"
    }
  }).end({ prettyPrint: true });

  const reqOpts = new URL(url);
  const options = { method: "POST", headers: { "Content-Type": "application/soap+xml" } };

  const httpReq = https.request(reqOpts, resp => {
    let data = "";
    resp.on("data", d => data += d);
    resp.on("end", () => res.json({ status: "ok", resposta: data }));
  });

  httpReq.on("error", err => res.status(500).json({ status: "erro", detail: err.message }));
  httpReq.write(xml);
  httpReq.end();
});

const PORT = process.env.CONFIG_PORT || 3030;
app.listen(PORT, () => console.log(`✅ API SEFAZ Multi rodando em http://localhost:${PORT}`));
'@ | Set-Content "$backend\setup_sefaz_multi.js" -Encoding UTF8

# 3️⃣ Instalar dependências backend
Write-Host "📦 Instalando dependências..."
Set-Location $backend
npm install express multer xmlbuilder2
Set-Location ..

# 4️⃣ Criar painel React multiempresa
Write-Host "🎨 Criando painel React..."
$frontendPage = "$frontend\src\pages"
New-Item -ItemType Directory -Force -Path $frontendPage | Out-Null

@'
import { useState, useEffect } from "react";
import axios from "axios";

export default function ConfigSefazMulti() {
  const [cnpj, setCnpj] = useState("");
  const [config, setConfig] = useState(null);
  const [ambiente, setAmbiente] = useState("production");
  const [senha, setSenha] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState(null);

  const API = "http://localhost:3030/api/config";

  const loadConfig = async () => {
    if (!cnpj) return;
    const res = await axios.get(API + "/" + cnpj);
    setConfig(res.data);
    setAmbiente(res.data.ambiente);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("cnpj", cnpj);
    formData.append("certificado", arquivo);
    formData.append("senha", senha);
    await axios.post(API + "/upload-certificado", formData);
    setMsg("✅ Certificado atualizado!");
    loadConfig();
  };

  const handleAmbiente = async () => {
    await axios.post(API + "/ambiente", { cnpj, ambiente });
    setMsg("🌐 Ambiente alterado para " + ambiente);
    loadConfig();
  };

  const testarSefaz = async () => {
    setMsg("⏳ Testando conexão SEFAZ...");
    try {
      const res = await axios.get(API + "/testar/" + cnpj);
      setStatus("🟢 SEFAZ ONLINE");
      console.log(res.data.resposta);
    } catch {
      setStatus("🔴 SEFAZ OFFLINE");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-2xl shadow-lg mt-10">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">🏢 Configuração SEFAZ MG (Multiempresa)</h1>

      <label className="block mb-2">CNPJ da Empresa</label>
      <input
        type="text"
        placeholder="Digite o CNPJ (somente números)"
        value={cnpj}
        onChange={e => setCnpj(e.target.value)}
        className="w-full border rounded p-2 mb-3"
      />
      <button onClick={loadConfig} className="w-full bg-blue-600 text-white p-2 rounded mb-4">Carregar Configuração</button>

      {config && (
        <>
          <label className="block font-medium text-gray-700">Ambiente</label>
          <select value={ambiente} onChange={e=>setAmbiente(e.target.value)} className="w-full border rounded p-2 mb-3">
            <option value="production">Produção</option>
            <option value="homolog">Homologação</option>
          </select>
          <button onClick={handleAmbiente} className="w-full bg-blue-600 text-white p-2 rounded mb-4">Salvar Ambiente</button>

          <form onSubmit={handleUpload} className="space-y-2">
            <label>Certificado (.pfx)</label>
            <input type="file" accept=".pfx" onChange={e=>setArquivo(e.target.files[0])} className="w-full border rounded p-2"/>
            <label>Senha do Certificado</label>
            <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} className="w-full border rounded p-2"/>
            <button type="submit" className="w-full bg-green-600 text-white p-2 rounded">Upload Certificado</button>
          </form>

          <div className="mt-5 bg-gray-50 p-3 rounded">
            <p><b>Empresa:</b> {config.cnpj}</p>
            <p><b>Ambiente atual:</b> {config.ambiente}</p>
            <p><b>Certificado:</b> {config.certificado?.path || "—"}</p>
            <p><b>Status SEFAZ:</b> {status || "—"}</p>
          </div>

          <button onClick={testarSefaz} className="mt-4 w-full bg-indigo-600 text-white p-2 rounded">
            🔍 Testar Conexão SEFAZ
          </button>
        </>
      )}
    </div>
  );
}
'@ | Set-Content "$frontend\src\pages\ConfigSefazMulti.jsx" -Encoding UTF8

# 5️⃣ Instalar axios no frontend
Write-Host "📦 Instalando axios..."
Set-Location $frontend
npm install axios
Set-Location ..

Write-Host "✅ Automação multiempresa concluída!"
Write-Host ""
Write-Host "➡️ Para iniciar backend: cd backend && node setup_sefaz_multi.js"
Write-Host "➡️ Para acessar painel: http://localhost:5173/config-sefaz-multi"
Write-Host ""
