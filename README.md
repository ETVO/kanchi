# 🎯 Kanchi - Interactive Kanban Board

A lightweight, physics-enabled Kanban board application with floating task cards that drift across the screen. Built with vanilla JavaScript for maximum simplicity and performance.

## ✨ Overview

**Pure vanilla JavaScript** application that runs directly from `index.html` - no frameworks, no build process, no dependencies. Kanchi brings a unique twist to traditional Kanban boards with animated floating task cards that gently drift and sway until you're ready to organize them.

Developed in collaboration with [Warp Agentic Terminal](https://www.warp.dev/) as a demonstration of interactive UI physics and drag-and-drop functionality.

https://github.com/user-attachments/assets/0fee0acb-f8b2-4906-8f47-70c92200530f

## 🌟 Key Features

- **Floating Task Cards** - Unassigned tasks drift across the screen with gentle physics animations
- **Drag & Drop Everything** - Move cards between columns, reorder columns, or let tasks float freely
- **Local Storage** - All board state persists in your browser using localStorage
- **No Dependencies** - Pure vanilla JavaScript with no external libraries
- **Physics Simulation** - Realistic wind, sway, and falling animations for floating cards
- **Fully Offline** - Runs statically from `index.html`, no server needed

## 🛠️ Tech Stack

- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- localStorage for persistence
- Custom physics engine for floating card animations

## 🚀 Getting Started

### Quick Start (No Build Required)

This application runs directly in your browser with no setup:
```bash
# Clone the repository
git clone https://github.com/ETVO/kanchi.git
cd kanchi

# Open index.html in your browser - that's it!
```

Simply double-click `index.html` or open it in any modern browser. No installation, no build process, no dependencies.

## 🎮 How to Use

1. **Add Tasks** - Type in the input field at the top and press Enter to create floating task cards
2. **Create Columns** - Click "Add Column" to create new workflow stages
3. **Organize Tasks** - Drag floating cards onto columns to organize your work
4. **Move Cards** - Drag cards between columns to update their status
5. **Reorder Columns** - Use the drag handle (⋮⋮) to reorder columns
6. **Delete Items** - Drag cards or columns to the trash can to remove them

## 💡 Features Explained

### Floating Task Cards
Unassigned tasks appear as floating papers that gently drift across the screen with physics-based animations including:
- Wind-like sideways sway
- Gradual falling motion
- Rotation based on velocity
- Infinite vertical wrapping (cards respawn at the top when they fall off the bottom)

### Drag & Drop Interactions
- **Card → Column**: Assigns the task to that workflow stage
- **Card → Card**: Reorders within a column
- **Card → Empty Space**: Unassigns and creates a floating card
- **Column → Column**: Reorders your workflow stages
- **Anything → Trash**: Deletes the item

## 🎨 Customization

The application uses straightforward CSS for styling and can be easily customized by editing:
- Card appearance and animations
- Column styling and layout
- Physics parameters (wind speed, fall rate, rotation)
- Color scheme and typography

## 🧠 Learning Highlights

This project demonstrates:
- Custom physics simulation in JavaScript
- Efficient DOM manipulation without frameworks
- Pointer events API for drag interactions
- localStorage for state persistence
- Transform-based animations
- Collision detection and drop target logic

## 👤 Author

**Estevão Pereira Rolim** - [@ETVO](https://github.com/ETVO) | [LinkedIn](https://linkedin.com/in/estevao-p-rolim)

---

*Developed in collaboration with [Warp Agentic Terminal](https://www.warp.dev/).*

*README generated in collaboration with Claude AI.*

