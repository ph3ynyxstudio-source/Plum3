# Checklist de publication Google Play — Plum3 Android

Dernière vérification : **17 juillet 2026 à 10 h 58 (heure de Toronto)**

Cette checklist concerne la future publication de **Plum3 Free** sur Google Play.
Elle ne remplace pas les règles officielles de Google Play, qui peuvent évoluer.

## Légende

- [x] Vérifié dans le dépôt actuel.
- [ ] À faire ou à confirmer avant publication.

## État actuel

- [x] Nom de l’application : `Plum3`.
- [x] Identifiant Android : `os.ph3ynyx.plum3`.
- [x] Version actuelle du projet : `0.1.0`.
- [x] `minSdk = 24` — Android 7.0 minimum.
- [x] `compileSdk = 36`.
- [x] `targetSdk = 36`.
- [x] APK ARM64 debug généré et installé sur un appareil réel.
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
- [ ] Plum3 n’est pas encore prêt pour une soumission Google Play.

> Plum3 cible déjà Android 16/API 36 et satisfait donc l’exigence annoncée
> pour les nouvelles applications et mises à jour à partir du 31 août 2026.
> La compatibilité fonctionnelle avec l’API 36 doit néanmoins être testée.

## 1. Terminer le produit Android

- [ ] Terminer et valider l’Étape 2 de la roadmap Android.
- [ ] Retirer ou neutraliser toute action mobile qui appelle une fonction
  indisponible, notamment « Ouvrir un document ».
- [ ] Implémenter la bibliothèque locale Android fiable.
- [ ] Vérifier l’autosauvegarde, le redémarrage et le passage en arrière-plan.
- [ ] Permettre le partage individuel d’un véritable fichier Markdown.
- [ ] Afficher clairement que la désinstallation supprime la bibliothèque
  privée locale.
- [ ] Conserver PDF et DOCX désactivés tant qu’ils ne fonctionnent pas réellement.
- [ ] Ne mentionner dans la fiche Play Store aucune fonction encore absente.
- [ ] Tester Aube et Nuit sans zoom et sans chevauchement avec les barres système.
- [ ] Tester le bouton Retour Android dans chaque vue, tiroir, modale et mode
  concentration.
- [ ] Tester l’application hors ligne.

## 2. Compte développeur et identité

- [ ] Créer ou vérifier le compte Google Play Console.
- [ ] Terminer la vérification d’identité du développeur Android.
- [ ] Confirmer le nom public du développeur : `Ph3yNyx.Studio`.
- [ ] Confirmer l’adresse courriel de soutien publique.
- [ ] Confirmer le site officiel : `https://ph3ynyx.dev/`.
- [ ] Accepter les règles du programme développeur et les conditions de
  Play App Signing.
- [ ] Vérifier la date de création et le type du compte Google Play.
- [ ] Si le compte personnel a été créé après le 13 novembre 2023, prévoir un
  test fermé avec au moins 12 testeurs inscrits continuellement pendant
  14 jours avant de demander l’accès à la production.
- [ ] Recruter idéalement 15 à 18 personnes afin qu’un désistement ne fasse pas
  retomber le nombre de testeurs actifs sous 12.

## 3. Identité technique et version

- [x] Confirmer que `os.ph3ynyx.plum3` est identique dans Tauri, Gradle et le
  manifeste généré.
- [ ] Vérifier définitivement l’identifiant avant le premier téléversement :
  il ne pourra pas être changé pour les mises à jour de la même application.
- [ ] Définir explicitement le `versionCode` Android de la première version.
- [ ] Confirmer le `versionName` public.
- [ ] Documenter la règle d’incrémentation du `versionCode`.
- [ ] Incrémenter le `versionCode` à chaque AAB téléversé, même pour les pistes
  de test.
- [ ] Vérifier que toutes les architectures natives publiées comprennent
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
- [ ] Restreindre le `FileProvider` : la configuration actuelle expose des
  chemins trop larges avec `<external-path path=".">` et `<cache-path path=".">`.
- [ ] N’exposer que le sous-dossier temporaire nécessaire au partage Markdown.
- [ ] Retirer `LEANBACK_LAUNCHER` et les déclarations Android TV si Plum3 ne
  cible pas officiellement Android TV.
- [ ] Si Android TV est conservé, réaliser l’interface, les tests, la bannière
  et les captures TV exigées.
- [ ] Vérifier les comportements portrait, paysage et redimensionnement.
- [ ] Vérifier l’affichage sur téléphone, tablette et grand écran.
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

- [ ] Créer une clé d’envoi Android dédiée à Plum3.
- [ ] Conserver le keystore hors du dépôt et dans une sauvegarde sécurisée.
- [ ] Ne jamais inscrire un mot de passe de signature dans Git.
- [ ] Créer localement `src-tauri/gen/android/keystore.properties`.
- [ ] Vérifier que Gradle applique la configuration de signature au build
  `release`.
- [ ] Activer Play App Signing lors de la première release.
- [ ] Sauvegarder le certificat public de la clé d’envoi.
- [ ] Documenter la procédure de récupération ou de réinitialisation de la clé
  d’envoi.
- [ ] Vérifier la signature de l’AAB final.

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

- [ ] Générer un **Android App Bundle release signé** ; ne pas téléverser l’APK
  debug utilisé pour les tests locaux.
- [ ] Ne pas publier un AAB contenant les symboles de débogage inutiles.
- [ ] Vérifier que le build release utilise l’optimisation et la minification
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

Le dernier APK debug ARM64 du 17 juillet 2026 pèse `337 745 052` octets,
soit environ `322,1 MiB`. Son SHA-256 est
`CC2438F140C5895A6258A104E4EA1230F704EF0B8F814F9B5A58A3126813AAFA`.
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
- [ ] Tester le démarrage à froid et après mise à jour.
- [ ] Tester la conservation des documents pendant une mise à jour.
- [ ] Tester le comportement après refus d’une permission, s’il en reste.
- [ ] Tester le partage Markdown vers plusieurs applications.
- [ ] Tester l’application sans réseau.
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

1. Bibliothèque locale Android pas encore terminée.
2. Certaines actions Android restent indisponibles.
3. Partage Markdown natif pas encore finalisé.
4. Configuration Android TV probablement inutile à retirer.
5. `FileProvider` trop permissif à restreindre.
6. Permission Internet à justifier ou retirer.
7. Clé d’envoi et signature release non configurées.
8. Aucun AAB release signé et testé.
9. Taille réelle Play Store inconnue.
10. Fiche, déclarations et piste de test Play Console non préparées.

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
