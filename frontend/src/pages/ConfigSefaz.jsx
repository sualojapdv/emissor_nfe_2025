import { useState, useEffect } from "react";
import axios from "axios";

export default function ConfigSefaz() {
  const [config, setConfig] = useState(null);
  const [ambiente, setAmbiente] = useState("production");
  const [senha, setSenha] = useState("");
  const [arquivo, setArquivo] = useState(null);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState(null);

  const API = "http://localhost:3030/api/config";

  const loadConfig = () => {
    axios.get(API).then(res => {
      setConfig(res.data);
      setAmbiente(res.data.ambiente);
    });
  };

  useEffect(() => { loadConfig(); }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("certificado", arquivo);
    formData.append("senha", senha);
    await axios.post(API + "/upload-certificado", formData);
    setMsg("✅ Certificado atualizado!");
    loadConfig();
  };

  const handleAmbiente = async () => {
    await axios.post(API + "/ambiente", { ambiente });
    setMsg("🌐 Ambiente alterado para " + ambiente);
    loadConfig();
  };

  const testarSefaz = async () => {
    setMsg("⏳ Testando conexão SEFAZ...");
    try {
      const res = await axios.get(API + "/testar");
      setStatus("🟢 SEFAZ ONLINE");
      console.log(res.data.resposta);
    } catch {
      setStatus("🔴 SEFAZ OFFLINE");
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-2xl shadow-lg mt-10">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">⚙️ Configuração SEFAZ MG</h1>

      {msg && <div className="mb-3 text-sm text-blue-600">{msg}</div>}

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
        <p><b>Ambiente atual:</b> {config?.ambiente}</p>
        <p><b>Certificado:</b> {config?.certificado?.path || "—"}</p>
        <p><b>Status SEFAZ:</b> {status || "—"}</p>
      </div>

      <button onClick={testarSefaz} className="mt-4 w-full bg-indigo-600 text-white p-2 rounded">
        🔍 Testar Conexão SEFAZ
      </button>
    </div>
  );
}
