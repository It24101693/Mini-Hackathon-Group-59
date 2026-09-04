import React, { useState, useEffect } from 'react';
import { DollarSign, Save, X, AlertCircle } from 'lucide-react';
import { SUPPORTED_CURRENCIES } from '../types';
import { dbService } from '../services/dbService';
import type { ExchangeRate } from '../services/dbService';

interface CurrencySettingsProps {
  onRatesUpdate: (rates: ExchangeRate[]) => void;
}

export const CurrencySettings: React.FC<CurrencySettingsProps> = ({ onRatesUpdate }) => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = dbService.getExchangeRates((fetchedRates) => {
      setRates(fetchedRates);
      onRatesUpdate(fetchedRates);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStartEdit = (currency: string, currentRate: number) => {
    setEditing(currency);
    setEditValue(String(currentRate));
    setMessage(null);
  };

  const handleSaveRate = async (currency: string) => {
    const newRate = parseFloat(editValue);
    if (isNaN(newRate) || newRate <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive number' });
      return;
    }

    try {
      await dbService.updateExchangeRate(currency, newRate);
      setMessage({ type: 'success', text: `Rate for ${currency} updated to ${newRate}` });
      setEditing(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update rate' });
    }
  };

  const getDefaultRate = (currency: string): number => {
    const defaults: Record<string, number> = {
      USD: 313,
      AUD: 200,
      LKR: 1,
      ZAR: 17,
      INR: 3.8,
      EUR: 340,
      GBP: 390
    };
    return defaults[currency] || 1;
  };

  if (loading) {
    return <div className="text-center py-8 text-muted">Loading exchange rates...</div>;
  }

  return (
    <div className="glass-card">
      <h3 className="mb-4 text-gold font-bold text-lg flex items-center gap-2" style={{ color: '#d4af37', fontFamily: 'var(--font-title)' }}>
        <DollarSign size={20} />
        Currency Exchange Rates (to LKR)
      </h3>

      {message && (
        <div className={`p-3 rounded mb-4 text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-success/10 text-success border border-success/30' : 'bg-orange-dim text-orange border border-orange'}`}>
          {message.type === 'success' ? <Save size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {SUPPORTED_CURRENCIES.map((curr) => {
          const rate = rates.find(r => r.currency === curr.code)?.rateToLKR || getDefaultRate(curr.code);
          const isEditing = editing === curr.code;

          return (
            <div key={curr.code} className="bg-input p-3 rounded border border-glass flex items-center justify-between gap-2">
              <div>
                <span className="font-bold text-white">{curr.symbol}</span>
                <span className="text-xs text-muted ml-1">{curr.code}</span>
                <span className="text-xs text-muted block">{curr.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      className="input-field py-1 px-2 text-sm w-20"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      step="0.01"
                    />
                    <button onClick={() => handleSaveRate(curr.code)} className="text-success hover:text-green-400">
                      <Save size={16} />
                    </button>
                    <button onClick={() => setEditing(null)} className="text-danger hover:text-red-400">
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-gold" style={{ color: '#d4af37' }}>
                      {rate.toFixed(2)}
                    </span>
                    <button onClick={() => handleStartEdit(curr.code, rate)} className="text-muted hover:text-white text-xs px-2 py-1 rounded border border-glass">
                      Edit
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-muted">
        * Rates are used to convert all deal values to LKR for financial reporting
      </div>
    </div>
  );
};