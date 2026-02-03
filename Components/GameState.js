export function createGameState() {
  return {
    time: 0,
    level: 1,
    xp: 0,
    xpToNext: 15,
    pendingLevelUps: 0
  };
}

export function updateGameState(state, dt) {
  state.time += dt;
}

export function addXp(state, amount) {
  state.xp += amount;
  while (state.xp >= state.xpToNext) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = 10 + state.level * 5;
    state.pendingLevelUps += 1;
  }
}

export function getSpawnRate(state) {
  const minutes = state.time / 60;
  const base = 0.9;
  const byLevel = state.level * 0.18;
  const byTime = minutes * 0.35;
  return base + byLevel + byTime;
}
