
# Checklist de publication Google Play — Plum3

Dernière vérification : **22 juillet 2026 à 14 h 01 (heure de Toronto)**

Cette checklist concerne la future publication de **Plum3 Free** sur Google Play.
Elle ne remplace pas les règles officielles de Google Play, qui peuvent évoluer.

## Légende

- [x] Vérifié dans le dépôt actuel.
- [ ] À faire ou à confirmer avant publication.

## État actuel

- [x] Nom de l’application : `Plum3`.
- [x] Identifiant Android : `os.ph3ynyx.plum3`.
- [x] Version actuelle du projet : `1.0.0`.
- [x] `minSdk = 24` — Android 7.0 minimum.
- [x] `compileSdk = 36`.
- [x] `targetSdk = 36`.
- [x] APK ARM64 debug généré et installé sur un appareil réel.
- [x] APK ARM64 release signé généré, installé par-dessus la version
  existante et lancé sur le Nothing Phone A059 sans effacer les données locales.
- [x] AAB ARM64 release signé généré et vérifié.
- [x] Icône adaptative Android intégrée avec calques de fond, premier plan et
  monochrome.
- [x] Icône ronde déclarée dans le manifeste Android.
- [x] Cadrage final de l’icône dézoomée validé sur le Nothing Phone.
- [x] Politique de confidentialité accessible dans l’application :
  `https://ph3ynyx.dev/plum3/privacy/`.
- [x] Aucun compte, aucune publicité et aucune télémétrie déclarés dans
  l’interface actuelle.
- [x] `keystore.properties` et `key.properties` sont ignorés par Git dans le
  projet Android généré.
- [x] Le brouillon local actuel a été récupéré avec succès sur le Nothing Phone
  après fermeture normale, forçage d’arrêt, redémarrage complet du téléphone
  et installation d’un nouvel APK par-dessus l’application existante.
- [ ] Plum3 n’est pas encore prêt pour une soumission Google Play.

> Plum3 cible déjà Android 16/API 36 et satisfait donc l’exigence annoncée
> pour les nouvelles applications et mises à jour à partir du 31 août 2026.
> La compatibilité fonctionnelle avec l’API 36 doit néanmoins être testée.

## 1. Terminer le produit Android

- [x] Terminer et valider l’Étape 2 de la roadmap Android.
- [x] Retirer ou neutraliser toute action mobile qui appelle une fonction
  indisponible, notamment « Ouvrir un document ».
- [x] Implémenter la bibliothèque locale Android fiable.
- [x] Vérifier l’autosauvegarde, le redémarrage et le passage en arrière-plan.
- [x] Permettre le partage individuel d’un véritable fichier Markdown.
- [x] Afficher clairement que la désinstallation supprime la bibliothèque
  privée locale.
- [x] Conserver chaque format d’export désactivé tant qu’il ne fonctionne pas
  réellement : DOCX est maintenant validé; PDF reste désactivé sur Android.
- [ ] Ne mentionner dans la fiche Play Store aucune fonction encore absente.
- [x] Tester Aube et Nuit sans zoom et sans chevauchement avec les barres système.
- [x] Tester le bouton Retour Android dans chaque vue, tiroir, modale et mode
  concentration.
- [x] Tester l’application hors ligne.

### Audit Android et persistance actuelle — 17 juillet 2026

- [x] Audit en lecture seule du stockage Android terminé.
- [x] L’état Git est demeuré propre et aucun commit n’a été créé pendant l’audit.
- [x] Validations réussies : lint, typecheck, contrôle de version, 33 tests
  frontend, build frontend, 14 tests Rust et `git diff --check`.
- [x] Le brouillon unique actuel survit à un forçage d’arrêt.
- [x] Le brouillon unique actuel survit à un redémarrage complet du téléphone.
- [x] Le brouillon unique actuel survit à l’installation d’un nouvel APK par-dessus
  la version existante, sans désinstallation.
- [x] La bibliothèque multi-documents, son autosauvegarde et sa persistance ont été validées sur le Nothing Phone après arrêt forcé, redémarrage, mise à jour de sécurité Android et installation d’un nouvel APK par-dessus l’application existante.

Limite restante : une mise à jour de Plum3 distribuée par Google Play devra encore être testée séparément.

### Partage Markdown natif — 17 juillet 2026

- [x] Une action « Partager en Markdown » est visible uniquement sur Android.
- [x] Le partage crée un véritable fichier `.md` UTF-8 contenant le nom et le
  contenu actuels du document, sans modifier le document source.
- [x] Le fichier temporaire est créé dans le cache privé
  `cache/markdown-shares/`, puis transmis par `ACTION_SEND` avec le type
  `text/markdown` et une URI `content://` accordée en lecture seulement.
- [x] Le `FileProvider` n’expose plus le stockage externe ni la racine du cache :
  seul `markdown-shares/` est déclaré.
- [x] Validation sur le Nothing Phone : APK ARM64 debug installé, bouton visible,
  parcours de partage Android déclenché et fichier
  `Brouillon récupéré - Scénario.md` vérifié dans le cache privé avec les
  113 lignes Markdown attendues.
- [x] DOCX a été activé uniquement après validation native; PDF reste désactivé
  sur Android. Le comportement Windows demeure inchangé et couvert par les tests.
- [x] L’interface Android ne présente plus de bouton ni de message concernant
  l’export PDF; elle décrit uniquement la copie DOCX disponible. Windows conserve
  ses choix PDF et DOCX.
- [x] Avec l’APK local/debug, le véritable fichier Markdown a été partagé vers
  plusieurs applications compatibles sur le Nothing Phone.
- [x] Les actions « Partager en Markdown » et « Exporter le document » sont
  correctement alignées visuellement sur le Nothing Phone.

### Export DOCX Android natif — 20 juillet 2026

- [x] `docx-rs` génère la copie hors ligne dans le cache privé
  `cache/document-exports/`.
- [x] Le plugin Kotlin ouvre `ACTION_CREATE_DOCUMENT` avec le type MIME DOCX
  officiel et copie le fichier vers l’emplacement choisi sans permission générale
  de stockage.
- [x] La copie temporaire est supprimée après réussite ou annulation; aucun fichier
  résiduel n’a été trouvé dans `cache/document-exports/`.
- [x] Validation sur le Nothing Phone A059 : `Scénario de test.docx` enregistré
  dans Téléchargements, 29 221 octets, signature ZIP `504B`, 18 entrées et
  `word/document.xml` présent.
- [x] Après l’enregistrement, Plum3 indique que la copie est indépendante de la
  bibliothèque et propose « Fermer » ou « Partager ».
- [x] La feuille Android reçoit le véritable fichier DOCX avec son nom et propose
  plusieurs applications compatibles.
- [x] L’annulation par le bouton Retour revient dans Plum3 sans erreur fatale et
  sans fichier temporaire résiduel.
- [x] Le dernier APK a été installé avec `adb install -r`; les quatre documents
  Markdown et l’index de la bibliothèque sont demeurés présents.
- [x] Le DOCX exporté a été ouvert dans Google Docs sur mobile; sa mise en forme
  a été confirmée visuellement comme lisible et fonctionnelle.
- [x] Transfert complet d’un DOCX vers `Ph3yNyx-os` confirmé par l’utilisateur
  après reconnexion de la destination Microsoft.
- [x] La tentative de compilation ARM64 de `printpdf 0.9.1` échoue dans
  `azul-core 0.0.7`; aucun autre moteur n’a été ajouté et PDF reste désactivé sur
  Android.

> Validation de bout en bout acquise avec l’APK local/debug sur le Nothing Phone :
> génération DOCX, enregistrement par le sélecteur Android, ouverture dans Google
> Docs, contrôle visuel, partage du véritable fichier, transfert vers
> `Ph3yNyx-os`, annulation sans erreur, nettoyage des fichiers temporaires et
> conservation des quatre documents après `adb install -r`.

> Conclusion actualisée : l’Étape 2 est **validée**. « Ouvrir un document », les
> documents récents et `Ctrl+O` sont neutralisés dans le code Android sans modifier
> Windows. L’absence de ces actions et le parcours Retour éditeur → bibliothèque →
> lanceur ont été confirmés sur le Nothing Phone.

### Finalisation des actions mobiles — 17 juillet 2026

- [x] La section « Ouvrir un document » et les documents récents est masquée
  uniquement sur Android.
- [x] Les appels d’ouverture, de documents récents et d’autosauvegarde vers un
  fichier sont bloqués dans le contrôleur Android.
- [x] `Ctrl+O` ne déclenche aucune commande native sur Android.
- [x] Le comportement d’ouverture Windows est conservé par un test dédié.
- [x] Un contrôleur unique gère la priorité du bouton Retour Android pour les
  dialogues, modèles, paramètres, renommage, panneaux mobiles et mode concentration.
- [x] Validations automatisées réussies : lint, typecheck, 45 tests frontend,
  build frontend, manifeste ARM64 et assemblage de l’APK ARM64 debug.
- [x] Les thèmes Aube et Nuit ainsi que le mode concentration ont été confirmés
  sur le Nothing Phone par l’utilisateur.
- [x] Installer ce nouvel APK et valider physiquement le bouton Retour ainsi que
  l’absence des actions d’ouverture sur le Nothing Phone.

> Validation physique du 19 juillet 2026 sur Nothing Phone A059 : APK ARM64 debug
> installé avec `adb install -r` sans désinstallation ni effacement de la bibliothèque.
> Le premier Retour depuis l’éditeur ouvre la bibliothèque; le second Retour depuis
> la bibliothèque ferme l’activité et revient au lanceur Nothing. L’écran Bibliothèque
> ne présente aucune action « Ouvrir un document ».

### Validation finale de l’interface Android — 22 juillet 2026

- [x] Les corrections d’interface ont été validées sur Pixel Tablet dans
  l’émulateur Android Studio, en portrait et en paysage.
- [x] L’interface Android reste active sur téléphone et tablette sans reprendre
  les comportements Desktop ou Windows.
- [x] L’action « Ouvrir un document » n’est plus présentée sur Android et la
  navigation du panneau gauche fonctionne de nouveau.
- [x] La bibliothèque locale reste accessible en portrait et en paysage.
- [x] La barre supérieure respecte la barre système Android et ses boutons ne
  sont plus masqués par l’heure, le réseau ou la batterie.
- [x] L’action Android « Exporter » propose Markdown et DOCX; « Enregistrer
  sous » n’est plus affiché sur Android.
- [x] Le panneau « Réglages d’écriture » utilise toute la largeur disponible,
  sans colonne de titre redondante, et son en-tête reste opaque au défilement.
- [x] Les boutons Aube et Nuit restent côte à côte sur Android.
- [x] Le dégradé mobile du panneau gauche est conservé sur Pixel Tablet.
- [x] Toutes les anomalies d’interface Android signalées le 21 juillet 2026 sont
  considérées corrigées après la validation visuelle de l’utilisateur.

## 2. Compte développeur et identité

- [x] Compte Google Play Console créé et vérifié.
- [x] Vérification d’identité du développeur Android terminée.
- [x] Nom public du développeur confirmé : `Ph3yNyx.Studio`.
- [x] Adresse courriel de soutien publique choisie :
  `phey.rainville@hotmail.com`.
- [x] Site officiel confirmé : `https://ph3ynyx.dev/`.
- [ ] Accepter ou confirmer les règles du programme développeur et les conditions
  de Play App Signing au moment de la première release.
- [x] Type et date du compte vérifiés : compte personnel créé le 15 mars 2026.
- [x] Exigence de test fermé identifiée pour ce compte personnel créé après le
  13 novembre 2023 : prévoir au moins 12 testeurs inscrits continuellement
  pendant 14 jours avant de demander l’accès à la production.
- [ ] Recruter idéalement 15 à 18 personnes afin qu’un désistement ne fasse pas
  retomber le nombre de testeurs actifs sous 12.

## 3. Identité technique et version

- [x] Confirmer que `os.ph3ynyx.plum3` est identique dans Tauri, Gradle et le
  manifeste généré.
- [ ] Vérifier définitivement l’identifiant avant le premier téléversement :
  il ne pourra pas être changé pour les mises à jour de la même application.
- [x] Définir explicitement le `versionCode` Android de la première version : `1`.
- [x] Confirmer le `versionName` public : `1.0.0`.
- [ ] Documenter la règle d’incrémentation du `versionCode`.
- [ ] Incrémenter le `versionCode` à chaque AAB téléversé, même pour les pistes
  de test.
- [x] Vérifier que toutes les architectures natives publiées comprennent
  `arm64-v8a`.
- [x] Limiter la publication initiale à `arm64-v8a`.
- [ ] Réévaluer `armeabi-v7a` seulement après la première publication si un
  besoin utilisateur réel le justifie.

## 4. Manifeste, appareils et permissions

- [ ] Auditer `android.permission.INTERNET`.
- [ ] La conserver uniquement pour les liens externes ou fonctions réseau
  réellement utilisés.
- [ ] Confirmer qu’aucun document ni contenu utilisateur n’est transmis.
- [ ] Vérifier que le build release conserve `usesCleartextTraffic=false`.
- [x] Restreindre le `FileProvider` : aucun `<external-path>` ni chemin racine
  du cache n’est exposé.
- [x] N’exposer que le sous-dossier temporaire `markdown-shares/` nécessaire au
  partage Markdown.
- [x] Vérifier les comportements portrait, paysage et redimensionnement.
- [x] Vérifier l’affichage sur téléphone, tablette et grand écran.
- [ ] Vérifier qu’aucune permission sensible inutile n’est demandée.
- [ ] Vérifier les liens externes, le courriel de soutien et la politique de
  confidentialité sur un build release.

### Icône du lanceur Android

- [x] Sources Android regroupées dans `assets/android-icons/`.
- [x] Fond adaptatif officiel intégré.
- [x] Plume officielle transparente intégrée comme premier plan.
- [x] Calque monochrome intégré pour les icônes thématiques Android 13 et plus.
- [x] Ressources adaptatives ajoutées pour Android 8/API 26 et plus.
- [x] Ressources avec calque monochrome ajoutées pour Android 13/API 33 et plus.
- [x] `android:roundIcon` configuré.
- [x] Recul appliqué aux calques Android sans modifier les assets maîtres :
  plume couleur et monochrome à `18 %`, fond à `8 %`.
- [x] APK ARM64 debug reconstruit et installé avec succès sur le Nothing Phone.
- [x] Taille de la plume et du fond validée visuellement avec l’icône normale
  sur le Nothing Phone.
- [ ] Confirmer visuellement la taille de la plume avec l’icône thématique.
- [ ] Vérifier les formes d’icônes ronde, carrée arrondie et personnalisée
  proposées par Nothing OS.
- [ ] Vérifier que l’icône ne présente aucun bord vide ou carré blanc.
- [ ] Préparer séparément l’icône Google Play `512 × 512` ; l’icône adaptative
  du lanceur ne remplace pas cet asset de fiche.

## 5. Confidentialité et sécurité des données

- [ ] Refaire un audit de confidentialité sur le build destiné à Google Play.
- [ ] Inventorier le comportement de toutes les dépendances et tous les SDK.
- [ ] Confirmer si des données sont collectées, transmises ou partagées.
- [ ] Remplir le formulaire **Sécurité des données** selon le comportement réel,
  et non uniquement selon les intentions du projet.
- [ ] Déclarer correctement le stockage local des documents et préférences.
- [ ] Vérifier que la politique explique le stockage privé Android et l’effet
  d’une désinstallation.
- [ ] Vérifier que la politique publiée correspond exactement à la version
  Android distribuée.
- [ ] Confirmer l’absence de compte utilisateur.
- [ ] Si aucun compte ne peut être créé, indiquer que la suppression de compte
  ne s’applique pas.
- [ ] Si un compte est ajouté plus tard, fournir une suppression dans
  l’application et une page Web de demande de suppression.
- [ ] Confirmer l’absence de publicité.
- [ ] Confirmer l’absence de suivi publicitaire et de télémétrie.
- [ ] Vérifier qu’aucun secret, mot de passe ou keystore n’est suivi par Git.

## 6. Signature Android

- [x] Créer une clé d’envoi Android dédiée à Plum3.
- [x] Conserver le keystore hors du dépôt.
- [ ] Confirmer sa sauvegarde sécurisée sur un second emplacement.
- [x] Ne jamais inscrire un mot de passe de signature dans Git.
- [x] Créer localement `src-tauri/gen/android/keystore.properties`.
- [x] Vérifier que Gradle applique la configuration de signature au build
  `release`.
- [ ] Activer Play App Signing lors de la première release.
- [ ] Sauvegarder le certificat public de la clé d’envoi.
- [ ] Documenter la procédure de récupération ou de réinitialisation de la clé
  d’envoi.
- [x] Vérifier la signature de l’AAB final.

Exemple de création de clé d’envoi, à exécuter seulement au moment choisi :

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" `
  -genkeypair -v `
  -keystore "CHEMIN_PRIVE\plum3-upload-keystore.jks" `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -alias upload
```

Ne pas placer le mot de passe ou le chemin privé réel dans cette checklist.

## 7. AAB release et taille

- [x] Générer un **Android App Bundle release signé** ; ne pas téléverser l’APK
  debug utilisé pour les tests locaux.
- [x] Ne pas publier un AAB contenant les symboles de débogage inutiles.
- [x] Vérifier que le build release utilise l’optimisation et la minification
  prévues.
- [ ] Vérifier le contenu de l’AAB avec Android Studio ou `bundletool`.
- [ ] Tester les APK générés depuis l’AAB, pas seulement l’APK debug Tauri.
- [ ] Vérifier la taille de téléchargement estimée dans Play Console.
- [ ] Vérifier que la taille compressée du module de base reste sous la limite
  Google Play de 500 Mo.
- [ ] Chercher malgré tout à rester nettement sous 200 Mo pour éviter
  l’avertissement non bloquant de téléchargement volumineux sur données mobiles
  et réduire les abandons d’installation.
- [ ] Examiner les bibliothèques Rust et ressources si l’estimation dépasse la
  limite.
- [ ] Archiver l’AAB final, son SHA-256, sa version et son `versionCode`.

L’AAB ARM64 release signé du 22 juillet 2026 pèse `9 727 110` octets.
Son SHA-256 est
`68BC1162F648230FF30AB8D32112C0CFC7BC2C3EE170F61AA223B3EC4677B2CD`.
La signature JAR a été vérifiée, le manifeste est présent et le bundle contient
`base/lib/arm64-v8a/libplum3_de_nyx_lib.so`.

Le dernier APK debug ARM64 du 20 juillet 2026 pèse `27 028 425` octets,
soit environ `25,8 MiB`. Son SHA-256 est
`0F12B816B2D78C64F0CCC6FB2EFA3BB5F823AC9C3A192E1B37499248931193C5`.
Cette taille n’est pas représentative d’un AAB release optimisé, mais elle rend
le contrôle de taille obligatoire avant publication.

Commande Tauri prévue pour un premier AAB release ARM64 :

```powershell
npm run tauri -- android build --aab --target aarch64
```

## 8. Fiche Google Play

- [ ] Créer l’application dans Play Console avec la langue principale choisie.
- [ ] Choisir **Application**, et non Jeu.
- [ ] Déclarer Plum3 comme application gratuite.
- [ ] Conserver `os.ph3ynyx.plum3` pour cette fiche.
- [ ] Ajouter plus tard Plum3 Projet comme achat intégré permanent avec
  Google Play Billing.
- [ ] Ne pas tenter de convertir cette même fiche en application payante après
  sa publication gratuite ; une application déjà offerte gratuitement ne peut
  pas devenir payante avec le même identifiant.
- [ ] Déclarer clairement dans la fiche les fonctions qui nécessiteront l’achat
  intégré lorsqu’elles seront réellement disponibles.
- [ ] Nom public de 30 caractères maximum.
- [ ] Description courte de 80 caractères maximum.
- [ ] Description complète de 4 000 caractères maximum.
- [ ] Préparer les textes français.
- [ ] Préparer les textes anglais.
- [ ] Ne pas utiliser de promesses, classements, témoignages anonymes ou
  fonctions non disponibles.
- [ ] Ajouter la catégorie et les étiquettes appropriées.
- [ ] Ajouter l’adresse courriel de soutien.
- [ ] Ajouter le site Web.
- [ ] Ajouter l’URL de la politique de confidentialité.

### Assets obligatoires ou recommandés

- [ ] Icône Play Store PNG 32 bits avec alpha, `512 × 512`, maximum 1 024 Ko.
- [ ] Image de présentation JPEG ou PNG 24 bits sans alpha, `1024 × 500`.
- [ ] Minimum de deux captures d’écran réelles.
- [ ] Préparer idéalement au moins quatre captures téléphone en
  `1080 × 1920` ou plus, au format portrait 9:16.
- [ ] Montrer Aube, Nuit, l’éditeur, la bibliothèque et les réglages réellement
  disponibles.
- [ ] Utiliser les logos, icônes et tokens officiels de Plum3.
- [ ] Ne pas utiliser directement les anciennes maquettes comme captures de
  production.
- [ ] Retirer des captures les notifications personnelles et informations
  inutiles de la barre système.
- [ ] Ajouter un texte alternatif pertinent à chaque image.
- [ ] Ne pas ajouter de badge Google Play dans les visuels de la fiche.
- [ ] Préparer des captures tablette seulement si l’expérience grand écran est
  réellement prise en charge.

## 9. Déclarations Play Console

- [ ] Déclarer correctement la présence ou l’absence de publicités.
- [ ] Remplir **Accès à l’application** ; indiquer qu’aucune connexion n’est
  nécessaire si cela reste vrai.
- [ ] Choisir le public cible réel.
- [ ] Ne pas déclarer l’application destinée aux enfants sans avoir évalué les
  règles Families.
- [ ] Remplir le questionnaire de classification IARC.
- [ ] Remplir le formulaire Sécurité des données.
- [ ] Répondre aux questions de suppression de données et de compte.
- [ ] Déclarer que Plum3 n’est pas une application d’actualités.
- [ ] Vérifier les déclarations sur les permissions sensibles.
- [ ] Vérifier les déclarations relatives au contenu généré par les utilisateurs
  si les fonctions de Plum3 évoluent.
- [ ] Relire toutes les déclarations après chaque changement fonctionnel majeur.

## 10. Tests Play Console

- [ ] Téléverser d’abord l’AAB sur la piste de test interne.
- [ ] Installer la version distribuée par Google Play sur le Nothing Phone.
- [ ] Vérifier le rapport de pré-lancement.
- [ ] Corriger les plantages, ANR, erreurs de compatibilité et problèmes
  d’accessibilité signalés.
- [ ] Tester au minimum Android 7/API 24 et Android 16/API 36, physiquement ou
  sur émulateur.
- [ ] Tester un appareil à faible mémoire.
- [ ] Répéter le démarrage à froid et la mise à jour avec une version distribuée
  par Google Play.
  - [x] Avec l’APK local/debug, Plum3 démarre sans erreur après mise à jour par
    `adb install -r`.
- [ ] Répéter avec une version distribuée par Google Play le test de conservation
  des documents pendant une mise à jour.
  - [x] Avec l’APK local/debug, les quatre documents Markdown et l’index de la
    bibliothèque ont survécu aux installations par-dessus l’application existante
    avec `adb install -r`.
- [ ] Tester le comportement après refus d’une permission, s’il en reste.
- [ ] Répéter le partage Markdown vers plusieurs applications avec une version
  distribuée par Google Play.
  - [x] Avec l’APK local/debug, le partage du véritable fichier Markdown vers
    plusieurs applications compatibles est validé sur le Nothing Phone.
- [ ] Répéter le fonctionnement sans réseau avec une version distribuée par
  Google Play.
  - [x] Le fonctionnement hors ligne est validé avec l’APK local/debug.
- [ ] Tester la désinstallation et confirmer l’avertissement de perte des
  documents locaux.
- [ ] Si requis pour le compte, lancer le test fermé avec 12 testeurs pendant
  14 jours continus.
- [ ] Inviter idéalement 15 à 18 testeurs pour conserver une marge au-dessus du
  minimum de 12 participants actifs.
- [ ] Recueillir et documenter les retours des testeurs.
- [ ] Demander l’accès à la production seulement après la période exigée.

## 11. Soumission

- [ ] Vérifier une dernière fois les règles Google Play à la date de soumission.
- [ ] Vérifier que la fiche décrit exactement la version téléversée.
- [ ] Vérifier le nom de version, le code de version et les notes de version.
- [ ] Vérifier les pays et régions de diffusion.
- [ ] Vérifier le prix et la disponibilité.
- [ ] Résoudre tous les avertissements et erreurs du tableau de bord.
- [ ] Envoyer d’abord une release de test.
- [ ] Examiner les résultats avant toute mise en production.
- [ ] Préférer un déploiement progressif pour la première production.
- [ ] Surveiller les plantages, ANR, avis et problèmes après publication.
- [ ] Conserver l’AAB, le SHA-256, les notes et les réponses aux déclarations.

## Blocages confirmés avant publication

> Le compte Google Play Console, l’identité, le nom public du développeur,
> le type et la date du compte ainsi que l’adresse de soutien choisie sont
> maintenant confirmés. Ils ne constituent plus des blocages.

1. Permission Internet à justifier ou retirer.
2. AAB release signé généré localement, mais pas encore testé depuis une
   distribution Google Play.
3. Taille de téléchargement réelle Play Store inconnue.
4. Fiche, déclarations et piste de test Play Console non finalisées.

## Références officielles

- Exigences d’API cible :
  https://support.google.com/googleplay/android-developer/answer/11926878
- Création et configuration d’une application :
  https://support.google.com/googleplay/android-developer/answer/9859152
- Tests exigés pour certains comptes personnels :
  https://support.google.com/googleplay/android-developer/answer/14151465
- Préparation de l’application pour l’examen :
  https://support.google.com/googleplay/android-developer/answer/9859455
- Sécurité des données :
  https://support.google.com/googleplay/android-developer/answer/10787469
- Classification du contenu :
  https://support.google.com/googleplay/android-developer/answer/9898843
- Assets et captures de la fiche :
  https://support.google.com/googleplay/android-developer/answer/9866151
- Limites de taille et avertissement au-dessus de 200 Mo :
  https://support.google.com/googleplay/android-developer/answer/9859372
- Prix gratuit ou payant de l’application :
  https://support.google.com/googleplay/android-developer/answer/6334373
- Politique de paiement et fonctions numériques :
  https://support.google.com/googleplay/android-developer/answer/9858738
- Play App Signing :
  https://support.google.com/googleplay/android-developer/answer/9842756
- Signature Android avec Tauri :
  https://v2.tauri.app/distribute/sign/android/
- Publication Google Play avec Tauri :
  https://v2.tauri.app/distribute/google-play/
