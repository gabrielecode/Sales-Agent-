import React, { useState } from 'react';
import { SECTOR_GROUPS, ALL_SECTORS } from '../lib/categories';
import { Edit3, Check, X, Plus } from 'lucide-react';

interface CategorySelectProps {
  value?: string;
  onChange: (newCategory: string) => void;
  className?: string;
  showCustomOption?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  value = '',
  onChange,
  className = '',
  showCustomOption = true,
}) => {
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');

  const currentVal = value.trim() || 'Servizi & Imprese Locali';
  const isKnownSector = ALL_SECTORS.includes(currentVal);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === '__custom__') {
      setIsCustomMode(true);
      setCustomText(currentVal);
      return;
    }
    onChange(selected);
  };

  const handleSaveCustom = () => {
    const clean = customText.trim();
    if (clean) {
      onChange(clean);
    }
    setIsCustomMode(false);
  };

  const handleCancelCustom = () => {
    setIsCustomMode(false);
  };

  if (isCustomMode) {
    return (
      <div className="flex items-center gap-1.5 animate-fadeIn">
        <input
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          placeholder="Es: Imprese pittura, Idraulici..."
          className="text-xs bg-white text-slate-900 border border-indigo-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium min-w-[180px] shadow-2xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveCustom();
            } else if (e.key === 'Escape') {
              handleCancelCustom();
            }
          }}
        />
        <button
          type="button"
          onClick={handleSaveCustom}
          className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md cursor-pointer transition shadow-2xs"
          title="Salva categoria personalizzata"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancelCustom}
          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md cursor-pointer transition"
          title="Annulla"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={currentVal}
        onChange={handleSelectChange}
        className={`text-xs bg-indigo-50 hover:bg-indigo-100/80 text-indigo-950 border border-indigo-200 font-semibold rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 transition ${className}`}
        title="Seleziona la categoria o il settore merceologico per personalizzare l'email"
      >
        {/* If the current value is custom (not in predefined list), keep it as the first option */}
        {!isKnownSector && currentVal && (
          <optgroup label="Settore Attuale (Personalizzato)">
            <option value={currentVal}>{currentVal}</option>
          </optgroup>
        )}

        {SECTOR_GROUPS.map((group) => (
          <optgroup key={group.groupName} label={group.groupName}>
            {group.categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </optgroup>
        ))}

        {showCustomOption && (
          <optgroup label="Altro">
            <option value="__custom__">+ Inserisci altro settore personalizzato...</option>
          </optgroup>
        )}
      </select>

      {showCustomOption && (
        <button
          type="button"
          onClick={() => {
            setIsCustomMode(true);
            setCustomText(currentVal);
          }}
          className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 rounded-md transition cursor-pointer"
          title="Modifica o scrivi settore personalizzato"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
