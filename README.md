# NodeJS Challenge

This is the NodeJS Challenge project. It is built with Node.js, Express, and Prisma, and connects to a MySQL database.

## Table of Contents

- [Backend](#backend)
    - [Technologies](#technologies)
    - [Setup](#setup)
    - [Usage](#usage)
    - [Endpoints](#endpoints)
    - [Websocket](#websocket)
- [Frontend](#frontend)
    - [Technologies](#technologies)
    - [Setup](#setup)
    - [Usage](#usage)
    - [Components](#components)
- [Contributing](#contributing)
- [License](#license)
- [Author](#author)


## Backend
### Technologies
- Node.js
- Express
- WebSocket
- MySQL
- Prisma ORM

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jetsunnalgonda/nodejs-challenge.git
   cd nodejs-challenge
    ```

2. Install dependencies:
   ```bash
   npm install
    ```
3. Set up your environment variables. Create a .env file in the root directory and add the following:
   ```env
   PORT=3010
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=password
   DB_NAME=your_database
   JWT_SECRET=your_jwt_secret
    ```
4. Run database migrations:
    ```bash
    npx prisma migrate dev
    ```
5. Seed the database:
    ```bash
    npm seed
    ```
6. Start the server:
    ```bash
    npm start
    ```
## Usage

- The backend server runs on http://localhost:3010.

- WebSocket connections are available at ws://localhost:3020.

## Endpoints
- GET /feed: Fetch nearby users. Requires latitude, longitude, and radiusKm as query parameters.
- POST /like: Like a user. Requires userId in the request body.
- POST /register: Register a new user. Requires user details in the request body.
- POST /login: Authenticate a user. Requires email and password.

### Example server-side WebSocket code:
```javascript
    const WebSocket = require('ws');

    const wss = new WebSocket.Server({ port: 3020 });

    wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        console.log('Received message:', parsedMessage);

        if (parsedMessage.action === 'like') {
        const userId = parsedMessage.userId;
        console.log('User liked with ID:', userId);
        }
    });

    ws.send(JSON.stringify({ action: 'welcome', message: 'Connection established' }));
    });
```

## Frontend
### Technologies
- Vue.js
- Vuex
- Vue Router
- Axios
- WebSocket
- Google Maps

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jetsunnalgonda/nodejs-challenge-frontend.git
   cd your-repo
2. Install dependencies
    ```bash
    cd frontend
    npm install
3. Create a .env file in the frontend directory with the following variables:
    ```bash
    VUE_APP_API_BASE_URL=http://localhost:3010
    VUE_APP_WEBSOCKET_URL=ws://localhost:3020
4. Start the development server:
    ```bash
    npm run serve
## Usage 
The frontend application runs on http://localhost:3011.

## Components
- `Home.vue`: Displays nearby users and handles user interactions, including WebSocket setup and liking users.
- `MapPopup.vue`: Displays a Google Map in a popup for location selection.

### Example WebSocket setup in Vue component:
```javascript
    export default {
    name: 'HomePage',
    data() {
        return {
        users: [],
        socket: null,
        selectedUser: null,
        };
    },
    mounted() {
        this.setupWebSocket();
    },
    methods: {
        setupWebSocket() {
        this.socket = new WebSocket(process.env.VUE_APP_WEBSOCKET_URL);

        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log('WebSocket message received:', message);
        };

        this.socket.onopen = () => {
            console.log('WebSocket connection opened');
        };

        this.socket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
        },
        likeUser(userId) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ action: 'like', userId }));
        }
        },
    },
    };
```

## Contributing
Feel free to submit issues or pull requests. Please follow the existing code style and write tests for any new features.

## License
This project is licensed under the MIT License.

## Author

[@jetsunnalgonda](https://www.github.com/jetsunnalgonda)

Programmed by Haluk Isik.

August 2024

