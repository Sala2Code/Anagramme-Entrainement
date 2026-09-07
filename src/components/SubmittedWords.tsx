import type { Submission } from '../game/types';

type Group = {
  length: number;
  words: Submission[];
};

function groupSubmissions(submissions: Submission[], lengths: number[]): Group[] {
  const allowed = new Set(lengths);
  const deduped = new Map<string, Submission>();
  for (const submission of submissions) {
    if (allowed.has(submission.word.length)) deduped.set(submission.word, submission);
  }

  const groups = new Map<number, Submission[]>();
  for (const submission of deduped.values()) {
    const bucket = groups.get(submission.word.length) ?? [];
    bucket.push(submission);
    groups.set(submission.word.length, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([length, words]) => ({
      length,
      words: words.sort((a, b) => a.word.localeCompare(b.word, 'fr')),
    }));
}

export function SubmittedWords({
  submissions,
  lengths,
  onValidWordClick,
}: {
  submissions: Submission[];
  lengths: number[];
  onValidWordClick: (word: string) => void;
}) {
  const groups = groupSubmissions(submissions, lengths);

  if (groups.length === 0) {
    return (
      <div className="empty-list">
        <span className="empty-list__big">À toi de jouer</span>
        <span>Les mots soumis apparaîtront ici.</span>
      </div>
    );
  }

  return (
    <div className="submitted-list">
      {groups.map((group) => (
        <section className="word-group" key={group.length}>
          <h2>{group.length} LETTRES</h2>
          <div className="word-group__items">
            {group.words.map((item) => (
              <button
                key={item.word}
                type="button"
                className={`submitted-word ${item.revealed ? 'submitted-word--revealed' : item.valid ? 'submitted-word--valid' : 'submitted-word--invalid'}`}
                onClick={() => item.valid && onValidWordClick(item.word)}
                disabled={!item.valid}
                title={item.revealed ? 'Mot révélé — voir la définition' : item.valid ? 'Voir la définition' : 'Mot non valide'}
                aria-label={item.revealed ? `${item.word}, mot révélé, voir la définition` : undefined}
              >
                <span>{item.word}</span>
                <span aria-hidden="true">{item.revealed ? '✦' : item.valid ? '✓' : '×'}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
