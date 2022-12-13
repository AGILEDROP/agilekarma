import React, { createContext, useEffect, useReducer } from "react";
import { getUserData } from "../hooks/getUserData";

export const AuthContext = createContext();

export const authReducer = (state, action) => {
  switch (action.type) {
    case "LOGIN": {
      return { accessToken: action.payload };
    }
    case "LOGOUT": {
      return { accessToken: null };
    }
    default:
      return state;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    accessToken: null,
  });

  useEffect(() => {
    const accessToken = localStorage.getItem("access_token");

    const getData = async () => {
      const getGoogleData = await getUserData(accessToken);

      if (getGoogleData) {
        dispatch({ type: "LOGIN", payload: accessToken });
      }
    };
    getData();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
