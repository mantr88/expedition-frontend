# Корпоративний месенджер — фронтенд

Vue 3 + Vite + Pinia + Vue Router + TypeScript. Деталі фаз розробки — у [`../messenger-frontend-plan.md`](../messenger-frontend-plan.md).

## Розробка

```sh
npm install
npm run dev
```

За замовчуванням застосунок працює на мок-шарі (MSW) — бекенд не потрібен.
Щоб підключити реальний бекенд, задайте змінні середовища (наприклад, у `.env.local`):

```
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCKS=false
```

## Команди

```sh
npm run dev            # dev-сервер
npm run build          # типізація + production-білд
npm run test           # Vitest
npm run lint           # ESLint
npm run format         # Prettier — виправити
npm run format:check   # Prettier — перевірити
```
