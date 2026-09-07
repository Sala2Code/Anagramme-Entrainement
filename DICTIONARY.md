# Remplacer le dictionnaire

Le moteur accepte un fichier texte simple avec **un mot par ligne**.

## Format conseillé

```text
AIMER
MAIRE
RAMIE
TAIE
TRAITE
```

Les accents et la casse ne sont pas obligatoires : le script de construction normalise les entrées.

## Construction

```bash
npm run dictionary:build
```

Entrée par défaut : `dictionary-source.txt`  
Sortie : `public/dictionary.txt`

Pour une autre entrée :

```bash
node scripts/build-dictionary.mjs /chemin/vers/mon-lexique.txt
```

