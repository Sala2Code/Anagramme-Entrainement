import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Check, Settings } from 'lucide-react';
import { Rack } from './components/Rack';
import { WordSlots } from './components/WordSlots';
import { SubmittedWords } from './components/SubmittedWords';
import { SettingsModal } from './components/SettingsModal';
import { DefinitionModal } from './components/DefinitionModal';
import { TileGhost } from './components/Tile';
import { loadDictionary, type DictionaryIndex } from './game/dictionary';
import { findSolutions } from './game/anagrams';
import { drawPlayableRack, shuffled } from './game/rack';
import { loadGame, saveGame } from './game/storage';
import type { GameSettings, Submission, Tile } from './game/types';
import { fetchDefinition, type DefinitionResult } from './services/wiktionary';
import './styles.css';

const DEFAULT_SETTINGS: GameSettings = {
  lengths: [2, 3, 4, 5, 6, 7],
  revealTotal: false,
};

function findTile(rack: Tile[], id: string): Tile | undefined {
  return rack.find((tile) => tile.id === id);
}

function wordFromSlots(slots: Array<Tile | null>): string {
  return slots.filter((tile): tile is Tile => tile !== null).map((tile) => tile.letter).join('');
}

export default function App() {
  const [dictionary, setDictionary] = useState<DictionaryIndex | null>(null);
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  const [rack, setRack] = useState<Tile[]>([]);
  const [slots, setSlots] = useState<Array<Tile | null>>(Array(7).fill(null));
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [revealedWords, setRevealedWords] = useState<string[]>([]);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTile, setActiveTile] = useState<Tile | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'good' | 'bad' | 'neutral' } | null>(null);

  const [definitionWord, setDefinitionWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<DefinitionResult | null>(null);
  const [definitionLoading, setDefinitionLoading] = useState(false);
  const [definitionError, setDefinitionError] = useState<string | null>(null);
  const definitionRequest = useRef(0);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  useEffect(() => {
    let cancelled = false;
    loadDictionary()
      .then((index) => {
        if (cancelled) return;
        setDictionary(index);
        const saved = loadGame();
        if (saved?.rack?.length === 7) {
          setRack(saved.rack);
          setSlots(saved.slots?.length === 7 ? saved.slots : Array(7).fill(null));
          setSubmissions(saved.submissions ?? []);
          setRevealedWords(saved.revealedWords ?? []);
          setSettings(saved.settings ?? DEFAULT_SETTINGS);
        } else {
          setRack(drawPlayableRack(index, DEFAULT_SETTINGS));
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setDictionaryError(error instanceof Error ? error.message : 'Erreur de dictionnaire.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dictionary || rack.length !== 7) return;
    saveGame({ rack, slots, submissions, revealedWords, settings });
  }, [dictionary, rack, slots, submissions, revealedWords, settings]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 1500);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const solutions = useMemo(() => {
    if (!dictionary || rack.length !== 7) return [];
    return findSolutions(rack, settings.lengths, dictionary);
  }, [dictionary, rack, settings.lengths]);

  const solutionSet = useMemo(() => new Set(solutions), [solutions]);
  const foundWords = useMemo(
    () => new Set(submissions.filter((item) => solutionSet.has(item.word)).map((item) => item.word)),
    [submissions, solutionSet],
  );

  const displaySubmissions = useMemo(
    () => [
      ...submissions.map((item) => ({ ...item, valid: solutionSet.has(item.word) })),
      ...revealedWords
        .filter((word) => solutionSet.has(word))
        .map((word) => ({ word, valid: true, revealed: true })),
    ],
    [submissions, solutionSet, revealedWords],
  );

  const completed = solutions.length > 0 && foundWords.size === solutions.length;
  const slottedIds = useMemo(
    () => new Set(slots.filter((tile): tile is Tile => tile !== null).map((tile) => tile.id)),
    [slots],
  );
  const visibleRack = rack.map((tile) => slottedIds.has(tile.id) ? null : tile);
  const currentWord = wordFromSlots(slots);

  const submitSlots = (candidateSlots: Array<Tile | null>) => {
    if (!dictionary) return;
    const word = wordFromSlots(candidateSlots);
    if (word.length < 2) {
      setFeedback({ text: 'Place au moins 2 lettres.', tone: 'neutral' });
      return;
    }

    if (revealedWords.includes(word)) {
      setFeedback({ text: `${word} a déjà été révélé.`, tone: 'neutral' });
      setSlots(Array(7).fill(null));
      return;
    }

    if (submissions.some((item) => item.word === word)) {
      setFeedback({ text: `${word} a déjà été soumis.`, tone: 'neutral' });
      setSlots(Array(7).fill(null));
      return;
    }

    const valid = solutionSet.has(word);
    setSubmissions((current) => [...current, { word, valid }]);
    setSlots(Array(7).fill(null));
    setFeedback({
      text: valid ? `${word} est valide !` : `${word} n’est pas valide pour cette manche.`,
      tone: valid ? 'good' : 'bad',
    });
  };

  const placeTileInFirstFreeSlot = (tile: Tile) => {
    const index = slots.findIndex((slot) => slot === null);
    if (index === -1) {
      submitSlots(slots);
      return;
    }
    const next = [...slots];
    next[index] = tile;
    setSlots(next);
    if (next.every(Boolean)) submitSlots(next);
  };

  const returnTileToRack = (tile: Tile) => {
    setSlots((current) => current.map((slot) => (slot?.id === tile.id ? null : slot)));
  };

  const onDragStart = (event: DragStartEvent) => {
    const tile = findTile(rack, String(event.active.id));
    setActiveTile(tile ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveTile(null);
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;

    const tile = findTile(rack, activeId);
    if (!tile) return;
    const sourceSlotIndex = slots.findIndex((slot) => slot?.id === activeId);
    const sourceIsSlot = sourceSlotIndex >= 0;

    if (overId.startsWith('slot-')) {
      const targetIndex = Number(overId.replace('slot-', ''));
      if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= 7) return;

      const next = [...slots];
      const targetTile = next[targetIndex];

      if (sourceIsSlot) {
        next[sourceSlotIndex] = targetTile;
        next[targetIndex] = tile;
      } else {
        if (targetTile) {
          const occupiedIndex = next.findIndex((slot) => slot?.id === targetTile.id);
          if (occupiedIndex >= 0) next[occupiedIndex] = null;
        }
        next[targetIndex] = tile;
      }

      setSlots(next);
      if (next.every(Boolean)) submitSlots(next);
      return;
    }

    const overRackIndex = rack.findIndex((rackTile) => rackTile.id === overId);
    if (overId === 'rack-container' || overRackIndex >= 0) {
      if (sourceIsSlot) {
        const nextSlots = [...slots];
        nextSlots[sourceSlotIndex] = null;
        setSlots(nextSlots);

        if (overRackIndex >= 0) {
          const oldIndex = rack.findIndex((rackTile) => rackTile.id === activeId);
          setRack((current) => arrayMove(current, oldIndex, overRackIndex));
        }
        return;
      }

      if (overRackIndex >= 0) {
        const oldIndex = rack.findIndex((rackTile) => rackTile.id === activeId);
        setRack((current) => arrayMove(current, oldIndex, overRackIndex));
      }
    }
  };

  const openDefinition = async (word: string) => {
    const requestId = ++definitionRequest.current;
    setDefinitionWord(word);
    setDefinition(null);
    setDefinitionError(null);
    setDefinitionLoading(true);
    try {
      const result = await fetchDefinition(word);
      if (requestId === definitionRequest.current) setDefinition(result);
    } catch (error) {
      if (requestId === definitionRequest.current) {
        setDefinitionError(error instanceof Error ? error.message : 'Impossible de charger la définition.');
      }
    } finally {
      if (requestId === definitionRequest.current) setDefinitionLoading(false);
    }
  };

  const restartRound = () => {
    setSlots(Array(7).fill(null));
    setSubmissions([]);
    setRevealedWords([]);
    setFeedback(null);
    setSettingsOpen(false);
  };

  const newRound = () => {
    if (!dictionary) return;
    setRack(drawPlayableRack(dictionary, settings));
    setSlots(Array(7).fill(null));
    setSubmissions([]);
    setRevealedWords([]);
    setFeedback(null);
    setSettingsOpen(false);
  };

  const shuffleRack = () => {
    setRack((current) => shuffled(current));
    setSlots(Array(7).fill(null));
    setSettingsOpen(false);
  };

  const revealRemainingWords = (nextSettings: GameSettings) => {
    if (!dictionary) return;
    const remaining = findSolutions(rack, nextSettings.lengths, dictionary)
      .filter((word) => !submissions.some((item) => item.word === word));
    setSettings(nextSettings);
    setRevealedWords((current) => [...new Set([...current, ...remaining])]);
    setSettingsOpen(false);
  };

  if (dictionaryError) {
    return (
      <main className="loading-screen">
        <div className="loading-card">
          <h1>Impossible de lancer le jeu</h1>
          <p>{dictionaryError}</p>
          <p>Vérifie que <code>public/dictionary.txt</code> est présent.</p>
        </div>
      </main>
    );
  }

  if (!dictionary || rack.length !== 7) {
    return (
      <main className="loading-screen">
        <div className="loading-card">
          <div className="loader" />
          <h1>Anagrammes</h1>
          <p>Préparation du dictionnaire…</p>
        </div>
      </main>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <main className="app-shell">
        <section className="game-card">
          <header className="topbar">
            <div>
              <div className="eyebrow">ENTRAÎNEMENT</div>
              <h1>Anagrammes</h1>
            </div>
            <button className="settings-button" type="button" onClick={() => setSettingsOpen(true)}>
              <Settings size={21} />
              <span>Paramètres</span>
            </button>
          </header>

          <div className="progress-row">
            <div className="progress-copy">
              <strong>{foundWords.size}</strong>
              <span>/</span>
              <strong>{settings.revealTotal ? solutions.length : '??'}</strong>
              <small>mots trouvés</small>
            </div>
            <div className="active-lengths">
              {settings.lengths.map((length) => (
                <span key={length}>{length}</span>
              ))}
            </div>
          </div>

          <div className="answers-panel">
            {displaySubmissions.some((item) => item.revealed) ? (
              <p className="revealed-note" role="status">Les mots révélés sont en violet et ne comptent pas comme trouvés.</p>
            ) : null}
            {completed ? (
              <div className="completion-banner">
                <span className="completion-icon"><Check size={20} /></span>
                <div>
                  <strong>Manche terminée !</strong>
                  <span>Tu as trouvé les {solutions.length} mots.</span>
                </div>
                <button type="button" onClick={newRound}>Nouveau tirage</button>
              </div>
            ) : null}
            <SubmittedWords submissions={displaySubmissions} lengths={settings.lengths} onValidWordClick={openDefinition} />
          </div>

          <section className="play-area">
            <div className="word-zone">
              <div className="word-zone__meta">
                <span>MOT EN COURS</span>
                <span>{currentWord.length}/7</span>
              </div>
              <WordSlots slots={slots} onTileClick={returnTileToRack} />
            </div>

            <div className="submit-wrap">
              <button
                type="button"
                className="primary-action"
                onClick={() => submitSlots(slots)}
                disabled={currentWord.length < 2}
              >
                Valider le mot
              </button>
              <div className={`feedback ${feedback ? `feedback--${feedback.tone}` : ''}`} aria-live="polite">
                {feedback?.text ?? 'Touchez une lettre pour la placer. Appui long pour la déplacer.'}
              </div>
            </div>

            <Rack rack={visibleRack} onTileClick={placeTileInFirstFreeSlot} />
          </section>
        </section>

        <footer className="app-footer">
          <span>{dictionary.count.toLocaleString('fr-FR')} mots chargés</span>
          <span>•</span>
          <span>Définitions : Wiktionnaire</span>
        </footer>
      </main>

      <SettingsModal
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={setSettings}
        onShuffle={shuffleRack}
        onRestart={restartRound}
        onNewRack={newRound}
        onReveal={revealRemainingWords}
      />

      <DefinitionModal
        word={definitionWord}
        definition={definition}
        loading={definitionLoading}
        error={definitionError}
        onClose={() => setDefinitionWord(null)}
      />

      <DragOverlay>{activeTile ? <TileGhost tile={activeTile} /> : null}</DragOverlay>
    </DndContext>
  );
}
