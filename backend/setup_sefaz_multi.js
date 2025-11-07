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
