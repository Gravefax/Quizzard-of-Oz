# Quizzard of Oz

```{raw} html
<section class="hero">
  <p class="hero-kicker">Project Documentation</p>
  <h1>Build a multiplayer quiz platform with confidence.</h1>
  <p class="hero-lead">
    Quizzard of Oz combines casual play, ranked competition, and a clear system
    architecture. This documentation gives the team one place for product
    intent, technical direction, and architecture decisions.
  </p>
  <div class="hero-actions">
    <a class="button primary" href="architecture.html">Explore architecture</a>
    <a class="button secondary" href="installation.html">Get started</a>
  </div>
</section>

<section class="section-cards" aria-label="Documentation sections">
  <a class="section-card" href="installation.html">
    <span class="card-label">Installation</span>
    <h2>Get the app running</h2>
    <p>Clone the repository, copy the environment file, and start all four services with a single Docker Compose command.</p>
  </a>
  <a class="section-card" href="usage.html">
    <span class="card-label">Usage</span>
    <h2>App features and flows</h2>
    <p>Register, enter ranked matchmaking, play practice quizzes, and read the leaderboard — explained step by step.</p>
  </a>
  <a class="section-card" href="architecture.html">
    <span class="card-label">Architecture</span>
    <h2>arc42-style system overview</h2>
    <p>Understand the core building blocks, constraints, runtime expectations, and deployment shape.</p>
  </a>
  <a class="section-card" href="decisions.html">
    <span class="card-label">ADRs</span>
    <h2>Key technology decisions</h2>
    <p>Track the current decisions behind the frontend, backend, and package management stack.</p>
  </a>
  <a class="section-card" href="test-concept.html">
    <span class="card-label">Testing</span>
    <h2>Documented test concept</h2>
    <p>Review the test levels, tools, CI quality gates, coverage reports, and known test gaps.</p>
  </a>
</section>
```

## Quick Start

- Follow [Installation](installation.md) to get the application running locally with Docker.
- Read [Usage](usage.md) for a walkthrough of practice mode, ranked battles, and the leaderboard.
- Start with [Architecture](architecture.md) if you need the big-picture system design.
- Review [Architecture Decisions](decisions.md) when you need the reasoning behind the chosen stack.
- Read [Test Concept](test-concept.md) when you need the test strategy, quality gates, and execution commands.

## Project Links

- Repository: [SQS-Team-11](https://github.com/Gravefax/SQS-Team-11)
- Read the Docs: [Published documentation](https://quizzard-of-oz.readthedocs.io/en/latest)

```{toctree}
:maxdepth: 2
:caption: Documentation
:hidden:

installation
usage
architecture
decisions
test-concept
```
