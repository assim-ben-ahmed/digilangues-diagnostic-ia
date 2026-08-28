import json
import os

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, ValidationError

load_dotenv()

MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY")
MISTRAL_MODEL = os.environ.get("MISTRAL_MODEL", "mistral-small-latest")
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"

app = FastAPI(title="Digilangues - Diagnostic IA")

NIVEAUX_CECRL = ["A1", "A2", "B1", "B2", "C1", "C2"]

SYSTEM_PROMPT = """Tu es le conseiller pédagogique senior de Digilangues, un centre de formation \
linguistique BtoB certifié Qualiopi, spécialisé dans la formation en entreprise (anglais, espagnol, \
allemand, portugais, FLE), en visio comme en présentiel.

Un responsable RH ou manager te transmet le profil linguistique de son équipe. Ta mission est de \
concevoir un programme de formation sur-mesure, réaliste et pédagogiquement justifié, aligné sur le \
Cadre Européen Commun de Référence pour les Langues (CECRL, niveaux A1 à C2).

Consignes :
- Le niveau visé doit être un progrès réaliste et atteignable par rapport au niveau actuel (en général +1 \
  sous-niveau à +1 niveau complet selon l'objectif, le rythme et la durée envisageables).
- Le format (visio/présentiel, individuel/groupe) et le rythme hebdomadaire doivent être cohérents avec la \
  taille de l'équipe, le secteur d'activité et l'objectif exprimé.
- La justification pédagogique doit être concrète, professionnelle, et mentionner le secteur d'activité \
  et l'objectif du client — jamais générique.

Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, respectant \
exactement ce schéma :
{
  "titre_programme": string — titre concis et professionnel du programme proposé,
  "niveau_cible": string — l'une des valeurs exactes suivantes : "A1", "A2", "B1", "B2", "C1", "C2",
  "format": string — modalité de formation, ex. "Visio, individuel" ou "Présentiel, groupe de 4",
  "rythme": string — rythme hebdomadaire recommandé, ex. "2 sessions de 1h par semaine",
  "duree": string — durée totale estimée du programme, ex. "6 mois",
  "justification": string — justification pédagogique de 3 à 4 phrases, ancrée dans le profil du client
}"""

NIVEAUX_JSON = ", ".join(f'"{n}"' for n in NIVEAUX_CECRL)


class DiagnosticRequest(BaseModel):
    secteur: str = Field(..., min_length=1, max_length=200)
    taille_equipe: str = Field(..., min_length=1, max_length=100)
    langue_cible: str = Field(..., min_length=1, max_length=50)
    niveau_actuel: str = Field(..., min_length=1, max_length=10)
    objectif: str = Field(..., min_length=1, max_length=1000)


class DiagnosticResponse(BaseModel):
    titre_programme: str
    niveau_cible: str
    format: str
    rythme: str
    duree: str
    justification: str


@app.post("/api/diagnostic", response_model=DiagnosticResponse)
def generate_diagnostic(payload: DiagnosticRequest) -> DiagnosticResponse:
    if not MISTRAL_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="La clé MISTRAL_API_KEY n'est pas configurée sur le serveur.",
        )

    if payload.niveau_actuel not in NIVEAUX_CECRL:
        raise HTTPException(
            status_code=422,
            detail=f"Niveau CECRL invalide. Valeurs acceptées : {', '.join(NIVEAUX_CECRL)}",
        )

    user_message = (
        f"Secteur d'activité de l'entreprise : {payload.secteur}\n"
        f"Taille de l'équipe concernée : {payload.taille_equipe}\n"
        f"Langue cible : {payload.langue_cible}\n"
        f"Niveau CECRL actuel de l'équipe : {payload.niveau_actuel}\n"
        f"Objectif principal de la formation : {payload.objectif}\n\n"
        "Propose le programme de formation Digilangues le plus adapté à ce profil."
    )

    try:
        api_response = requests.post(
            MISTRAL_API_URL,
            headers={
                "Authorization": f"Bearer {MISTRAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MISTRAL_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.4,
            },
            timeout=30,
        )
    except requests.exceptions.RequestException as exc:
        raise HTTPException(
            status_code=502, detail="Impossible de contacter l'API Mistral."
        ) from exc

    if api_response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail=f"Erreur de l'API Mistral ({api_response.status_code}) : {api_response.text}",
        )

    body = api_response.json()

    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise HTTPException(status_code=502, detail="Réponse inattendue de l'API Mistral.") from exc

    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502, detail="La réponse de l'IA n'a pas pu être interprétée."
        ) from exc

    try:
        return DiagnosticResponse(**data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"La réponse de l'IA ne respecte pas le format attendu : {exc}",
        ) from exc


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def serve_index() -> FileResponse:
    return FileResponse("static/index.html")
