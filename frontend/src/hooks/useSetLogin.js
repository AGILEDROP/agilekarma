import { useState, useEffect } from "react";
import { useAuthContext } from "./useAuthContext";

export const useSetLogin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { accessToken } = useAuthContext();

  useEffect(() => {
    if (accessToken != null) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [accessToken]);

  return isLoggedIn;
};
