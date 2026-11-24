# FoodFlow: заказ и доставка еды из ресторанов

MVP к курсовой работе по дисциплине «Архитектура клиент-серверных приложений»
(тема 19, Кислый А. С., ИКБО-15-24).

Микросервисы на Node.js + TypeScript, общий GraphQL API через Apollo Server
с явными резолверами, MongoDB (своя база у каждого сервиса), брокер событий NATS,
веб-клиент на React.

## Состав

| Каталог | Что внутри | Порт внутри сети |
|---|---|---|
| `gateway` | API Gateway: проверка JWT, выполнение GraphQL-операций, маршрутизация запросов | 4000 (наружу) |
| `services/users-service` | пользователи, регистрация, вход, выдача JWT | 4000 |
| `services/restaurants-service` | рестораны и меню | 4000 |
| `services/orders-service` | заказы, расчёт суммы, статусы | 4000 |
| `services/delivery-service` | задания на доставку, курьеры | 4000 |
| `client` | React-клиент, отдаётся через nginx | 80 (наружу 8080) |
| `k8s` | манифесты Kubernetes и скрипт локального развёртывания | |
| `Jenkinsfile` | CI/CD конвейер | |

## Запуск через Docker Compose

Нужен Docker Desktop.

На macOS вспомогательные скрипты можно выполнять как `bash start.command`, `bash test.command` и `bash stop.command`. Если после клонирования нужен запуск двойным щелчком, сначала выполните `chmod +x start.command test.command stop.command`.

```bash
docker compose up --build
```

Первая сборка идёт несколько минут. Потом:

- клиент: http://localhost:8080
- GraphQL-песочница Apollo: http://localhost:4000

Демо-пользователи создаются сами, пароль у всех `demo123`:

| Email | Роль |
|---|---|
| client@demo.ru | клиент |
| pizza@demo.ru | ресторан «Наполи» |
| sushi@demo.ru | ресторан «Васаби» |
| courier@demo.ru | курьер |

Остановить: `docker compose down` (с удалением данных: `docker compose down -v`).

## Сценарий для демонстрации

1. Войти клиентом, выбрать «Наполи», добавить блюда, оформить заказ.
2. В другом окне (или приватной вкладке) войти как pizza@demo.ru, принять заказ, нажать «Готов к выдаче».
   orders-service публикует событие `order.ready`, delivery-service создаёт задание.
3. Войти курьером: заказ появился в «Свободных». Взять, «Забрал», «Доставил».
   delivery-service шлёт `delivery.status`, orders-service меняет статус заказа.
4. У клиента статус меняется сам (опрос раз в 3 секунды), видно имя курьера.

## Развёртывание в Kubernetes (Docker Desktop)

Включить Kubernetes в настройках Docker Desktop, затем:

```bash
bash k8s/deploy-local.sh
```

Клиент будет на http://localhost:30080. Посмотреть поды: `kubectl -n foodflow get pods`.
Удалить: `kubectl delete namespace foodflow`.

## Тесты

```bash
cd services/orders-service && npm install && npm test
```

Проверяются переходы статусов заказа и расчёт стоимости.

## Диаграммы

`docs/diagrams/*.puml` — рабочие исходники PlantUML. PNG предназначены для отчёта
и презентации, SVG позволяют увеличивать изображения без потери качества.

Все схемы используют UML: usecase — варианты использования, context и components —
компоненты, activity и cicd — деятельность, seq_order и seq_delivery — последовательности,
state — состояния, classes — классы и логические связи данных, deployment — развёртывание.
Варианты с суффиксом presentation и части сценария доставки подготовлены для слайдов.

Для повторной генерации нужен PlantUML и Graphviz:

```bash
java -Djava.awt.headless=true -jar plantuml.jar -tpng docs/diagrams/*.puml
java -Djava.awt.headless=true -jar plantuml.jar -tsvg docs/diagrams/*.puml
```

## Контракт шлюза

Внешняя схема задана в `gateway/src/schema.ts`. Шлюз на Apollo Server проверяет
JWT и вызывает обычные GraphQL API сервисов через явные резолверы.
Связанные поля запрашиваются отдельными внутренними вызовами с тайм-аутом 5 секунд.
Внутренние операции `user`, `deliveryOrder` и `deliveryByOrder` не опубликованы в схеме шлюза.
Доступ к портам сервисов допустим только из внутренней сети.

## Проверка этой редакции

Сборка TypeScript всех шести компонентов, 7 модульных тестов и 10 проверок
сквозного сценария и 8 дополнительных проверок API выполнены успешно на локально запущенных сервисах с MongoDB
7.0.16 и NATS 2.10.26. Docker Compose, Kubernetes и Jenkins в этой среде не запускались.
Проверить контейнерный запуск можно командами из раздела выше и `bash test.command`.

## Автоматическая проверка GitHub

Workflow `.github/workflows/ci.yml` собирает все шесть компонентов на Node.js 22,
выполняет модульные тесты, затем запускает четыре сервиса и шлюз с MongoDB и NATS.
Интеграционная проверка использует `scripts/e2e.mjs` (10 проверок) и
`scripts/api-checks.mjs` (8 проверок прав, JWT и вложенных GraphQL-запросов).

Проверка свободного задания использует точный запрос экрана CourierView,
включая состав блюд и сумму до назначения курьера. Внутренний запрос
`deliveryOrder` проверяет доступ к свободному готовому или своему назначенному заказу.

Версия `@graphql-tools/utils` закреплена override на исправленной версии 12.0.2.
В репозиторий не входят node_modules, dist, локальные журналы, базы данных и .env.
Это учебный MVP с демонстрационными пользователями и тестовым JWT_SECRET;
перед использованием вне локального демонстрационного стенда секрет нужно заменить.
