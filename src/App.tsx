import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./App.css";
import { AppProvider } from "./contexts/AppContext";
import Chat from "./pages/Chat";
import Home from "./pages/Home";

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
