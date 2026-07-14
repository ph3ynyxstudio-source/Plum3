# Réglages d’écriture

## Rôle

Les réglages d’écriture adaptent uniquement l’affichage de l’éditeur. Ils ne
modifient jamais le contenu Markdown, le chemin du document ou son état de
sauvegarde.

Ils sont accessibles uniquement depuis la colonne de personnalisation située à
droite du document. Le bouton de menu en haut à droite ouvre ou ferme cette
colonne, y compris lorsque la fenêtre est étroite.

## Réglages disponibles

- typographie parmi une bibliothèque intégrée de 15 choix, présentée dans un
  menu déroulant catégorisé ;
- taille du texte de 14 à 28 px, avec 18 px par défaut ;
- interligne de 1,4 à 2,0, avec 1,7 par défaut ;
- largeur de lecture étroite, moyenne, large ou très large ;
- palettes officielles adaptées séparément aux thèmes Aube et Nuit, présentées
  sous forme de pastilles de couleur ;
- aperçu immédiat directement dans le document ouvert ;
- réinitialisation complète après confirmation.

## Bibliothèque typographique

Plum3 propose une sélection fermée, organisée selon cinq usages :
Narration, Manuscrit, Documentation, Développement et Composition. Cette
approche évite une liste instable de toutes les polices installées sur Windows
et conserve des choix lisibles, cohérents et faciles à retrouver.

Chaque choix possède une pile de repli adaptée à sa famille. Plum3 vérifie dans
WebView2 si la police nommée est réellement rendue, puis affiche soit
**Disponible**, soit **Repli : nom de la police**. Lorsqu’une police manque, la
carte et l’aperçu utilisent explicitement ce repli au lieu de laisser le moteur
choisir silencieusement une police générique.

Les replis sont volontairement différenciés entre les trois choix d’une même
catégorie : Georgia, Cambria et Constantia pour Narration ; Cambria, Palatino
Linotype et Georgia pour Manuscrit ; Segoe UI, Arial et Verdana pour
Documentation ; Cascadia Code, Consolas et Courier New pour Développement ;
Trebuchet MS, Calibri et Arial pour Composition. Les fichiers de polices ne sont
pas encore distribués avec l’application.

## Stockage local

Les préférences sont enregistrées dans le stockage local de WebView2 sous une
clé versionnée. Elles sont restaurées au lancement indépendamment des documents.
Une valeur absente ou invalide est remplacée par sa valeur par défaut.

Les palettes Aube et Nuit sont mémorisées séparément afin qu’un changement de
thème ne remplace pas le choix effectué dans l’autre thème.

## Inspecteur unique

La colonne de droite est l’unique inspecteur visuel du document. Il n’existe
plus de fenêtre dédiée ni de menu rapide « Aa ». Les réglages sont appliqués dès
leur modification afin de poursuivre l’écriture sans changer de contexte.

## Réglages d’affichage

La carte **Affichage** mémorise séparément la visibilité du compteur de mots,
du compteur de caractères et du nombre de lignes. Ces options ne changent pas
le contenu du document : elles contrôlent uniquement les informations visibles
dans la barre d’état.

L’option **Aperçu Markdown** remplace temporairement la zone d’édition par une
vue de lecture. Elle interprète les titres, paragraphes, listes, citations,
séparateurs, blocs de code et quelques styles en ligne courants. Désactiver
l’aperçu restaure immédiatement l’éditeur et son contenu d’origine.

## Mode concentration

Le mode concentration masque temporairement la bibliothèque, la colonne de
personnalisation et la barre supérieure afin de laisser le document occuper la
fenêtre. Un bouton de sortie reste visible en haut à droite et la touche Échap
restaure également l’interface normale.

Le titre central masque visuellement le suffixe `.md`, mais le nom réel du
fichier, son extension et son format de sauvegarde restent inchangés.

## Valeurs par défaut

- Literata ;
- 18 px ;
- interligne 1,7 ;
- largeur moyenne ;
- Classique dans Nuit ;
- Anthracite dans Aube.

## Limites actuelles

- aucune synchronisation entre appareils ;
- aucune préférence liée à un document particulier ;
- la disponibilité est détectée par le rendu WebView2, sans parcourir ni
  exposer la liste complète des polices Windows ;
- aucun fichier de police téléchargé ou embarqué dans cette phase.
