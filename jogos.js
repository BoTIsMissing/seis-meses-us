"use strict";
(() => {
  const settings = window.PRESENTE || {};
  const byId = id => document.getElementById(id);
  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  const pool = (settings.fotos || []).filter((photo, index, all) =>
    photo.arquivo && all.findIndex(other => other.arquivo === photo.arquivo) === index
  );
  const board = byId("match-board");
  const startButton = byId("match-start");
  const stats = byId("match-stats");
  const feedback = byId("match-feedback");
  let opened = [];
  let moves = 0;
  let found = 0;
  let pairCount = 0;
  let locked = false;
  let pendingFlip = null;
  function updateStats() { stats.textContent = `${found} de ${pairCount} pares · ${moves} ${moves === 1 ? "jogada" : "jogadas"}`; }
  function reveal(button, visible) {
    button.classList.toggle("is-open", visible);
    button.setAttribute("aria-pressed", String(visible));
    button.setAttribute("aria-label", `Carta ${button.cardNumber}, ${visible ? "foto revelada" : "fechada"}`);
    button.firstElementChild.setAttribute("aria-hidden", String(!visible));
  }
  function flip(button) {
    if (locked || button.disabled || opened.includes(button)) return;
    reveal(button, true);
    opened.push(button);
    if (opened.length < 2) return;
    moves++;
    const [first, second] = opened;
    if (first.photoKey === second.photoKey) {
      found++;
      opened.forEach(card => {
        card.disabled = true;
        card.classList.add("is-matched");
        card.setAttribute("aria-label", `Carta ${card.cardNumber}, par encontrado`);
      });
      opened = [];
      feedback.textContent = found === pairCount ? `Você encontrou todos os pares em ${moves} jogadas. Guardei essas fotos, agora guarda um abraço meu também. ♡` : "Esse par é nosso! Vamos para o próximo?";
    } else {
      locked = true;
      feedback.textContent = "Ainda não foi esse par. Dá mais uma olhadinha antes de virar.";
      pendingFlip = setTimeout(() => {
        opened.forEach(card => reveal(card, false));
        opened = [];
        locked = false;
        pendingFlip = null;
      }, 1100);
    }
    updateStats();
  }
  function startMemory() {
    clearTimeout(pendingFlip);
    pendingFlip = null;
    opened = [];
    moves = found = 0;
    locked = false;
    pairCount = Math.min(6, pool.length);
    board.replaceChildren();
    if (pairCount < 2) {
      feedback.textContent = "Adicione pelo menos duas fotos ao álbum para jogar.";
      updateStats();
      return;
    }
    // Pick from different parts of the album to avoid six near-identical selfies.
    const chosen = Array.from({ length: pairCount }, (_, i) => pool[Math.floor(i * pool.length / pairCount)]);
    shuffle(chosen.flatMap((photo, key) => [{ photo, key }, { photo, key }])).forEach(({ photo, key }, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "match-card";
      button.photoKey = key;
      button.cardNumber = index + 1;
      const img = document.createElement("img");
      img.src = photo.arquivo;
      img.alt = photo.descricao || "Uma foto do nosso álbum";
      img.decoding = "async";
      button.appendChild(img);
      reveal(button, false);
      button.addEventListener("click", () => flip(button));
      board.appendChild(button);
    });
    startButton.textContent = "Embaralhar de novo";
    feedback.textContent = "Vire duas cartas por vez e encontre as fotos iguais.";
    updateStats();
  }
  startButton.addEventListener("click", startMemory);

  const questions = (settings.quiz || []).filter(q =>
    typeof q.pergunta === "string" && Array.isArray(q.opcoes) && q.opcoes.length > 1 &&
    Number.isInteger(q.resposta) && q.resposta >= 0 && q.resposta < q.opcoes.length
  );
  const questionTitle = byId("quiz-question");
  const options = byId("quiz-options");
  const quizFeedback = byId("quiz-feedback");
  const next = byId("quiz-next");
  const restart = byId("quiz-restart");
  const progress = byId("quiz-progress");
  let current = 0;
  let score = 0;
  let answered = false;
  function renderQuestion(focus = false) {
    answered = false;
    options.replaceChildren();
    quizFeedback.textContent = "";
    next.hidden = restart.hidden = true;
    progress.max = questions.length || 1;
    progress.value = current;
    byId("quiz-score").textContent = `${score} ${score === 1 ? "acerto" : "acertos"}`;
    if (!questions.length) {
      questionTitle.textContent = "As nossas perguntas estão sendo preparadas.";
      byId("quiz-position").textContent = "";
      return;
    }
    const question = questions[current];
    byId("quiz-position").textContent = `Pergunta ${current + 1} de ${questions.length}`;
    questionTitle.textContent = question.pergunta;
    question.opcoes.forEach((label, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quiz-option";
      button.textContent = label;
      button.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const correct = index === question.resposta;
        if (correct) score++;
        Array.from(options.children).forEach((option, optionIndex) => {
          option.disabled = true;
          if (optionIndex === question.resposta) {
            option.classList.add("is-correct");
            option.textContent = `✓ ${question.opcoes[optionIndex]} — resposta certa`;
          } else if (optionIndex === index) {
            option.classList.add("is-wrong");
            option.textContent = `× ${question.opcoes[optionIndex]} — sua resposta`;
          }
        });
        progress.value = current + 1;
        byId("quiz-score").textContent = `${score} ${score === 1 ? "acerto" : "acertos"}`;
        quizFeedback.textContent = `${correct ? "Acertou!" : "Quase, meu amor!"} ${question.explicacao || `A resposta é ${question.opcoes[question.resposta]}.`}`;
        next.textContent = current === questions.length - 1 ? "Ver resultado ♡" : "Próxima pergunta →";
        next.hidden = false;
      });
      options.appendChild(button);
    });
    if (focus) questionTitle.focus();
  }
  next.addEventListener("click", () => {
    if (!answered) return;
    current++;
    if (current < questions.length) { renderQuestion(true); return; }
    answered = false;
    next.hidden = true;
    restart.hidden = false;
    options.replaceChildren();
    byId("quiz-position").textContent = "Quiz completo";
    questionTitle.textContent = `${score} de ${questions.length}. E um beijo de prêmio.`;
    quizFeedback.textContent = score === questions.length ? "Você lembrou de tudo! Agora vem cobrar esse beijo, Carol. ♡" : "Os detalhes a gente relembra juntos. Eu adorei ter você aqui até o fim. ♡";
    questionTitle.focus();
  });
  restart.addEventListener("click", () => { current = score = 0; renderQuestion(true); });
  renderQuestion();
})();
