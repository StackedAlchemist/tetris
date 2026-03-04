# 🧩 Arcane Tetris

> *"Align the arcane shapes before they fall into chaos."*

A fully featured Tetris implementation with an arcane fantasy theme. Built on the HTML5 Canvas API with ghost piece preview, hold mechanic, score multipliers, and smooth controls.

**[🎮 Play Now](https://stackedalchemist.github.io/stacked-alchemist/tetris/)**

---

## ✦ Features

- **Ghost Piece** — Translucent preview showing where the piece will land
- **Hold Mechanic** — Swap the current piece with a held piece once per drop
- **Next Piece Preview** — See the upcoming piece before it spawns
- **Score Multipliers** — Clearing multiple lines at once rewards escalating points
- **Progressive Levels** — Drop speed increases as your score climbs
- **Glowing Arcane Pieces** — Each tetromino styled with arcane color and glow effects
- **Keyboard & Touch Controls** — Full keyboard support plus mobile-friendly buttons
- **Pause / Resume** — Mid-game pause with overlay

---

## 🛠 Tech Stack

| Technology | Usage |
|---|---|
| HTML5 Canvas | Game board and piece rendering |
| Vanilla JavaScript | Game loop, collision detection, rotation logic |
| CSS3 | UI overlays, animations, arcane theme |

---

## 🎮 Controls

| Action | Key |
|---|---|
| Move Left | `←` or `A` |
| Move Right | `→` or `D` |
| Rotate | `↑` or `W` |
| Soft Drop | `↓` or `S` |
| Hard Drop | `Space` |
| Pause | `P` |

---

## 📐 Scoring

| Lines Cleared | Points |
|---|---|
| 1 line | 100 × level |
| 2 lines | 300 × level |
| 3 lines | 500 × level |
| 4 lines (Tetris) | 800 × level |

---

## 🚀 Running Locally

```bash
git clone https://github.com/StackedAlchemist/stacked-alchemist.git
cd Portfolio/tetris
# Open index.html in your browser
```

---

## 📁 File Structure

```
tetris/
├── index.html    # Game shell
├── styles.css    # Arcane theme styles
└── main.js       # Full game logic
```

---

*Built by [Billy Williams](https://stackedalchemist.github.io/stacked-alchemist/) — Stacked Alchemist*
