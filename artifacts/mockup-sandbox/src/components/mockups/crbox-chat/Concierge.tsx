import React from "react";
import { Link, Sparkles, Send, Tag, Info } from "lucide-react";

export function Concierge() {
  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans" style={{ backgroundColor: "#FAF7F2" }}>
      {/* Background glow */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: "radial-gradient(circle at 50% 30%, rgba(255, 107, 0, 0.03) 0%, transparent 60%)"
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold tracking-tight shadow-sm" style={{ backgroundColor: "#FF6B00" }}>
              CR
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full">
              {/* Pulsing dot */}
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">CRBOX Cotizador</h1>
            <p className="text-sm text-gray-500">Tu concierge de importaciones</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1.5 rounded-full">
          <Info size={14} className="text-gray-400" />
          <span>Guía inicial · El equipo CRBOX confirma el precio final</span>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8 pb-32 flex flex-col gap-6 relative z-0">
        
        {/* Bot Message 1 */}
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm mt-1" style={{ backgroundColor: "#FF6B00" }}>
            CR
          </div>
          <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-3.5 text-gray-800 leading-relaxed shadow-sm border border-gray-50" style={{ boxShadow: "0 1px 8px rgba(0,0,0,.04)" }}>
            ¡Buenas tardes! 👋 Andrea — soy el asistente CRBOX, tu concierge de importaciones. ¿Qué querés traer hoy?
          </div>
        </div>

        {/* User Message */}
        <div className="flex items-end justify-end gap-2 w-full">
          <div className="text-white rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[75%] shadow-sm leading-relaxed font-medium" style={{ backgroundColor: "#FF6B00" }}>
            laptop para trabajo
          </div>
        </div>

        {/* Bot Analysis Card */}
        <div className="flex items-start gap-3 w-full">
          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm mt-1" style={{ backgroundColor: "#FF6B00" }}>
            CR
          </div>
          
          <div className="bg-white rounded-2xl rounded-tl-sm p-6 w-full max-w-lg border border-gray-100/80 shadow-sm" style={{ boxShadow: "0 4px 20px rgba(0,0,0,.04)" }}>
            <div className="flex items-center gap-1.5 mb-3">
              <Sparkles size={14} style={{ color: "#FF6B00" }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FF6B00" }}>Análisis CRBOX</span>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">💻</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Laptop / Computadora</h3>
                <div className="inline-flex items-center gap-1 mt-1 bg-gray-50 text-gray-500 text-xs px-2 py-0.5 rounded-full font-medium border border-gray-100">
                  <Tag size={12} />
                  Computadoras y Accesorios
                </div>
              </div>
            </div>
            
            <div className="bg-[#FAF7F2] rounded-xl p-4 mb-6 border border-orange-50/50">
              <p className="text-sm text-gray-600 leading-relaxed">
                Los laptops entran como mercancía general. El arancel orientativo es del <strong className="text-gray-900">13% + IVA</strong> sobre el precio en USA.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Precio en USA</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-medium">$</span>
                  </div>
                  <input 
                    type="text" 
                    className="block w-full pl-8 pr-12 py-3 bg-gray-50 border-0 rounded-xl text-gray-900 font-medium focus:ring-2 focus:bg-white transition-all outline-none"
                    placeholder="0.00"
                    style={{ focusRingColor: "#FF6B00" }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm font-medium">USD</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Enlace del producto <span className="text-gray-400 font-normal">(opcional)</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Link size={16} className="text-gray-400" />
                  </div>
                  <input 
                    type="text" 
                    className="block w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all outline-none placeholder-gray-400"
                    placeholder="https://www.amazon.com/..."
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button 
                className="flex-1 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-transform hover:-translate-y-0.5"
                style={{ 
                  background: "linear-gradient(to bottom, #FF6B00, #e85e00)",
                  boxShadow: "0 4px 14px rgba(255, 107, 0, 0.25)"
                }}
              >
                Agregar a solicitud
              </button>
              <button className="flex-1 bg-transparent border border-gray-200 text-gray-600 font-semibold py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* Command Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2] to-transparent pt-12 pb-6 z-20">
        <div className="max-w-2xl mx-auto">
          <div className="relative bg-white rounded-full shadow-lg border border-gray-100 flex items-center p-1.5 group transition-shadow focus-within:ring-2" style={{ focusWithinRingColor: "#FF6B00", boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}>
            <input 
              type="text"
              placeholder="Contanos qué querés traer o agregá otro producto…"
              className="w-full bg-transparent border-0 py-3 pl-5 pr-14 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
            />
            <button className="absolute right-2.5 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm transition-transform hover:scale-105" style={{ backgroundColor: "#FF6B00" }}>
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Concierge;
