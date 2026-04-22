# Rapid-Recall

Rapid-Recall is a real-time, competitive multiplayer word game built on WebSockets. Players must think fast to input words matching specific categories (Name, Place, Animal, Object) that begin with a randomly assigned target letter, all before the 60-second timer runs out. 

##  Features
* **Real-Time Multiplayer:** Instant synchronization across all connected clients using Socket.io.
* **Dynamic Squad Scaling:** Host lobbies for 2 to 6 players, with adjustable mission durations (3 to 10 rounds).
* **Peer-Verification System:** A built-in voting phase where players approve or reject opponents' answers.
* **Archive Collision Detection:** Global round-memory prevents players from reusing words from previous rounds.
* **Elite Cyberpunk UI:** Custom glassmorphism cards, glowing neon typography, avatar selection, and a custom Toast Notification engine.

## Tech Stack
* **Backend:** Node.js, Express.js
* **WebSockets:** Socket.io
* **Frontend:** Vanilla HTML5, CSS3, JavaScript

## Local Installation
To run this game on your local machine:

1. Clone the repository:
   ```bash
   git clone [https://github.com/mauryaanant/rapid-recall.git](https://github.com/mauryaanant/rapid-recall.git)
