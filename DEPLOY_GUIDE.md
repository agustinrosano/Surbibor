# 🚀 Guía de Despliegue: BubbaSurvivor (Server)

Esta guía explica cómo subir tu servidor multijugador (`svnode`) a **Render.com** de forma gratuita.

## 1. Preparar tu Repositorio
Asegúrate de que tu código esté en **GitHub**. Render leerá los archivos directamente desde allí.

## 2. Configurar en Render.com
1. Crea una cuenta en [Render.com](https://render.com).
2. Haz clic en **"New"** (botón azul) -> **"Web Service"**.
3. Conecta tu cuenta de GitHub y selecciona el repositorio de **bubasuribibor**.
4. Configura los siguientes campos:
   - **Name**: `bubba-server` (o el que prefieras).
   - **Region**: Selecciona la más cercana (ej: Ohio o Frankfurt).
   - **Branch**: `master` (o tu rama principal).
   - **Root Directory**: `svnode` (¡Muy importante! Esto le dice a Render que el servidor está en esa carpeta).
   - **Runtime**: `Node`.
   - **Build Command**: `npm install`.
   - **Start Command**: `npm start`.

## 3. Seleccionar Plan
Elige el plan **"Free"** ($0/month).

## 4. Obtener tu URL
Una vez que el despliegue termine (verás un mensaje de "Live"), Render te dará una URL en la parte superior izquierda, algo como:
`https://bubba-server-xxxx.onrender.com`

## 5. Paso Final en el Código
1. Abre `src/engine/NetworkManager.ts` en tu editor.
2. Busca la variable `PROD_URL`.
3. Pega la URL que te dio Render:
   ```typescript
   const PROD_URL = 'https://tu-url-de-render.onrender.com';
   ```
4. Sube este cambio a GitHub. Vercel actualizará el juego automáticamente y ya estará conectado al nuevo servidor online.

---

### 🔒 Seguridad (CORS)
El archivo `server.js` ya está configurado para aceptar peticiones **únicamente** desde tu URL de Vercel:
`https://surbibor-zl6b.vercel.app`

Esto evita que otras personas usen tu servidor para sus propios juegos.
