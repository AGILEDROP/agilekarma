import { useState, useEffect } from "react";
import { useAuthContext } from "./useAuthContext";

export const useSetLogin = () => {
  const [isLogin, setIsLogin] = useState(false);
  const { accessToken } = useAuthContext();

  useEffect(() => {
    if (accessToken != null) {
      setIsLogin(true);
    } else {
      setIsLogin(false);
    }
  }, [accessToken]);

  return isLogin;
};
