# 🧩 @trackplay/runtime

**TrackPlay Runtime** es el paquete base responsable de **ejecutar y orquestar** los servicios del ecosistema `TrackPlay`, proporcionando un entorno unificado para inicializar aplicaciones, registrar rutas y aplicar middlewares de forma tipada, modular y consistente.

Su propósito es ofrecer una capa de ejecución común para todos los servicios y aplicaciones del ecosistema (por ejemplo: `trackplay-auth`, `trackplay-catalog`, `trackplay-notifications`, `trackplay-frontend`, etc.), asegurando que el código permanezca DRY, cohesionado y fácil de mantener en cualquier entorno.

---

## 📦 Contenido

El paquete incluye:

### ✅ Middlewares

- Middlewares genéricos para Express:
  - `applyMiddlewares`: aplica múltiples middlewares de forma declarativa..
  - `createErrorHandler`: gestiona errores de forma centralizada y traducible.
  - `createNotFoundHandler`: maneja rutas inexistentes con respuestas estandarizadas.
- Totalmente configurables mediante las opciones tipadas de `MiddlewareOptions`.

### ✅ Routes

- Estandariza cómo los módulos registran sus rutas dentro de Express.
- Asegura un **desacoplamiento total** entre el framework HTTP y la lógica de negocio.
- Facilita la **composición, testabilidad y reutilización** de módulos HTTP sin depender del contenedor o del servidor principal.

### ✅ Runtime

- `bootstrap.ts` actúa como punto de entrada unificado para inicializar cualquier microservicio de TrackPlay.
- Se encarga de:
  - Validar variables de entorno y secretos antes del arranque.
  - Configurar `logger` e internacionalización (`i18n`) de forma global.
  - Construir y registrar dependencias siguiendo la jerarquía hexagonal
    (`adapters → services → useCases → controllers`).
  - Aplicar middlewares, registrar rutas y levantar el servidor HTTP.
- Su objetivo es garantizar un flujo de arranque **consistente, seguro y totalmente tipado** entre todos los servicios del ecosistema.

### ✅ Types

- Tipos e interfaces globales compartidos:
- `ErrorHandlerOptions`, `MiddlewareOptions`, `DependencyFactories`, `DependencyLayers`, `EnvSecretsBundle`, etc.
- Mantiene la **consistencia tipada** y reduce la duplicación entre los distintos microservicios y librerías de TrackPlay.

---

## 🚀 Publicación de versiones

Siempre que se introduzcan mejoras o cambios relevantes en el paquete, es necesario seguir este flujo:

### 1. 📦 Incrementar la versión del paquete

Modifica el campo `version` en `package.json` siguiendo [semver](https://semver.org/lang/es/):

```json
{
  "name": "@trackplay/runtime",
  "version": "1.2.0"
}
```

### 2. 💾 Commit y push de los cambios

Asegúrate de guardar y subir los cambios a Git:

```bash
git add .
git commit -m "chore: bump version to 1.2.0"
git push origin develop
```

### 3. 🛠 Compilar y empaquetar el módulo

Ejecuta el build y genera el paquete comprimido:

```bash
pnpm run build
pnpm pack
```

Esto generará un archivo como: `trackplay-runtime-1.2.0.tgz`

### 4. 🚀 Publicar en el registry

Para publicar en el registro de NPM (por ejemplo, GitHub Packages), necesitas tener un archivo .npmrc configurado correctamente:

✅ .npmrc mínimo para GitHub Packages:

```ini
@YOUR_DIRECTORY:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

🔐 El authToken debe tener permisos de publicación (write:packages).

Luego publica con:

```bash
pnpm publish
```

### 5. 🔄 Actualizar dependencias en los demás repositorios

Una vez publicada la nueva versión, actualiza la dependencia en cada repositorio que consuma @trackplay/runtime:

```bash
ncu
ncu -u
pnpm install
```
