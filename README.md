# 🌿 AGRO-ASSIST — Gestion Agricole Intégrée

Plateforme complète de gestion de ferme pour le Maroc.

## Fonctionnalités

| Module | Description |
|--------|-------------|
| 📊 **Tableau de Bord** | KPIs globaux, revenus, cheptel, activité récente |
| 📅 **Planning** | Vue jour/semaine/mois, tâches prévisionnelles par activité |
| 🐄 **Élevage** | Bovins, caprins, lapins, aviculture, apiculture |
| 🌾 **Cultures** | Céréales, fruits, légumes — suivi opérations |
| 💧 **Irrigation** | Plans par parcelle, techniques recommandées |
| 🧪 **Traitements** | Fertilisation, insecticides, fongicides, suivi toxicologique, DAR |
| 🚜 **Matériel** | Inventaire équipements, affectation par activité, plan maintenance |
| 🌤️ **Météo** | Prévisions 7 jours + conseils agricoles |
| 📊 **Production** | Suivi quantités et revenus MAD par activité |
| 🤖 **AgriBot** | Chatbot IA bilingue (FR/AR) spécialisé agriculture marocaine |

## Administration

- **Connexion admin** : mot de passe `1317`
- Configuration ferme : nom, localisation, surfaces, activités
- Gestion utilisateurs : création avec login/mot de passe et sections autorisées
- Gestion employés : nom, poste, téléphone
- Paramétrage élevage (nombre par type) et cultures (surfaces)

## Déploiement

### Local
```bash
npm install
npm run dev
```

### Netlify
1. Push sur GitHub
2. Connecter le repo dans Netlify
3. Build command : `npm run build`
4. Publish directory : `dist`
5. Le fichier `netlify.toml` est déjà configuré
6. **IMPORTANT — Clé API pour le Chatbot :**
   - Aller dans Netlify → Site → **Site configuration** → **Environment variables**
   - Ajouter : `ANTHROPIC_API_KEY` = votre clé API Anthropic
   - Redéployer le site
   - Sans cette clé, le chatbot AgriBot ne fonctionnera pas

### GitHub Pages
```bash
npm run build
# Déployer le dossier dist/
```

## Stack technique

- **React 18** + **Vite 6**
- Zero backend — données persistées en `localStorage`
- Chatbot via API Anthropic Claude
- Interface responsive (mobile/desktop)
- Design dark theme agricole

## Licence

Usage privé — Développé pour la gestion agricole au Maroc.
