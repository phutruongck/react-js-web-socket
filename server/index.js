const { WebSocket, WebSocketServer } = require("ws");
const http = require("http");
const uuidv4 = require("uuid").v4;

// Spinning the http server and the WebSocket server.
const server = http.createServer();
const wsServer = new WebSocketServer({ server });
const port = 8000;
server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
});

const clients = {};
const users = {};
let editorContent = null;
let userActivity = [];

// Cái này là những type để front-end bắt
const typesDef = {
  USER_EVENT: "userevent",
  CONTENT_CHANGE: "contentchange",
};

function broadcastMessage(json) {
  const data = JSON.stringify(json);
  for (let userId in clients) {
    let client = clients[userId];
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// Cấu hình hàm để gửi và nhận tin nhắn
function handleMessage(message, userId) {
  const dataFromClient = JSON.parse(message.toString());
  const json = { type: dataFromClient.type };
  if (dataFromClient.type === typesDef.USER_EVENT) {
    users[userId] = dataFromClient;
    userActivity.push(`${dataFromClient.username} joined to edit the document`);
    json.data = { users, userActivity };
  } else if (dataFromClient.type === typesDef.CONTENT_CHANGE) {
    editorContent = dataFromClient.content;
    json.data = { editorContent, userActivity };
  }
  broadcastMessage(json);
}

function handleDisconnect(userId) {
  console.log(`${userId} disconnected.`);
  const json = { type: typesDef.USER_EVENT };
  const username = users[userId]?.username || userId;
  userActivity.push(`${username} left the document`);
  json.data = { users, userActivity };
  delete clients[userId];
  delete users[userId];
  broadcastMessage(json);
}

// Cấu hình connection
wsServer.on("connection", function (connection) {
  const userId = uuidv4();
  console.log("Recieved a new connection");

  clients[userId] = connection;
  console.log(`${userId} connected.`);
  connection.on("message", (message) => handleMessage(message, userId));
  connection.on("close", () => handleDisconnect(userId));
});
