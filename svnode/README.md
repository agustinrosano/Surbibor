# BubbaSurvivor Multiplayer Server

Este es el servidor WebSocket para la funcionalidad multijugador.

## Instrucciones para ejecutar:

1. Abre una terminal en esta carpeta (`svnode`).
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor:
   ```bash
   npm start
   ```

El servidor escuchará por defecto en el puerto **3000**. 

## Funcionalidades preparadas:
- **Salas (Rooms)**: Sistema para agrupar jugadores.
- **Sincronización de Posición**: Envía datos de X, Y y animación a los demás.
- **Eventos de Conexión/Desconexión**: Avisa cuando alguien entra o sale.
