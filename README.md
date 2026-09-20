# TRIP'IN

Webapp d'organisation de voyages entre amis, sur un modèle inspiré de Tricount : connexion par numéro de cellulaire, multi-voyages par utilisateur, rejoindre un voyage par code. Chaque voyage centralise les annonces (avec accusé de lecture par réaction emoji), le groupe, le covoiturage, les repas par équipe, les tentes et le matériel partagé.

## Lancer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000 (idéalement en mode mobile dans les devtools).

La base SQLite (`camping.db`) est créée et seedée automatiquement au premier lancement avec le voyage de référence (île Beaurivage, 21–23 juin, capacité 18) et 8 participants. Pour repartir de zéro : supprimer `camping.db*` et relancer.

## Fonctionnalités

- **Connexion** : numéro de cellulaire sans mot de passe ; l'utilisateur retrouve tous ses voyages. Rejoindre un voyage par code, en créer un (le créateur devient admin).
- **Annonces** (valeur cœur) : publication admin uniquement, réaction emoji obligatoire (option par voyage), bannière persistante tant qu'une annonce n'est pas validée, visibilité de qui a réagi / qui manque.
- **Groupe** : roster avec statut confirmé/en attente, restrictions alimentaires, multi-admins (nommer/révoquer), impersonation admin ("agir en tant que").
- **Covoiturage & repas** : déclaration de voiture, rejoindre/quitter, équipes repas dérivées des voitures, menu + liste de courses par équipe.
- **Tentes & matos** : déclaration/partage de tente avec places restantes, matériel par catégories avec réservation par quantité (pris vs requis).
- **Administration par voyage** : infos du voyage, capacité, thèmes visuels (design tokens), pages activables/désactivables, permissions de déclaration voitures/tentes.

## Écarts restants avant la stack cible (Postgres/Prisma/Railway)

| Cible | État actuel | À faire |
|-------|-------------|---------|
| PostgreSQL + Prisma | SQLite natif (`node:sqlite`) | Migrer le schéma vers Prisma + Postgres pour Railway. |
| i18n FR/EN | FR uniquement | Ajouter la couche i18n. |
| Envoi d'email réel (ANN-05) | Simulé en console serveur | Brancher un fournisseur SMTP/transactionnel. |
| Cookie de session signé | Cookie JSON non signé | Signer/chiffrer la session avant tout déploiement public. |

## Carte du projet (vault Obsidian)

Un coffre Obsidian dans `../TRIPIN-Vault` représente le projet sous forme de graphe de notes reliées (domaine, pages, composants, lib, infra + roadmap, requirements, décisions, tickets).

- `npm run graph` — régénère les notes de **code** à partir du source (structure et dépendances réelles). Chaque note a un bloc `AUTO` régénéré et un bloc `LIBRE` préservé.
- Un hook git **post-commit** relance ça automatiquement à chaque commit.

> ⚠️ **Après un clone** : le hook vit dans `.git/hooks/` (non versionné). Relance-le une fois avec :
>
> ```bash
> npm run graph:install-hook
> ```
