import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Settings, LogOut, Home } from 'lucide-react'

export default function App() {
  return (
    <div className='flex h-screen bg-gray-100'>
      <aside className='w-64 bg-white shadow-md'>
        <div className='p-4 text-2xl font-bold border-b'>Emissor 2025</div>
        <nav className='p-4 space-y-2'>
          <a href='#' className='flex items-center space-x-2 hover:text-blue-500'><Home size={18}/> <span>Dashboard</span></a>
          <a href='#' className='flex items-center space-x-2 hover:text-blue-500'><FileText size={18}/> <span>Emissões</span></a>
          <a href='#' className='flex items-center space-x-2 hover:text-blue-500'><Settings size={18}/> <span>Configurações</span></a>
          <a href='#' className='flex items-center space-x-2 hover:text-red-500'><LogOut size={18}/> <span>Sair</span></a>
        </nav>
      </aside>
      <main className='flex-1 p-6 overflow-auto'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className='text-3xl font-bold mb-6'>Bem-vindo ao Emissor NF-e 2025</h1>
          <p className='text-gray-700'>Simulação de emissão e comunicação com SEFAZ (mock).</p>
        </motion.div>
      </main>
    </div>
  )
}
