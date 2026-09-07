export type Tile = {
  id: string;
  letter: string;
};

export type Submission = {
  word: string;
  valid: boolean;
  revealed?: boolean;
};

export type GameSettings = {
  lengths: number[];
  revealTotal: boolean;
};

export type PersistedGame = {
  rack: Tile[];
  slots: Array<Tile | null>;
  submissions: Submission[];
  revealedWords?: string[];
  settings: GameSettings;
};
