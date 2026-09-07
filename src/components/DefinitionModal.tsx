import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import type { DefinitionResult } from '../services/wiktionary';

export function DefinitionModal({
  word,
  definition,
  loading,
  error,
  onClose,
}: {
  word: string | null;
  definition: DefinitionResult | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [word, definition]);
  if (!word) return null;

  const extract = definition?.extract ?? '';
  const isLong = extract.length > 900;
  const preview = extract.slice(0, 900);
  const displayedExtract = isLong && !expanded
    ? `${preview.slice(0, preview.lastIndexOf(' ') > 0 ? preview.lastIndexOf(' ') : preview.length)}…`
    : extract;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="definition-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="definition-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">WIKTIONNAIRE</div>
            <h2 id="definition-title">{word}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fermer">
            <X size={22} />
          </button>
        </div>

        <div className="definition-content" aria-live="polite" aria-busy={loading}>
          {loading ? <p>Recherche de la définition…</p> : null}
          {error ? <p>{error}</p> : null}
          {definition ? <p id="definition-extract">{displayedExtract}</p> : null}
        </div>

        {definition && isLong ? (
          <button
            className="secondary-action definition-expand"
            type="button"
            aria-expanded={expanded}
            aria-controls="definition-extract"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? 'Réduire' : 'Afficher la définition complète'}
          </button>
        ) : null}

        {definition ? (
          <a className="wiktionary-link" href={definition.pageUrl} target="_blank" rel="noreferrer">
            Voir la page complète <ExternalLink size={16} />
          </a>
        ) : null}
      </div>
    </div>
  );
}
