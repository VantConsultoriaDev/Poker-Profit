const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World');
});
server.listen(5173, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:5173/');
});
setInterval(() => {
  console.log('Server is alive');
}, 5000);
