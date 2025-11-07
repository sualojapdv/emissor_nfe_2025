import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import https from "https";
import xmlbuilder2 from "xmlbuilder2";

const app = express();
app.use(express.json());

const storageDir = path.resolve("storage/config");
const certDir = path.resolve("storage/certificados");
fs.mkdirSync(storageDir, { recursive: true });
fs.mkdirSync(certDir, { recursive: true });

const configFile = path.join(storageDir, "sefaz_config.json");

if (!fs.existsSync(configFile)) {
  const defaultConfig = {
    ambiente: "production",
    uf: "MG",
    certificado: { path: "", senha: "" },
    sefaz: {
      urls: {
        production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
        homolog: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4"
      }
    }
  };
  fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
}

const upload = multer({ dest: certDir });

app.post("/api/config/upload-certificado", upload.single("certificado"), (req, res) => {
  try {
    const file = req.file;
    const senha = req.body.senha || "";
    const newPath = path.join(certDir, `${Date.now()}_${file.originalname}`);
    fs.renameSync(file.path, newPath);
    const cfg = JSON.parse(fs.readFileSync(configFile, "utf-8"));
    cfg.certificado.path = newPath;
    cfg.certificado.senha = senha;
    fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
    res.json({ message: "Certificado salvo!", config: cfg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/config/ambiente", (req, res) => {
  const { ambiente } = req.body;
  if (!["production", "homolog"].includes(ambiente)) {
    return res.status(400).json({ error: "Ambiente inválido." });
  }
  const cfg = JSON.parse(fs.readFileSync(configFile, "utf-8"));
  cfg.ambiente = ambiente;
  fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2));
  res.json({ message: `Ambiente alterado para ${ambiente}`, config: cfg });
});

app.get("/api/config", (req, res) => {
  const cfg = JSON.parse(fs.readFileSync(configFile, "utf-8"));
  res.json(cfg);
});

// 🧠 Testar Status do Serviço SEFAZ MG
app.get("/api/config/testar", (req, res) => {
  const cfg = JSON.parse(fs.readFileSync(configFile, "utf-8"));
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
app.listen(PORT, () => console.log(`✅ API SEFAZ rodando em http://localhost:${PORT}`));
