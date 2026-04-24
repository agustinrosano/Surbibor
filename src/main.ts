import './styles/index.css';
import { GameEngine } from './engine/GameEngine';

const engine = new GameEngine('gameCanvas');

const startBtn = document.getElementById('start-game');
const mainMenu = document.getElementById('main-menu');
const characterSelection = document.getElementById('character-selection');
const hud = document.getElementById('hud');
const backToMenuBtn = document.getElementById('back-to-menu');
const charCards = document.querySelectorAll('.character-card');
const resumeBtn = document.getElementById('resume-btn');

// Start Flow
if (startBtn && mainMenu && characterSelection) {
  startBtn.addEventListener('click', () => {
    mainMenu.style.display = 'none';
    characterSelection.style.display = 'flex';
  });
}

if (backToMenuBtn && mainMenu && characterSelection) {
  backToMenuBtn.addEventListener('click', () => {
    characterSelection.style.display = 'none';
    mainMenu.style.display = 'flex';
  });
}

charCards.forEach(card => {
  card.addEventListener('click', async () => {
    const charType = card.getAttribute('data-char') as 'archer' | 'soldier';
    if (characterSelection && hud) {
      characterSelection.style.display = 'none';
      hud.style.display = 'block';
      
      await engine.init();
      engine.reset(charType);
      engine.start();
    }
  });
});

// Pause / Resume
if (resumeBtn) {
  resumeBtn.addEventListener('click', () => {
    engine.togglePause();
  });
}

// Global "Back to Menu" logic
const menuButtons = document.querySelectorAll('.back-to-menu-btn');
menuButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    engine.stop();
    if (mainMenu) mainMenu.style.display = 'flex';
  });
});

// Retry
const retryBtn = document.getElementById('retry-btn');
if (retryBtn) {
  retryBtn.addEventListener('click', () => {
    engine.reset(); // Keep same character logic could be added here
  });
}

console.log('BubbaSurvivor Engine Loaded');
