# Architecture frontend initiale

## Portée de cette phase

Cette base implémente uniquement le shell visuel PC de Plum3 :

- barre supérieure;
- bibliothèque repliable à gauche;
- surface d’écriture centrale de démonstration;
- réglages repliables à droite;
- barre d’état;
- thèmes Aube et Nuit.

Les commandes d’édition, la gestion de fichiers, la sauvegarde, la récupération
de brouillons, Android et la synchronisation Wi-Fi restent volontairement hors
de cette phase.

## Structure

```text
src/
|- components/
|  `- app-shell.ts       Composition du shell PC
|- data/
|  `- shell-content.ts   Contenu de démonstration isolé
|- theme/
|  `- theme.ts           Sélection et persistance du thème
|- ui/
|  `- icons.ts           Icônes SVG réutilisables
|- styles/
|  |- tokens.css         Couleurs, surfaces, espacements et mouvements
|  |- base.css           Normalisation et règles globales
|  |- shell.css          Composition et composants du shell
|  `- responsive.css     Ajustements des fenêtres PC plus étroites
|- main.ts               Initialisation et interactions du shell
`- styles.css            Point d’entrée des styles
```

## Tokens communs

Les deux thèmes utilisent les mêmes rôles sémantiques : arrière-plan de
l’application, panneaux, surface de l’éditeur, texte principal et secondaire,
bordures, accent principal, accent secondaire, cyan, succès et sélection.

- **Nuit** : bleu nuit, éditeur bleu-gris sombre, cyan, violet et rose.
- **Aube** : bleu gris clair, surfaces bleutées pâles, orange doux et bleu.

Cette séparation permettra à Android de reprendre la même identité sans copier
la composition desktop.

## Interactions présentes

- choix Aube/Nuit avec préférence locale;
- repli et restauration des panneaux gauche et droit;
- commutateurs d’affichage purement visuels;
- défilement indépendant de la bibliothèque, de l’éditeur et des réglages.

## Limites connues

- la plume est encore un symbole système temporaire, pas l’actif cristallin final;
- les icônes et espacements ne sont pas encore ajustés pixel par pixel;
- les contrôles de formatage et réglages ne modifient pas encore le document;
- les petites fenêtres PC utilisent le défilement pour préserver la lisibilité;
- la composition Android n’est pas implémentée dans cette phase.
