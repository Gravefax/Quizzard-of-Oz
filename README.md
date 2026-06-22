# Quizzard of Oz

<p align="center">
  <img src="docs/logo.jpg" alt="Quizzard of Oz Logo" width="200"/>
</p>

<p align="center"><b>Beweise dein Wissen. Besiege deine Rivalen.</b></p>

<p align="center">
  <a href="https://quizzard-of-oz.readthedocs.io/en/latest/"><img src="https://img.shields.io/badge/docs-quizzard--of--oz-blue" alt="Dokumentation"/></a>
  <a href="https://github.com/Gravefax/SQS-Team-11/actions/workflows/ci.yml"><img src="https://github.com/Gravefax/SQS-Team-11/actions/workflows/ci.yml/badge.svg" alt="CI"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=alert_status" alt="Quality Gate Status"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=bugs" alt="Bugs"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=code_smells" alt="Code Smells"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=coverage" alt="Coverage"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=duplicated_lines_density" alt="Duplicated Lines (%)"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=ncloc" alt="Lines of Code"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=reliability_rating" alt="Reliability Rating"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=security_rating" alt="Security Rating"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=sqale_index" alt="Technical Debt"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=sqale_rating" alt="Maintainability Rating"/></a>
  <a href="https://sonarcloud.io/summary/new_code?id=Gravefax_SQS-Team-11"><img src="https://sonarcloud.io/api/project_badges/measure?project=Gravefax_SQS-Team-11&metric=vulnerabilities" alt="Vulnerabilities"/></a>
</p>

**Quizzard of Oz** ist eine Echtzeit-Multiplayer-Quizanwendung, die im Rahmen des Moduls *Software Quality and Security* im Masterstudiengang Informatik an der Technischen Hochschule Rosenheim entwickelt wurde.

Die vollständige Architekturdokumentation ist auf [Read the Docs](https://quizzard-of-oz.readthedocs.io/en/latest/) verfügbar.

## Funktionen

- **1v1-Echtzeit-Battles** — Spieler treten per WebSocket-basiertem Matchmaking gegeneinander an
- **Übungsmodus** — Fragen einzeln beantworten ohne Gegner
- **Rangliste** — Globales Leaderboard mit Punktestand und Siege/Niederlagen-Statistik
- **Fragen-Engine** — Fragen werden automatisch über die [The Trivia API](https://the-trivia-api.com/) geladen und lokal gecacht
- **Authentifizierung** — Sichere Anmeldung über Keycloak (OIDC), Realm wird automatisch beim Start importiert

## Technologien

| Bereich | Stack |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 |
| Backend | FastAPI · SQLAlchemy · PostgreSQL 18 |
| Auth | Keycloak 26 |
| Tests | Vitest · Playwright · pytest |
| CI/CD | GitHub Actions · SonarCloud |

## Quickstart

Voraussetzung: [Docker](https://www.docker.com/) und Docker Compose

```bash
git clone https://github.com/Gravefax/SQS-Team-11
cd Quizzard-of-Oz
cp .env.example .env
docker compose up -d
```

Die Anwendung ist danach unter **http://localhost:3000** erreichbar.

## Contributors

<a href="https://github.com/Gravefax/SQS-Team-11/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Gravefax/SQS-Team-11" alt="Contributors"/>
</a>

<sub>Made with [contrib.rocks](https://contrib.rocks)</sub>
