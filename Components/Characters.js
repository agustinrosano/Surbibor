export const characters = {
  gunner: {
    id: 'gunner',
    name: 'Gunner',
    description: 'Disparo automatico a distancia.',
    baseStats: {
      speed: 2.2,
      maxHp: 5
    },
    startingAbilities: ['basic_shot']
  },
  striker: {
    id: 'striker',
    name: 'Striker',
    description: 'Golpe en linea recta de corto alcance.',
    baseStats: {
      speed: 2.4,
      maxHp: 5
    },
    startingAbilities: ['line_strike']
  }
};

export function getCharacter(id) {
  return characters[id] || characters.gunner;
}
