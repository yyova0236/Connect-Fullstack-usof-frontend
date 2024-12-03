const http = require('http');
const app = require('./app'); // Імпортуємо готовий екземпляр app із app.js

const PORT = process.env.PORT || 5000;

// Створюємо і запускаємо сервер
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
