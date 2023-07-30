import React, { useEffect, useState } from "react";
import { Navbar, NavbarBrand, UncontrolledTooltip } from "reactstrap";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { DefaultEditor } from "react-simple-wysiwyg";
import Avatar from "react-avatar";
import "./App.css";

// Websocket server
const WS_URL = "ws://127.0.0.1:8000";

const isUserEvent = (message) => {
  let evt = JSON.parse(message.data);
  // Type này phải trùng với type cấu hình ở back-end
  return evt.type === "userevent";
};

const isDocumentEvent = (message) => {
  let evt = JSON.parse(message.data);
  // Type này phải trùng với type cấu hình ở back-end
  return evt.type === "contentchange";
};

function App() {
  const [username, setUsername] = useState("");

  // Cấu hình kết nối front-end tới server websocket
  const { sendJsonMessage, readyState } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log("WebSocket connection established.");
    },
    share: true,
    filter: () => false,
    retryOnError: true,
    shouldReconnect: () => true,
  });

  // Kiểm tra kết nối tới websocket trước khi gửi data
  useEffect(() => {
    if (username && readyState === ReadyState.OPEN) {
      // Hàm này để gửi một message tới websocket
      sendJsonMessage({
        username,
        type: "userevent",
      });
    }
  }, [username, sendJsonMessage, readyState]);

  return (
    <React.Fragment>
      <Navbar color="light" light>
        <NavbarBrand href="/">Real-time document editor</NavbarBrand>
      </Navbar>
      <div className="container-fluid">
        {username ? <EditorSection /> : <LoginSection onLogin={setUsername} />}
      </div>
    </React.Fragment>
  );
}

const LoginSection = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  useWebSocket(WS_URL, {
    share: true,
    filter: () => false,
  });

  const logInUser = () => {
    if (!username.trim()) {
      return;
    }
    onLogin && onLogin(username);
  };

  return (
    <div className="account">
      <div className="account__wrapper">
        <div className="account__card">
          <div className="account__profile">
            <p className="account__name">Hello, user!</p>
            <p className="account__sub">Join to edit the document</p>
          </div>
          <input
            name="username"
            onInput={(e) => setUsername(e.target.value)}
            className="form-control"
          />
          <button
            type="button"
            onClick={() => logInUser()}
            className="btn btn-primary account__btn"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
};

const History = () => {
  // biến lastJsonMessage để nhận message từ websocket
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent,
  });
  const activities = lastJsonMessage?.data.userActivity || [];

  return (
    <ul>
      {activities.map((activity, index) => (
        <li key={`activity-${index}`}>{activity}</li>
      ))}
    </ul>
  );
};

const Users = () => {
  // biến lastJsonMessage để nhận message từ websocket
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent,
  });
  const users = Object.values(lastJsonMessage?.data.users || {});

  return users.map((user) => (
    <div key={user.username}>
      <span id={user.username} className="userInfo" key={user.username}>
        <Avatar name={user.username} size={40} round="20px" />
      </span>
      <UncontrolledTooltip placement="top" target={user.username}>
        {user.username}
      </UncontrolledTooltip>
    </div>
  ));
};

const Document = () => {
  const { lastJsonMessage, sendJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isDocumentEvent,
  });

  let html = lastJsonMessage?.data.editorContent || "";

  const handleHtmlChange = (e) => {
    sendJsonMessage({
      type: "contentchange",
      content: e.target.value,
    });
  };

  return <DefaultEditor value={html} onChange={handleHtmlChange} />;
};

const EditorSection = () => {
  return (
    <div className="main-content">
      <div className="document-holder">
        <div className="currentusers">
          <Users />
        </div>
        <Document />
      </div>
      <div className="history-holder">
        <History />
      </div>
    </div>
  );
};

export default App;
