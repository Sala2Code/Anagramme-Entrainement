import { useEffect, useState } from 'react';
import { X, RotateCcw, Shuffle, RefreshCw, Eye } from 'lucide-react';
import type { GameSettings } from '../game/types';

export function SettingsModal({
  open,
  settings,
  onClose,
  onSave,
  onShuffle,
  onRestart,
  onNewRack,
  onReveal,
}: {
  open: boolean;
  settings: GameSettings;
  onClose: () => void;
  onSave: (settings: GameSettings) => void;
  onShuffle: () => void;
  onRestart: () => void;
  onNewRack: () => void;
  onReveal: (settings: GameSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => setDraft(settings), [settings, open]);
  if (!open) return null;

  const toggleLength = (length: number) => {
    setDraft((current) => {
      const exists = current.lengths.includes(length);
      let lengths = exists
        ? current.lengths.filter((value) => value !== length)
        : [...current.lengths, length].sort((a, b) => a - b);
      if (lengths.length === 0) lengths = [length];
      return { ...current, lengths };
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">PARTIE</div>
            <h2 id="settings-title">Paramètres</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">
            <X size={22} />
          </button>
        </div>

        <div className="settings-section">
          <h3>Longueurs recherchées</h3>
          <p>Choisis les tailles de mots qui comptent pour terminer la manche.</p>
          <div className="length-picker">
            {[2, 3, 4, 5, 6, 7].map((length) => (
              <button
                key={length}
                type="button"
                className={`length-chip ${draft.lengths.includes(length) ? 'length-chip--active' : ''}`}
                onClick={() => toggleLength(length)}
              >
                {length}
              </button>
            ))}
          </div>
        </div>

        <label className="switch-row">
          <span>
            <strong>Afficher le nombre total</strong>
            <small>Sinon le compteur restera sur « ?? ».</small>
          </span>
          <input
            type="checkbox"
            checked={draft.revealTotal}
            onChange={(event) => setDraft({ ...draft, revealTotal: event.target.checked })}
          />
        </label>

        <div className="settings-actions">
          <button type="button" className="secondary-action secondary-action--reveal" onClick={() => onReveal(draft)}>
            <Eye size={18} /> Révéler les mots restants
          </button>
          <button type="button" className="secondary-action" onClick={onShuffle}>
            <Shuffle size={18} /> Mélanger les lettres
          </button>
          <button type="button" className="secondary-action" onClick={onRestart}>
            <RotateCcw size={18} /> Recommencer ce tirage
          </button>
          <button type="button" className="secondary-action secondary-action--danger" onClick={onNewRack}>
            <RefreshCw size={18} /> Nouveau tirage
          </button>
        </div>

        <button
          type="button"
          className="primary-action primary-action--modal"
          onClick={() => {
            onSave(draft);
            onClose();
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
