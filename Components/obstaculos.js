export function createObstaculos(worldWidth = 800, worldHeight = 800, cantidad = 20) {
  const tipos = ['arbol', 'valla', 'piedra'];
  const obstaculos = [];
  for (let i = 0; i < cantidad; i++) {
    const tipo = tipos[Math.floor(Math.random() * tipos.length)];
    let width = 40, height = 40;
    if (tipo === 'arbol') { width = 45; height = 55; }
    if (tipo === 'valla') { width = 40; height = 8; }
    if (tipo === 'piedra') { width = 10; height = 10; }
    const x = Math.random() * (worldWidth - width);
    const y = Math.random() * (worldHeight - height);
    obstaculos.push({ x, y, width, height, tipo });
  }
  return obstaculos;
}

const treeImage = new Image();
treeImage.src = '/Assets/Tree.png'; // Corrige la ruta si es necesario

export function drawObstaculos(ctx, obstaculos) {
  obstaculos.forEach(obj => {
    switch (obj.tipo) {
      case 'arbol':
        if (treeImage.complete && treeImage.naturalWidth !== 0) {
          ctx.drawImage(treeImage, obj.x, obj.y, obj.width, obj.height);
        } else {
          ctx.fillStyle = 'gray';
          ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        }
        break;
      case 'valla':
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        break;
      case 'piedra':
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.arc(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
  });
}