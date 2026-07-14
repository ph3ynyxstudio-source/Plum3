# Checklist Microsoft Store — Plum3

## Identité et package

- [ ] Réserver le nom **Plum3** dans Partner Center.
- [ ] Remplacer `À_REMPLACER_PACKAGE_IDENTITY` et `À_REMPLACER_PUBLISHER` par les valeurs exactes de Partner Center.
- [ ] Confirmer le Publisher display name **Ph3yNyx**.
- [ ] Vérifier la version canonique dans `src-tauri/Cargo.toml` avec `npm run version:check`.
- [ ] Construire le MSI x64 avec la configuration Store et WebView2 hors ligne.
- [ ] Fournir une vraie icône Windows `.ico` multirésolution issue de la source officielle. Le PNG officiel n’a pas été converti automatiquement afin de respecter la validation artistique.
- [ ] Signer le MSI et ses exécutables avec un certificat accepté par Microsoft.
- [ ] Fournir une URL HTTPS versionnée dont le binaire ne change pas après soumission.
- [ ] Vérifier les paramètres d’installation silencieuse.
- [ ] Tester installation, lancement, fermeture et désinstallation sur une machine dédiée.
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

- [ ] Icône officielle carrée et transparente.
- [ ] Logos et tuiles aux dimensions exigées par Partner Center.
- [ ] Captures Aube et Nuit sans données personnelles ni chemins locaux.
- [ ] Coordonnées de soutien exactes.
- [ ] Site web, s’il est disponible.
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

- [ ] `npm run lint`, `npm run test`, `npm run build`.
- [ ] `cargo fmt`, `cargo clippy`, `cargo test`, audit des dépendances.
- [ ] Tests clavier, contraste, mise à l’échelle et largeur minimale.
- [ ] Tests de documents 100 Ko, 500 Ko, 1 Mo et 10 000 lignes.
- [ ] Tests PDF/DOCX avec structure Markdown complète et vérification de la source inchangée.
- [ ] Relecture des politiques Microsoft Store au jour de la soumission.

## Blocages actuels

- Icône Windows `.ico` valide requise par le bundler WiX (le fichier existant de 70 octets n’est pas exploitable).
- Identité Publisher Partner Center.
- Certificat de signature.
- URL de soutien.
- URL de politique de confidentialité.
- URL HTTPS versionnée du MSI.
- Marchés, prix et classification d’âge.
- Captures Store définitives.
