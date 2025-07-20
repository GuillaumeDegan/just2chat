import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext, type UserIds } from "../contexts/AppContext";

function Home() {
  const navigate = useNavigate();
  const { setSelectedUserId } = useContext(AppContext);

  const onButtonClick = (userId: UserIds) => {
    setSelectedUserId(userId);
    navigate("/chat");
  };

  return (
    <>
      <h1>Select user</h1>
      <button onClick={() => onButtonClick("user1")}>User 1</button>
      <button onClick={() => onButtonClick("user2")}>User 2</button>
    </>
  );
}

export default Home;
