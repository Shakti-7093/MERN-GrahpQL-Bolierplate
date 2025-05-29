# MERN-GraphQL Real-Time Application

A full-stack MERN (MongoDB, Express.js, React, Node.js) application with GraphQL subscriptions for real-time updates.

## Project Structure

```
MERN-GraphQL/
├── Server/                 # Backend GraphQL Server
│   ├── src/
│   │   ├── graphql/       # GraphQL schema and resolvers
│   │   ├── models/        # MongoDB models
│   │   ├── websocket/     # WebSocket configuration
│   │   └── AsyncIterator/ # Subscription handling
│   └── package.json
│
└── application/           # Desktop Client Application
    ├── src/              # Source code
    ├── build/            # Build resources
    └── package.json
```

## Prerequisites

- Node.js (v16 or later)
- MongoDB
- npm or yarn

## Server Setup

1. Navigate to the Server directory:
   ```bash
   cd Server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the Server directory:
   ```
   PORT=4000
   MONGODB_URI=mongodb://localhost:27017/your_database
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000` with GraphQL playground available at `http://localhost:4000/graphql`.

## Desktop Client Setup

### Development

1. Navigate to the application directory:
   ```bash
   cd application
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Distribution

#### Windows
```bash
npm run build:win        # Creates portable exe
npm run build:win:nsis   # Creates installer
```

#### macOS
```bash
npm run build:mac        # Creates zip file
```

#### Linux
```bash
npm run build:linux      # Creates AppImage and deb
```

## Features

### Server
- GraphQL API with real-time subscriptions
- WebSocket server for GraphQL subscriptions
- MongoDB integration
- User and Todo management
- Real-time event broadcasting

### Desktop Client
- Real-time subscription updates
- Cross-platform support (Windows, macOS, Linux)
- User-friendly interface
- WebSocket connection management
- Error handling and reconnection

## API Documentation

### GraphQL Endpoints

- Main endpoint: `http://localhost:4000/graphql`
- WebSocket endpoint: `ws://localhost:4000/graphql-subscriptions`

### Available Queries

```graphql
query {
  users {
    id
    name
    email
  }
  todos {
    id
    title
    completed
  }
}
```

### Available Mutations

```graphql
mutation {
  createUser(name: String!, email: String!) {
    id
    name
    email
  }
  createTodo(title: String!) {
    id
    title
    completed
  }
}
```

### Available Subscriptions

```graphql
subscription {
  newUser {
    id
    name
    email
  }
  newTodo {
    id
    title
    completed
  }
}
```

## Deployment

### Server Deployment
1. Set up MongoDB database
2. Configure environment variables
3. Deploy to your preferred hosting service (e.g., Heroku, DigitalOcean)

### Client Distribution
- Windows: Distribute `.exe` installer or portable version
- macOS: Distribute `.app` bundle
- Linux: Distribute `.AppImage` or `.deb` package

## Troubleshooting

### Server Issues
- Check MongoDB connection
- Verify WebSocket server is running
- Check GraphQL playground for API testing
- Review server logs for errors

### Client Issues
- Verify WebSocket URL configuration
- Check network connectivity
- Ensure server is running and accessible
- Review client logs for errors

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, please:
1. Check the troubleshooting guide
2. Review the documentation
3. Open an issue on GitHub
4. Contact the maintainers 