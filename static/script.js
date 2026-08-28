const CECRL_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const NIVEAU_LABELS = {
  A1: "A1 — Débutant",
  A2: "A2 — Élémentaire",
  B1: "B1 — Intermédiaire",
  B2: "B2 — Intermédiaire avancé",
  C1: "C1 — Avancé",
  C2: "C2 — Maîtrise",
};

const LOADING_MESSAGES = [
  "Analyse du profil linguistique…",
  "Calibrage sur le Cadre Européen (CECRL)…",
  "Élaboration du programme pédagogique…",
  "Finalisation du diagnostic…",
];
const MIN_LOADING_MS = 2200;
const LOADING_MESSAGE_INTERVAL_MS = 1300;

const views = {
  form: document.getElementById("view-form"),
  loading: document.getElementById("view-loading"),
  result: document.getElementById("view-result"),
};

const stepEls = {
  form: document.querySelector('.step[data-step="form"]'),
  result: document.querySelector('.step[data-step="result"]'),
};

const form = document.getElementById("diagnostic-form");
const submitBtn = document.getElementById("submit-btn");
const btnLabel = submitBtn.querySelector(".btn-label");
const formError = document.getElementById("form-error");

const loadingStatus = document.getElementById("loading-status");

const recapBar = document.getElementById("recap-bar");
const resultTitle = document.getElementById("result-title");
const resultFormat = document.getElementById("result-format");
const resultRythme = document.getElementById("result-rythme");
const resultDuree = document.getElementById("result-duree");
const resultJustification = document.getElementById("result-justification");

const cecrlFill = document.getElementById("cecrl-fill");
const cecrlCurrentMarker = document.getElementById("cecrl-current-marker");
const cecrlTargetMarker = document.getElementById("cecrl-target-marker");

const btnEdit = document.getElementById("btn-edit");
const btnRestart = document.getElementById("btn-restart");
const btnPrint = document.getElementById("btn-print");

let loadingInterval = null;

function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    el.hidden = key !== name;
    el.classList.remove("view-enter");
  });
  const active = views[name];
  void active.offsetWidth; // force reflow to restart the animation
  active.classList.add("view-enter");

  Object.entries(stepEls).forEach(([key, el]) => {
    el.classList.toggle("active", key === name || (name === "loading" && key === "result"));
    el.classList.toggle("done", name !== "form" && key === "form");
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function levelPercent(level) {
  const index = CECRL_LEVELS.indexOf(level);
  if (index === -1) return 0;
  return (index / (CECRL_LEVELS.length - 1)) * 100;
}

function startLoadingMessages() {
  let i = 0;
  loadingStatus.textContent = LOADING_MESSAGES[0];
  loadingInterval = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    loadingStatus.style.opacity = "0";
    setTimeout(() => {
      loadingStatus.textContent = LOADING_MESSAGES[i];
      loadingStatus.style.opacity = "1";
    }, 200);
  }, LOADING_MESSAGE_INTERVAL_MS);
}

function stopLoadingMessages() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
}

function renderRecap(payload) {
  const chips = [
    ["🏢", payload.secteur],
    ["👥", payload.taille_equipe],
    ["🌐", payload.langue_cible],
    ["📊", NIVEAU_LABELS[payload.niveau_actuel] || payload.niveau_actuel],
  ];
  recapBar.innerHTML = chips
    .map(
      ([icon, text]) =>
        `<span class="recap-chip"><span class="recap-chip-icon">${icon}</span><strong>${escapeHtml(text)}</strong></span>`
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderResult(data, niveauActuel) {
  resultTitle.textContent = data.titre_programme;
  resultFormat.textContent = data.format;
  resultRythme.textContent = data.rythme;
  resultDuree.textContent = data.duree;
  resultJustification.textContent = data.justification;

  const currentPct = levelPercent(niveauActuel);
  const targetPct = levelPercent(data.niveau_cible);

  cecrlFill.style.width = `${Math.max(currentPct, targetPct)}%`;
  cecrlCurrentMarker.style.left = `${currentPct}%`;
  cecrlTargetMarker.style.left = `${targetPct}%`;
}

function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const formData = new FormData(form);
  const payload = {
    secteur: formData.get("secteur").trim(),
    taille_equipe: formData.get("taille_equipe").trim(),
    langue_cible: formData.get("langue_cible"),
    niveau_actuel: formData.get("niveau_actuel"),
    objectif: formData.get("objectif").trim(),
  };

  if (Object.values(payload).some((v) => !v)) {
    showError("Merci de compléter tous les champs du formulaire.");
    return;
  }

  submitBtn.disabled = true;
  showView("loading");
  startLoadingMessages();

  const startedAt = Date.now();

  try {
    const response = await fetch("/api/diagnostic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let detail = "Une erreur est survenue lors de la génération du diagnostic.";
      try {
        const errBody = await response.json();
        if (errBody.detail) detail = errBody.detail;
      } catch (_) {
        // ignore parse failure, keep default message
      }
      throw new Error(detail);
    }

    const data = await response.json();

    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await sleep(MIN_LOADING_MS - elapsed);
    }

    renderRecap(payload);
    renderResult(data, payload.niveau_actuel);
    stopLoadingMessages();
    showView("result");
  } catch (err) {
    stopLoadingMessages();
    showView("form");
    showError(err.message || "Impossible de contacter le serveur.");
  } finally {
    submitBtn.disabled = false;
    btnLabel.textContent = "Générer le diagnostic";
  }
});

btnEdit.addEventListener("click", () => {
  showView("form");
});

btnRestart.addEventListener("click", () => {
  form.reset();
  clearError();
  showView("form");
});

btnPrint.addEventListener("click", () => {
  window.print();
});

stepEls.form.classList.add("active");
