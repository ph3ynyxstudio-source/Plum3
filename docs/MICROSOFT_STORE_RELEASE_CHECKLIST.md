# Checklist Microsoft Store — Plum3

## Identité et package

- [ ] Réserver le nom **Plum3** dans Partner Center.
- [ ] Remplacer `À_REMPLACER_PACKAGE_IDENTITY` et `À_REMPLACER_PUBLISHER` par les valeurs exactes de Partner Center.
- [x] Confirmer le Publisher display name **Ph3yNyx.studio**. — Confirmé dans Partner Center; le champ MSI `Manufacturer` utilise exactement `Ph3yNyx.studio`.
- [x] Vérifier la version canonique dans `src-tauri/Cargo.toml` avec `npm run version:check`. — Vérifié : `0.1.0` cohérente.
- [ ] Construire le MSI x64 avec la configuration Store et WebView2 hors ligne. — Partiel : le MSI x64 standard est généré, mais la configuration Store hors ligne séparée n’a pas été exercée.
- [x] Fournir une vraie icône Windows `.ico` multirésolution issue de la source officielle. — Vérifié : 16, 24, 32, 48, 64, 128 et 256 px, 32 bits.
- [ ] Signer le MSI et ses exécutables avec un certificat accepté par Microsoft. — Vérifié non terminé : MSI et EXE `NotSigned`.
- [ ] Fournir une URL HTTPS versionnée dont le binaire ne change pas après soumission.
- [x] Vérifier les paramètres d’installation silencieuse. — MSI français installé avec `/qn`; code de sortie final `0`; installation dans `C:\Program Files\Plum3\`; raccourcis Bureau et menu Démarrer créés.
- [ ] Tester installation, lancement, fermeture et désinstallation sur une machine dédiée. — Partiel : installation silencieuse réussie, Plum3 installé lancé, désinstallation silencieuse réussie et application supprimée correctement; fermeture et validation sur machine dédiée à confirmer.
- [ ] Exécuter le Windows App Certification Kit et conserver son rapport.

## Offre commerciale

- [ ] Choisir les marchés.
- [ ] Définir gratuité ou prix.
- [ ] Choisir la catégorie.
- [ ] Compléter la classification d’âge.
- [ ] Fournir les propriétés du produit et notes de certification.
- [ ] Fournir des instructions simples aux testeurs : aucun compte requis, ouvrir ou créer un fichier `.md`/`.txt` local.

## Description française

**Courte :** Éditeur Markdown local-first pour écrire et conserver ses idées dans des fichiers locaux.

**Longue :** Plum3 est un éditeur Markdown léger conçu pour écrire, structurer et conserver ses idées sans compte. Les documents restent des fichiers Markdown ou texte locaux. L’interface propose des réglages de lecture, un mode concentration, un aperçu Markdown et des exports PDF et Word.

## English description

**Short:** A local-first Markdown editor for writing and preserving ideas in local files.

**Long:** Plum3 is a lightweight Markdown editor for writing, organizing, and preserving ideas without an account. Documents remain local Markdown or text files. The interface includes reading preferences, focus mode, Markdown preview, and PDF and Word export.

## Assets et fiche Store

- [x] Icône officielle carrée et transparente. — Vérifié : PNG officiel 704 × 704, RGBA avec transparence.
- [ ] Logos et tuiles aux dimensions exigées par Partner Center.
- [ ] Captures Aube et Nuit sans données personnelles ni chemins locaux.
- [ ] Coordonnées de soutien exactes.
- [ ] Site web, s’il est disponible. — L’URL `https://ph3ynyx.dev/` est configurée dans l’application, mais sa disponibilité publique n’a pas été vérifiée.
- [ ] URL de politique de confidentialité.
- [ ] Vérifier les exigences Microsoft Store et les données réellement traitées par Plum3 avant la soumission.

## Données et confidentialité

- Les documents ouverts et créés restent dans les emplacements locaux choisis par l’utilisateur.
- Les préférences, le brouillon de récupération et l’historique récent restent dans le stockage local de l’application.
- Aucun compte n’est requis.
- Aucune télémétrie et aucun suivi publicitaire ne sont intégrés.
- Aucun document n’est transmis par Plum3.
- [ ] Vérifier et publier une politique de confidentialité conforme aux exigences Store et aux juridictions ciblées.

## Contrôles finaux

- [x] `npm run lint`, `npm run test`, `npm run build`. — Vérifiés avec succès; 8 tests frontend réussis.
- [ ] `cargo fmt`, `cargo clippy`, `cargo test`, audit des dépendances. — Partiel : formatage, Clippy et 14 tests réussis; `cargo-audit` n’est pas installé.
- [ ] Tests clavier, contraste, mise à l’échelle et largeur minimale.
- [ ] Tests de documents 100 Ko, 500 Ko, 1 Mo et 10 000 lignes.
- [x] Tests PDF/DOCX avec structure Markdown complète et vérification de la source inchangée. — Vérifiés par les tests Rust réussis.
- [ ] Relecture des politiques Microsoft Store au jour de la soumission.

## Blocages actuels

- ~~Icône Windows `.ico` valide requise par le bundler WiX (le fichier existant de 70 octets n’est pas exploitable).~~ Résolu : ICO multirésolution validé et bundle WiX généré.
- ~~Identité Publisher Partner Center.~~ Résolu : `Ph3yNyx.studio` confirmé dans Partner Center et dans les métadonnées MSI.
- Certificat de signature.
- URL de soutien.
- URL de politique de confidentialité.
- URL HTTPS versionnée du MSI.
- Marchés, prix et classification d’âge.
- Captures Store définitives.

## État de validation

### Validé

- Version canonique `0.1.0` cohérente entre npm et Cargo (`npm run version:check`).
- Source officielle `assets/favicon-plum3.webp` carrée et transparente; `src-tauri/icons/icon.ico` est régénéré depuis ce WebP avec sept résolutions Windows, et `src-tauri/icons/icon.png` fournit à `window.set_icon` la même image dans le format décodé par Tauri à l’exécution.
- MSI x64 standard généré : `src-tauri/target/release/bundle/msi/Plum3_0.1.0_x64_en-US.msi`.
- Frontend : lint, typage, 8 tests et build de production réussis; `npm audit --omit=dev` ne signale aucune vulnérabilité.
- Rust : formatage conforme, Clippy sans avertissement et 14 tests réussis.
- Exports PDF/DOCX : structure Markdown complète et source inchangée couvertes par les tests Rust.
- Inspection statique : aucun compte obligatoire, aucune télémétrie ou publicité intégrée; documents, préférences, récupération et historique restent locaux.
- L’ouverture du site du studio est limitée à l’URL HTTPS statique `https://ph3ynyx.dev/` dans la capability Tauri.

### Terminé mais non vérifié

- Les descriptions française et anglaise sont rédigées, mais leur saisie dans Partner Center n’est pas vérifiable depuis le dépôt.
- La configuration MSI Store prévoit WebView2 hors ligne et les langues `fr-FR`/`en-US`, mais aucun build avec cette configuration séparée n’a été exécuté pendant cette passe.
- L’URL du site du studio est intégrée, mais sa disponibilité publique n’a pas pu être vérifiée pendant cette passe.

### Partiel

- Le modèle MSIX et sa documentation existent, mais conservent les valeurs Partner Center à remplacer et les assets Store à créer.
- Le MSI x64 standard est construit; la variante utilisant explicitement la configuration Store/WebView2 hors ligne reste à valider.
- Les contrôles Rust passent sauf l’audit de vulnérabilités Rust, impossible sans `cargo-audit`.
- Des générateurs de documents de performance existent, mais aucune preuve d’exécution des scénarios 100 Ko, 500 Ko, 1 Mo et 10 000 lignes n’a été trouvée.
- Les instructions destinées aux testeurs sont formulées dans cette checklist, mais leur ajout dans Partner Center n’est pas vérifié.
- Les données réellement traitées ont été inspectées statiquement; la conformité aux exigences Store et aux juridictions ciblées reste à confirmer avant soumission.

### Non commencé

- Logos et tuiles Partner Center (`StoreLogo.png`, `Square44x44Logo.png`, `Square150x150Logo.png`) absents.
- Captures Store Aube et Nuit absentes.
- Signature numérique absente du MSI et de l’exécutable.
- URL HTTPS versionnée du MSI, URL de soutien et URL de confidentialité absentes.
- Fermeture, validation sur machine dédiée et rapport WACK sans preuve; installation silencieuse, lancement de Plum3 installé, désinstallation silencieuse et suppression correcte de l’application validés.
- Tests manuels clavier, contraste, mise à l’échelle, largeur minimale et gros documents sans preuve.

### Bloqué

- Réservation du nom et Package Identity : valeurs ou confirmation Partner Center requises.
- Marchés, prix, catégorie, classification d’âge, propriétés du produit et notes de certification : décisions humaines requises.
- Signature : certificat accepté par Microsoft requis.
- Politique de confidentialité et URL de soutien : contenus et adresses à fournir puis publier.
- Installation sur machine dédiée et Windows App Certification Kit : environnement humain de validation requis.
- Audit Rust : `cargo-audit` absent et aucune installation autorisée pendant cette passe.
- Relecture des politiques Microsoft Store : contrôle à refaire au jour de la soumission.

### Non applicable

- Aucun élément n’a été classé non applicable pour cette publication.
