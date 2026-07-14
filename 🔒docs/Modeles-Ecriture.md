# Modèles d’écriture

## Rôle

Les modèles d’écriture créent un nouveau document adapté à un type de projet.
Ils fournissent uniquement des titres et des sections en Markdown standard. Le
contenu obtenu reste entièrement modifiable et suit ensuite le fonctionnement
normal du document actif.

Un modèle ne verrouille aucune section, ne crée aucun lien entre documents et
n’ajoute aucune structure propriétaire. Il n’utilise aucune IA et ne produit
aucun texte à la place de l’utilisateur. Le modèle de chanson, notamment, ne
génère aucune parole.

## Accès et création

L’assistant est accessible depuis **Nouvelle plume**, le raccourci `Ctrl+N`, les
accès rapides de la section **Modèles d’écriture** et l’action **Voir tous les
modèles**.

Après sélection, la création réutilise la confirmation existante si le document
actif contient des modifications non enregistrées. Le nouveau document :

- ne possède aucun chemin avant sa première sauvegarde ;
- porte un nom temporaire se terminant par `.md` ;
- est marqué comme modifié lorsqu’un modèle contient du texte ;
- reste compatible avec **Enregistrer** et **Enregistrer sous**.

Le genre est facultatif pour Roman, Nouvelle, Scénario, Webtoon et Plan narratif.
Il préremplit seulement la section Markdown « Genre » et n’a aucun autre effet.

## Modèles disponibles

- Général : Document vide.
- Écriture narrative : Roman, Nouvelle, Scénario, Webtoon, Plan narratif.
- Composition : Composition de chanson.
- Publication : Publication réseau social.
- Univers et worldbuilding : Univers / Worldbuilding, Fiche personnage, Lieu,
  Région, Objet, Organisation, Technologie, Créature et Événement historique.

## Limites actuelles

Les modèles ne fournissent ni aperçu Markdown, ni sauvegarde automatique, ni
récupération de brouillon, ni système de projet. Ils ne génèrent pas de contenu,
ne suggèrent pas de formulations et n’interprètent pas les sections créées.

## Brouillon de récupération à la fermeture

Lorsqu’un document modifié est fermé avec l’action **Fermer sans enregistrer**,
Plum3 conserve localement une copie de récupération. Au prochain
démarrage, son contenu est rouvert automatiquement comme document sans chemin,
avec un titre commençant par « Brouillon récupéré ». Le fichier d’origine n’est
jamais modifié par cette récupération.

Le brouillon est supprimé après une sauvegarde réussie, l’ouverture volontaire
d’un autre fichier ou la création volontaire d’un nouveau document. Si le
stockage local du brouillon échoue, la fermeture est annulée afin de ne pas
perdre le texte.

## Format

Chaque résultat est du texte Markdown portable. Une sauvegarde produit un simple
fichier `.md`, lisible dans tout éditeur compatible, sans métadonnée propre à
Plum3.

## Vérifications de la phase

Les commandes de référence sont :

```powershell
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Résultats du 12 juillet 2026 :

- `npm run build` : réussi ;
- `cargo test --manifest-path src-tauri/Cargo.toml` : 5 tests réussis, dont
  l’écriture et la relecture exacte d’un contenu Markdown généré ;
- ouverture depuis Nouvelle plume et `Ctrl+N` : réussie ;
- créations Document vide, Roman, Nouvelle, Composition de chanson,
  Publication réseau social, Fiche personnage et Univers / Worldbuilding :
  réussies ;
- création d’un Roman avec genre Fantasy et d’une Nouvelle sans genre : réussie ;
- confirmation avant remplacement d’un document modifié : réussie ;
- affichage de l’assistant en Aube et Nuit à 390 × 800 : réussi, sans
  débordement horizontal interne ;
- ouverture et affichage de l’assistant dans l’application Tauri : réussis ;
- fermeture par le bouton `X`, création du brouillon, disparition effective du
  processus, relance Tauri et restauration exacte du contenu : réussies ;
- enregistrement réel d’un contenu Markdown dans un fichier `.md`, puis relecture
  exacte du contenu : réussi par le test Rust ;
- parcours visuel complet du dialogue natif **Enregistrer sous** : validation
  humaine restante, car le contrôle automatisé de la fenêtre Tauri a été
  interrompu par une interaction utilisateur avant l’ouverture de ce dialogue.
