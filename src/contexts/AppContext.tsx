import {
  createContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type UserIds = "user1" | "user2";

interface AppContextType {
  selectedUserId: UserIds | null;
  setSelectedUserId: Dispatch<SetStateAction<UserIds | null>>;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [selectedUserId, setSelectedUserId] = useState<UserIds | null>(null);

  const values = {
    selectedUserId,
    setSelectedUserId,
  };

  return <AppContext value={values}>{children}</AppContext>;
};
