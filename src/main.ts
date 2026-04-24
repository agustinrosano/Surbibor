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
const multiBtn = document.getElementById('multiplayer-btn');
const multiModal = document.getElementById('multiplayer-modal');
const closeMultiBtn = document.getElementById('close-multi-btn');

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

      // Join room if intent exists
      const roomId = (window as any).nextRoomId;
      if (roomId) {
          engine.network.joinRoom(roomId, {
              charType,
              hp: 20,
              maxHp: 20,
              x: 0,
              y: 0
          });
          (window as any).nextRoomId = null;
      }
      
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

// Multiplayer Modal logic
const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');
const roomIdInput = document.getElementById('room-id') as HTMLInputElement;

if (multiBtn && multiModal) {
  multiBtn.addEventListener('click', () => {
    multiModal.style.display = 'flex';
  });
}

if (createRoomBtn && multiModal) {
  createRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value || Math.random().toString(36).substring(7);
    multiModal.style.display = 'none';
    if (mainMenu) mainMenu.style.display = 'none';
    if (characterSelection) characterSelection.style.display = 'flex';
    
    // Store room intent
    (window as any).nextRoomId = roomId;
  });
}

if (joinRoomBtn && multiModal) {
  joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value;
    if (!roomId) {
      alert('Ingresa un ID de sala');
      return;
    }
    multiModal.style.display = 'none';
    if (mainMenu) mainMenu.style.display = 'none';
    if (characterSelection) characterSelection.style.display = 'flex';
    (window as any).nextRoomId = roomId;
  });
}

if (closeMultiBtn && multiModal) {
  closeMultiBtn.addEventListener('click', () => {
    multiModal.style.display = 'none';
  });
}

console.log('BubbaSurvivor Engine Loaded');
