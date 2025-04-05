# 3D Truck Game

A multiplayer 3D truck driving game built with Three.js and Socket.io.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Start the game server:
```bash
npm run server
```

## Deployment

1. Create a Render.com account
2. Create a new Web Service
3. Connect your GitHub repository
4. Set the following environment variables:
   - NODE_VERSION: 18.x
5. Deploy!

## Playing the Game

1. Open the game in your browser
2. Use WASD to control your truck:
   - W: Accelerate forward
   - S: Accelerate backward
   - A: Turn left
   - D: Turn right

## Multiplayer

The game supports multiplayer through Socket.io. Players can join from anywhere by accessing the same URL. 