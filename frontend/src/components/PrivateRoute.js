import React, { useState, useEffect } from "react";
import { Route, Redirect } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";
import Login from "./Login";

const PrivateRoute = ({ component: Component, ...rest }) => {
  const [isLogin, setIsLogin] = useState(false);
  const { accessToken } = useAuthContext();

  useEffect(() => {
    if (accessToken != null) {
      setIsLogin(true);
    } else {
      setIsLogin(false);
    }
  }, [accessToken]);

  return (
    <Route
      {...rest}
      render={(props) =>
        isLogin ? (
          <Component {...props} {...rest} search={rest.search} />
        ) : (
          <Login />
        )
      }
    />
  );
};

export default PrivateRoute;
