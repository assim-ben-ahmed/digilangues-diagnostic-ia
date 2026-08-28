# Digilangues — Diagnostic IA des besoins linguistiques

Démo locale : un client professionnel renseigne le profil linguistique de son équipe, et l'outil
génère en direct — via l'API Mistral — un programme de formation sur-mesure (niveau
CECRL visé, format, rythme, durée, justification pédagogique).

## Lancer le projet en local

### 1. Créer et configurer le fichier `.env`

```bash
cp .env.example .env
```

Puis ouvrir `.env` et renseigner votre clé API Mistral (console.mistral.ai) :

```
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-small-latest
```

La clé n'est jamais exposée côté frontend : elle est lue côté serveur (FastAPI) via
`python-dotenv`, et toutes les requêtes vers Mistral transitent par le backend (appel HTTP direct
vers `https://api.mistral.ai/v1/chat/completions`).

### 2. Installer les dépendances

Créez un environnement virtuel (recommandé), puis installez les dépendances :

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

### 3. Lancer le serveur

```bash
uvicorn main:app --reload
```

### 4. Ouvrir l'application

Rendez-vous sur [http://localhost:8000](http://localhost:8000), remplissez le formulaire
(secteur, taille d'équipe, langue cible, niveau CECRL actuel, objectif) et cliquez sur
**Générer le diagnostic**.

## Structure du projet

```
digilangues/
├── main.py              # Application FastAPI + endpoint POST /api/diagnostic
├── .env.example          # Modèle de fichier d'environnement
├── requirements.txt
├── static/
│   ├── index.html        # Page unique (formulaire + rendu du résultat)
│   ├── style.css          # Design bleu nuit / accent ambré
│   └── script.js           # Logique formulaire + appel API + rendu CECRL
└── README.md
```
