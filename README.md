# Minesweeper Chess Backend ♟️🔥

Socket.IO + Node.js + Express server powering the multiplayer logic for Minesweeper Chess. Click [here](https://github.com/azhang4216/minesweeper-chess-frontend) for the frontend repo.

## 🧠 Tech Stack

- Node.js
- Express
- Socket.IO
- chess.js
- JWT (planned)
- PostgreSQL (planned)
- Redis (planned)

## 🔧 Features

- Real-time WebSocket communication with clients
- Game state management using `chess.js`
- Room-based gameplay with Socket.IO
- Support for custom rules (bombs, detonation)
- Future plans for matchmaking and persistence

## 🏗️ System Architecture

- Express server for base HTTP and API routes
- Socket.IO for multiplayer connections
- Game instances maintained per room in memory
- Optional Redis for scaling and queueing
- Optional PostgreSQL for long-term persistence

## 📦 Setup

### Prerequisites

- Node.js (v16+)
- Redis and PostgreSQL (optional for now)

### Installation

```bash
git clone https://github.com/yourusername/minesweeper-chess-backend.git
cd minesweeper-chess-backend
npm install
```

### Running the server

```bash
node index.js
```

Server will start on:  
📍 `http://localhost:4000`

## 📁 Environment Variables

Create a `.env` file:

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=bombchess

REDIS_HOST=localhost
REDIS_PORT=6379
```

## 🔁 Socket.IO Events

| Event         | Payload                        | Description                              |
| ------------- | ------------------------------ | ---------------------------------------- |
| `joinGame`    | `{ roomId, playerInfo }`       | Player joins a specific room             |
| `makeMove`    | `{ from, to, promotion }`      | Player attempts a legal move             |
| `placeBombs`  | `{ squares }`                  | Player places 3 bombs before starting    |
| `gameUpdate`  | `{ fen, turn, bombsRemaining }`| Broadcasts updated board state           |
| `invalidMove` | `{ message }`                  | Notifies player of illegal move          |

## 📈 Future Scaling

- Use Redis for game state replication
- Horizontal scaling with WebSocket-aware load balancers
- Store replays and results in PostgreSQL
- Add Redis pub/sub for multi-instance broadcasting

## 📄 License

MIT License

## 🙌 Contributing

Pull requests welcome!

1. Fork the repo  
2. Create a branch  
3. Push your changes  
4. Open a Pull Request