const MATCH_DURATION = 90;
const COVERAGE_GOAL = 10;

/** Controla o primeiro-a-10%, penalidades, cronômetro e tela final. */
export class MatchController {
  constructor({ ink, player, bot, weapons }) {
    this.ink = ink;
    this.player = player;
    this.bot = bot;
    this.weapons = weapons;
    this.started = false;
    this.ended = false;
    this.remaining = MATCH_DURATION;
    this.playerDeaths = 0;
    this.botKills = 0;
    this.alertTimer = null;

    this.goalEl = document.getElementById('match-goal');
    this.timeEl = document.getElementById('match-time');
    this.alertEl = document.getElementById('match-alert');
    this.resultEl = document.getElementById('match-result');
    this.resultTitleEl = document.getElementById('result-title');
    this.resultReasonEl = document.getElementById('result-reason');
    this.resultScoreEl = document.getElementById('result-score');
    this.restartButton = document.getElementById('restart-match');

    this.bot.setEnabled(false);
    this.bot.setOnKilled(() => this.handleBotKilled());
    this.player.setOnDeath((source) => this.handlePlayerDeath(source));
    this.restartButton?.addEventListener('click', () => window.location.reload());
    if (this.goalEl) this.goalEl.textContent = `META ${COVERAGE_GOAL.toFixed(0)}%`;
    this._updateClock();
  }

  get active() {
    return this.started && !this.ended;
  }

  start() {
    if (this.started || this.ended) return;
    this.started = true;
    this.bot.setEnabled(true);
    this._showAlert('PRIMEIRO A 10% VENCE', 'objective');
  }

  update(delta) {
    if (!this.started && this.player.locked) this.start();
    if (!this.active) return;

    this.remaining = Math.max(0, this.remaining - delta);
    this._updateClock();
    const [playerCoverage, botCoverage] = this.ink.getCoverage();
    if (playerCoverage >= COVERAGE_GOAL) {
      this._finish(true, 'Você completou a meta de território primeiro.');
    } else if (botCoverage >= COVERAGE_GOAL) {
      this._finish(false, 'O Bot Rosa cobriu a meta de território primeiro.');
    } else if (this.remaining <= 0) {
      this._finish(
        playerCoverage > botCoverage,
        playerCoverage === botCoverage
          ? 'Tempo esgotado: o Bot Rosa venceu o desempate.'
          : 'Tempo esgotado: venceu quem controlava mais território.',
      );
    }
  }

  handlePlayerDeath(source = 'BOT ROSA') {
    if (!this.active) return;
    this.playerDeaths++;
    const before = this.ink.getCoverage()[0];
    this.ink.penalizeTeam(0, 0.16, 1);
    const after = this.ink.getCoverage()[0];
    const lost = Math.max(0, before - after);
    this._showAlert(`${source} DERRUBOU VOCÊ · -${lost.toFixed(1)}% AZUL`, 'danger');
  }

  handleBotKilled() {
    if (!this.active) return;
    this.botKills++;
    const before = this.ink.getCoverage()[1];
    this.ink.penalizeTeam(1, 0.08, 0);
    const after = this.ink.getCoverage()[1];
    const stolen = Math.max(0, before - after);
    this._showAlert(`BOT ABATIDO · ${stolen.toFixed(1)}% RECUPERADO`, 'success');
  }

  _finish(won, reason) {
    if (this.ended) return;
    this.ended = true;
    this.bot.setEnabled(false);
    this.weapons.setEnabled(false);
    const [playerCoverage, botCoverage] = this.ink.getCoverage();
    if (document.pointerLockElement) document.exitPointerLock();
    document.body.classList.remove('aiming', 'scoped');
    document.body.classList.add(won ? 'match-won' : 'match-lost');
    if (this.resultTitleEl) this.resultTitleEl.textContent = won ? 'VITÓRIA!' : 'DERROTA';
    if (this.resultReasonEl) this.resultReasonEl.textContent = reason;
    if (this.resultScoreEl) {
      this.resultScoreEl.innerHTML = `
        <span><b>${playerCoverage.toFixed(1)}%</b> VOCÊ</span>
        <i>×</i>
        <span><b>${botCoverage.toFixed(1)}%</b> BOT</span>
        <small>${this.botKills} abates · ${this.playerDeaths} quedas</small>`;
    }
    if (this.resultEl) this.resultEl.hidden = false;
  }

  _showAlert(message, state) {
    if (!this.alertEl) return;
    this.alertEl.textContent = message;
    this.alertEl.dataset.state = state;
    this.alertEl.classList.remove('show');
    void this.alertEl.offsetWidth;
    this.alertEl.classList.add('show');
    clearTimeout(this.alertTimer);
    this.alertTimer = setTimeout(() => this.alertEl?.classList.remove('show'), 2300);
  }

  _updateClock() {
    if (!this.timeEl) return;
    const minutes = Math.floor(this.remaining / 60);
    const seconds = Math.ceil(this.remaining % 60);
    this.timeEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    this.timeEl.classList.toggle('urgent', this.remaining <= 15);
  }
}
