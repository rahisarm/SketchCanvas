# 🎨 SketchCanvas

A powerful, hand-drawn style web whiteboard built with **React**, **Zustand**, and **Rough.js**. Create diagrams, sketches, and wireframes with a premium "sketchy" feel.

![SketchCanvas Demo](https://via.placeholder.com)

## ✨ Features

- **Hand-Drawn Aesthetics**: powered by Rough.js for that authentic whiteboard feel.
- **Rich Library**: 400+ Searchable tech icons (React, Docker, AWS, etc.) out-of-the-box.
- **Layer Management**: Full Z-index control (Bring to Front, Send to Back) for complex compositions.
- **Copy & Paste**: Efficient workflow with `Ctrl+C` and `Ctrl+V` support.
- **Interactive Tools**: 
    - ✏️ Freehand Drawing
    - 📐 Geometric Shapes (Rectangle, Ellipse, Diamond, Star, Hexagon)
    - ➡️ Smart Arrows & Lines
    - 🔠 Text Support with custom fonts
- **Canvas Controls**:
    - 🔍 Zoom & Pan
    - 📏 Snap to Grid (Dot or Line grids)
    - 📄 Paper Texture & Solid Backgrounds
- **Productivity**:
    - ↩️ Undo / Redo history (60 steps)
    - ⌨️ Advanced Keyboard Shortcuts
    - 💾 Real-time Persistence via LocalStorage

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Rendering Engine**: [Rough.js](https://roughjs.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/sketchcanvas.git
   ```

2. Install dependencies:
   ```bash
   cd sketchcanvas
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## ⌨️ Shortcuts

| Key | Action |
| --- | --- |
| `V` | Select Tool |
| `R` | Rectangle |
| `E` | Ellipse |
| `A` | Arrow |
| `L` | Line |
| `T` | Text |
| `X` | Eraser |
| `]` / `[` | Bring Forward / Send Backward |
| `Shift + ]` / `[` | Bring to Front / Send to Back |
| `Ctrl + C` / `V` | Copy / Paste |
| `Ctrl + Z` / `Y` | Undo / Redo |
| `Del` | Delete Selected |

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
Built with ❤️ by [Rahis](https://github.com/rahisarm)
