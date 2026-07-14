# Préparation MSIX de Plum3

Ce dossier est uniquement préparatoire. Aucun package MSIX ne doit être construit ou signé tant que Partner Center n’a pas fourni l’identité exacte et que les outils Microsoft officiels ne sont pas installés.

Valeurs obligatoires à remplacer dans le manifeste : identité du package, Publisher, version à quatre segments, `MinVersion` et `MaxVersionTested`.

Assets à préparer depuis la source officielle haute résolution, sans remplacer les originaux : `StoreLogo.png`, `Square44x44Logo.png` et `Square150x150Logo.png`, ainsi que toute taille supplémentaire demandée par Partner Center au moment de la soumission.

Le champ `À_REMPLACER_EXECUTABLE.exe` doit être remplacé par le nom technique réellement produit au moment de figer le package. Le nom technique actuel est conservé pour ne pas casser la compatibilité avant cette décision.

La première voie réellement testée pour Plum3 reste le MSI produit par Tauri.
