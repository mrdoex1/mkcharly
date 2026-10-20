# 📋 Guía de Publicación · Google Sheets ↔ Apps Script

Esta guía explica cómo conectar tu Pizarra Digital (`index.html`) a Google Sheets para que **todos los celulares de las mesas se actualicen en tiempo real** cuando Charly edite el menú o cuando el garzón marque un plato como agotado.

---

## 🚀 Pasos de configuración (5 minutos)

### 1️⃣ Crear la hoja de cálculo
1. Entra a [sheet.new](https://sheet.new) para crear un nuevo Google Sheet.
2. Nómbralo como **"Menú del Día - Charly"**.

### 2️⃣ Pegar el código de Apps Script
1. En el menú superior de tu Google Sheet, ve a **Extensiones → Apps Script**.
2. Borra cualquier código que aparezca en el editor (`Code.gs`).
3. Copia y pega el contenido completo del archivo **`Code.gs`** (que ya se encuentra en tu carpeta del proyecto).
4. Guarda el archivo con el ícono de disquete (💾).

*(Nota: La primera vez que la app lea o escriba en la hoja, las pestañas `Menu` y `Globales` se crearán y sembrarán automáticamente con los datos de ejemplo).*

### 3️⃣ Publicar como Aplicación Web (Web App)
1. Arriba a la derecha en Apps Script, haz clic en el botón azul **Desplegar** (Deploy) → **Nueva implementación**.
2. En **Seleccionar tipo**, haz clic en el ícono de engranaje ⚙️ y elige **Aplicación web**.
3. Configura lo siguiente:
   - **Descripción:** `Pizarra Charly v1`
   - **Ejecutar como:** `Yo` (tu cuenta de Google)
   - **Quién tiene acceso:** `Cualquiera` *(Cualquier usuario, incluso anónimo, para que los clientes escaneen el QR y lean sin loguearse).*
4. Haz clic en **Desplegar**. Google te pedirá autorizar los permisos de tu cuenta (haz clic en *Avanzado* → *Ir a Sin título/Pizarra (inseguro)* → *Permitir*).
5. Copia la **URL de la aplicación web** (termina en `/exec`).

### 4️⃣ Conectar tu Pizarra (`index.html`)
1. Abre tu archivo `index.html` en un editor de texto.
2. Busca en la sección CONFIG (alrededor de la línea 185) la variable `dataUrl`:
   ```js
   dataUrl: "https://script.google.com/macros/s/AYFW.../exec",
   ```
3. Pega tu URL de Apps Script entre las comillas.
4. Guarda el archivo.

---

## ✨ ¡Listo! ¿Cómo opera ahora?
- **Charly (Dueño):** Edita platos, precios o notas en Google Sheets. Todos los celulares de los clientes se sincronizan automáticamente cada **25 segundos** (polling).
- **Garzón:** Toca el botón 🔒 en la esquina de la pizarra, ingresa su PIN (`1234`) y marca un plato o acompañamiento como agotado. Eso hace un `POST` automático a Apps Script (`doPost`), actualiza la hoja y **todas las mesas lo ven al instante sin recargar la página**.
- **Cliente:** Ve la pizarra limpia con las inclusiones fijas ("Ensalada mixta + Bebida gratis") y la disponibilidad en tiempo real con solo escanear el código QR.
