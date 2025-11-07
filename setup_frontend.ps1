# ================================
# Emissor NF-e 2025 - Frontend Setup
# ================================

Write-Host "🎨 Iniciando setup do frontend..."

New-Item -ItemType Directory -Force -Path .\frontend | Out-Null
Set-Location .\frontend

# Inicializar projeto Vite React
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss@3.4.14 postcss autoprefixer
npm install axios react-router-dom @headlessui/react @heroicons/react

# Inicializar Tailwind
npx tailwindcss init -p

# tailwind.config.js
@"
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'azul-saas': '#007AFF',
        'azul-gradiente': '#00C6FF'
      },
    },
  },
  plugins: [],
};
"@ | Out-File -Encoding utf8 tailwind.config.js

# postcss.config.js
@"
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
"@ | Out-File -Encoding utf8 postcss.config.js

# Adicionar estilo base
@"
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gradient-to-br from-azul-saas to-azul-gradiente text-white h-screen;
}
"@ | Out-File -Encoding utf8 .\src\index.css

# Criar páginas principais
mkdir src\pages
@"
import React from 'react';
export default function Login() {
  return (
    <div className='flex flex-col justify-center items-center h-screen'>
      <h1 className='text-3xl font-bold mb-4'>Emissor NF-e 2025</h1>
      <form className='bg-white text-black p-8 rounded-2xl shadow-xl space-y-4'>
        <input type='email' placeholder='Email' className='p-2 border rounded w-64' />
        <input type='password' placeholder='Senha' className='p-2 border rounded w-64' />
        <button className='w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white p-2 rounded-lg shadow-md'>Entrar</button>
      </form>
    </div>
  );
}
"@ | Out-File -Encoding utf8 .\src\pages\Login.jsx

Write-Host "✅ Frontend criado com sucesso!"
Write-Host "▶️ Para iniciar o modo desenvolvimento:"
Write-Host "cd frontend && npm run dev"
