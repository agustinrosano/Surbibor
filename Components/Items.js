export const items = {
  heal_potion: {
    id: 'heal_potion',
    name: 'Pocion de Vida',
    description: 'Recupera 2 HP.',
    apply(player) {
      player.hp = Math.min(player.maxHp, player.hp + 2);
    }
  },
  armor_plate: {
    id: 'armor_plate',
    name: 'Armadura',
    description: 'Reduce el dano recibido.',
    apply(player) {
      player.armor = Math.min(5, player.armor + 1);
    }
  }
};

export function getItem(id) {
  return items[id];
}
