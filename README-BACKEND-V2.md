# Debat Haiti — Backend v2

NestJS + Prisma + PostgreSQL + Socket.IO

## Nouveautés v2

### Schéma base de données
- `Debat` : ajout `categorie` (String?) et `dateDebut` (DateTime?)
- `Message` : ajout `stance` (POUR | CONTRE | NEUTRE)
- `VoteDebat` : nouvelle table — vote Pour/Contre sur le débat global
- `StanceMsg` et `TypeVoteDebat` : nouveaux enums Prisma

### API — nouveaux endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/votes` | Vote sur message OU débat (`messageId` ou `debatId`) |
| GET  | `/api/votes/debat/:id` | Stats Pour/Contre d'un débat (public) |
| GET  | `/api/votes/debat/:id/mon-vote` | Vote perso de l'utilisateur connecté |
| POST | `/api/ia/analyser-argument` | Analyse IA sécurisée côté serveur |

### CORS dynamique
Configurer `FRONTEND_URL` dans `.env` — supporte plusieurs URLs séparées par virgule.

### WebSocket — namespace `/debats`
Événements client → serveur :
- `rejoindre-debat` (debatId) — rejoindre la room
- `quitter-debat`   (debatId) — quitter la room

Événements serveur → client :
- `nouveau-message`  (message)  — nouvel argument en temps réel
- `votes-mis-a-jour` (stats)    — Pour/Contre mis à jour
- `statut-debat`     (statut)   — débat ouvert/fermé
- `spectateurs`      ({ count }) — nombre de participants connectés

## Installation

```bash
# 1. Copier le fichier d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# 2. Installer les dépendances
npm install

# 3. Appliquer la migration base de données
npx prisma migrate deploy
# OU pour un départ à zéro :
npx prisma migrate dev --name debat-haiti-v2

# 4. Générer le client Prisma
npx prisma generate

# 5. Démarrer
npm run start:dev
```

## Variables d'environnement requises

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
FRONTEND_URL=https://votre-frontend.vercel.app
```

## Migration depuis v1

Si vous avez déjà une base de données :
```bash
# Appliquer uniquement la migration SQL v2
psql $DATABASE_URL < prisma/migrations/20260409_debat_haiti_v2/migration.sql
```
