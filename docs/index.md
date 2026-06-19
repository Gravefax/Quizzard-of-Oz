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
    <a class="button secondary" href="planning.html">Read the planning doc</a>
  </div>
</section>

<section class="cards">
  <a class="card" href="architecture.html">
    <span class="card-label">Architecture</span>
    <h2>arc42-style system overview</h2>
    <p>Understand the core building blocks, constraints, runtime expectations, and deployment shape.</p>
  </a>
  <a class="card" href="planning.html">
    <span class="card-label">Planning</span>
    <h2>Gameplay, sessions, and data model</h2>
    <p>Review the concept document, game modes, matchmaking approach, and initial database design.</p>
  </a>
  <a class="card" href="decisions.html">
    <span class="card-label">ADRs</span>
    <h2>Key technology decisions</h2>
    <p>Track the current decisions behind the frontend, backend, and package management stack.</p>
  </a>
  <a class="card" href="test-concept.html">
    <span class="card-label">Testing</span>
    <h2>Documented test concept</h2>
    <p>Review the test levels, tools, CI quality gates, coverage reports, and known test gaps.</p>
  </a>
</section>
```

## Quick Start

- Start with [Architecture](architecture.md) if you need the big-picture system design.
- Open [Planning](planning.md) if you want the gameplay rules, flow, and domain model.
- Review [Architecture Decisions](decisions.md) when you need the reasoning behind the chosen stack.
- Read [Test Concept](test-concept.md) when you need the test strategy, quality gates, and execution commands.

## Project Links

- Repository: [SQS-Team-11](https://github.com/Gravefax/SQS-Team-11)
- Read the Docs: [Published documentation](https://sqs-team-11.readthedocs.io/en/latest/)

## Visual Overview

![Ranked and unranked session flow](images/ranked_session_flow.svg)

```{toctree}
:maxdepth: 2
:caption: Documentation
:hidden:

architecture
planning
decisions
test-concept
```
