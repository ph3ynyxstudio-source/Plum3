# Modèle local de documents

## Portée

Cette phase fournit les opérations de base sur un seul document actif :

- nouveau document;
- ouverture explicite d’un fichier `.md` ou `.txt`;
- modification du contenu texte;
- enregistrer;
- enregistrer sous;
- confirmation avant fermeture, nouveau document ou ouverture si le contenu est modifié.

L’éditeur Markdown avancé, les documents récents, la sauvegarde automatique, les
styles d’écriture, Android et la synchronisation ne font pas partie de cette phase.

## Séparation des responsabilités

- `src/documents/document-state.ts` conserve l’état réel du document actif.
- `src/documents/document-controller.ts` orchestre l’interface et les confirmations.
- `src/services/file-service.ts` adapte les commandes Tauri typées.
- `src-tauri/src/file_commands.rs` limite et exécute les accès disque.

## Sécurité des fichiers

La couche Rust maintient en mémoire les chemins autorisés. Un chemin devient
accessible uniquement après sa sélection dans un dialogue natif Ouvrir ou
Enregistrer sous. Cette autorisation disparaît au redémarrage.

Les écritures refusent :

- les extensions autres que `.md` et `.txt`;
- les chemins non sélectionnés;
- le remplacement d’un fichier existant sans confirmation;
- l’écrasement d’un fichier modifié à l’extérieur sans confirmation.

La version d’un fichier combine date de modification, taille et empreinte du
contenu. L’empreinte traverse l’interface Rust/JavaScript sous forme de chaîne
hexadécimale afin d’éviter toute perte de précision.

## Vérité des données

Les compteurs proviennent du contenu actif. Le nom, le statut, le format et
l’heure de sauvegarde proviennent du modèle réel. Les fonctionnalités non encore
disponibles affichent un état vide explicite et aucune donnée de démonstration.
