import React from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { Type, Sun, Moon, Contrast, RotateCcw, Plus, Minus, X } from 'lucide-react';

interface AccessibilityToolbarProps {
  onClose?: () => void;
}

const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({ onClose }) => {
  const { 
    increaseFontSize, 
    decreaseFontSize, 
    resetFontSize, 
    toggleHighContrast, 
    toggleTheme,
    theme,
    highContrast
  } = useAccessibility();

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <div className="flex flex-col gap-2 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 pointer-events-auto relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg"
            title="Fechar"
          >
            <X size={12} />
          </button>
        )}
        <div className="flex items-center gap-1 border-b border-stone-100 dark:border-stone-800 pb-2 mb-1">
          <button
            onClick={decreaseFontSize}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all text-stone-600 dark:text-stone-400 hover:text-blue-600 active:scale-95"
            title="Diminuir Fonte (A-)"
          >
            <div className="flex items-center">
              <Type size={14} />
              <Minus size={10} />
            </div>
          </button>
          
          <button
            onClick={resetFontSize}
            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-all text-stone-300 dark:text-stone-600 hover:text-red-500 active:scale-95"
            title="Resetar Fonte"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={increaseFontSize}
            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all text-stone-600 dark:text-stone-400 hover:text-blue-600 active:scale-95"
            title="Aumentar Fonte (A+)"
          >
             <div className="flex items-center">
              <Type size={18} />
              <Plus size={10} />
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl transition-all active:scale-95 ${
              theme === 'dark' 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'hover:bg-amber-100 text-stone-600 hover:text-amber-600'
            }`}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={toggleHighContrast}
            className={`p-2 rounded-xl transition-all active:scale-95 ${
              highContrast 
                ? 'bg-purple-600 text-white shadow-sm' 
                : 'hover:bg-purple-100 dark:hover:bg-purple-900/30 text-stone-600 dark:text-stone-400 hover:text-purple-600'
            }`}
            title="Alto Contraste"
          >
            <Contrast size={20} />
          </button>
        </div>
      </div>
      <p className="text-[9px] font-black uppercase text-stone-400 dark:text-stone-600 text-center tracking-tighter bg-white/50 dark:bg-black/50 py-1 rounded-full px-2">Acessibilidade</p>
    </div>
  );
};

export default AccessibilityToolbar;
