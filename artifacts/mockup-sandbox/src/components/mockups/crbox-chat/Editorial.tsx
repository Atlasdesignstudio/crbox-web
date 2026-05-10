import React from 'react';
import { Sparkles, Link as LinkIcon, Send, Package, Tag, ChevronRight, Circle } from 'lucide-react';

export function Editorial() {
  return (
    <div 
      className="min-h-screen w-full flex justify-center font-sans"
      style={{ 
        backgroundColor: '#F5F3EF',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Central Chat Column */}
      <div className="w-full max-w-[720px] bg-white h-screen flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.05)] border-x border-[#e5e7eb]">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-[#e5e7eb] bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#FF5A00] text-white flex items-center justify-center font-bold text-lg rounded-[6px] shadow-sm">
              CR
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-gray-900 text-[17px] leading-tight">CRBOX Cotizador</h1>
              <p className="text-sm text-gray-500 leading-tight">Tu concierge de importaciones desde USA</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#FF5A00]"></div>
            <div className="w-2 h-2 rounded-full border border-gray-300 bg-transparent"></div>
            <div className="w-2 h-2 rounded-full border border-gray-300 bg-transparent"></div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-8">
          
          {/* Bot Greeting */}
          <div className="flex w-full">
            <div className="max-w-[85%] bg-[#FAF9F7] text-gray-800 px-5 py-4 rounded-r-xl rounded-bl-xl border-l-2 border-[#FF5A00] shadow-sm text-[15px] leading-relaxed">
              ¡Buenas tardes! 👋 Andrea — soy el asistente CRBOX, tu concierge de importaciones. ¿Qué querés traer hoy?
            </div>
          </div>

          {/* User Message */}
          <div className="flex w-full justify-end">
            <div className="max-w-[80%] bg-[#1F2937] text-white px-5 py-3 rounded-xl rounded-tr-sm shadow-sm text-[15px]">
              laptop para trabajo
            </div>
          </div>

          {/* Product Analysis Card */}
          <div className="w-full flex">
            <div className="w-full bg-white border border-[#e5e7eb] shadow-sm rounded-lg overflow-hidden flex flex-col border-t-[3px] border-t-[#FF5A00]">
              
              {/* Card Top */}
              <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
                <span className="text-xs font-bold text-[#FF5A00] tracking-wide uppercase">Análisis CRBOX</span>
                <Sparkles className="w-4 h-4 text-[#FF5A00]" />
              </div>

              {/* Card Middle */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">💻</span>
                  <h3 className="text-[20px] font-bold text-gray-900">Laptop / Computadora</h3>
                </div>
                <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                  Computadoras y Accesorios
                </div>
              </div>

              {/* Insight */}
              <div className="mx-5 mb-5 bg-[#FAF7F2] border-l-2 border-[#FF5A00] px-4 py-3 rounded-r-md">
                <p className="text-sm text-gray-700 italic leading-relaxed">
                  Los laptops entran como mercancía general. El arancel orientativo es del 13% + IVA sobre el precio en USA.
                </p>
              </div>

              {/* Price */}
              <div className="px-5 mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Precio en USA</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium text-lg">$</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="0.00"
                    className="block w-full pl-8 pr-12 py-3 border border-gray-300 rounded-md text-lg text-gray-900 focus:ring-2 focus:ring-[#FF5A00] focus:border-[#FF5A00] transition-colors outline-none font-medium placeholder-gray-300"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-medium text-sm">USD</span>
                  </div>
                </div>
              </div>

              {/* URL */}
              <div className="px-5 mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" /> Enlace del producto (opcional)
                </label>
                <input 
                  type="text" 
                  placeholder="https://www.amazon.com/..."
                  className="block w-full px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-800 focus:ring-1 focus:ring-[#FF5A00] focus:border-[#FF5A00] outline-none transition-colors bg-gray-50 placeholder-gray-400"
                />
              </div>

              {/* Actions */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-2.5">
                <button className="w-full bg-[#FF5A00] hover:bg-[#E55100] text-white font-medium py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2">
                  Agregar a solicitud <ChevronRight className="w-4 h-4" />
                </button>
                <button className="w-full bg-transparent hover:bg-gray-100 text-gray-600 font-medium py-2.5 px-4 rounded-md transition-colors">
                  Cancelar
                </button>
              </div>

            </div>
          </div>
          
          {/* Bottom spacing so the last item isn't covered by the absolute bar if we used one */}
          <div className="h-4"></div>
        </div>

        {/* Command Bar */}
        <div className="p-4 border-t border-[#e5e7eb] bg-white">
          <div className="relative flex items-center border border-gray-300 shadow-[0_2px_10px_rgba(0,0,0,0.04)] rounded-md bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#FF5A00]/20 focus-within:border-[#FF5A00] transition-all">
            <input 
              type="text"
              placeholder="Contanos qué querés traer o agregá otro producto…"
              className="w-full py-3.5 pl-4 pr-12 text-[15px] outline-none placeholder-gray-400 text-gray-800"
            />
            <button className="absolute right-2 p-2 bg-gray-100 hover:bg-[#FF5A00] hover:text-white text-gray-500 rounded transition-colors group">
              <Send className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Editorial;
