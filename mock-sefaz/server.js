import express from 'express'
const app = express()
app.use(express.json())

app.post('/sefaz/emissao', (req, res) => {
  const protocolo = 'PROT' + Math.floor(Math.random() * 999999)
  res.json({ status: 'autorizado', protocolo })
})

app.listen(4000, () => console.log('Mock SEFAZ rodando em http://localhost:4000'))
