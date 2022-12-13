import React, { useState, useEffect } from "react";
import { Route, Redirect } from "react-router-dom";
import { useAuthContext } from "../hooks/useAuthContext";

const PrivateRoute = ({ component: Component, ...rest }) => {
  const [isLogin, setIsLogin] = useState(false);
  const { accessToken } = useAuthContext();

  useEffect(() => {
    if (accessToken != null) {
      setIsLogin(true);
    }
  }, [accessToken]);

  //if (isLogin) return null;
  return (
    <Route
      {...rest}
      render={(props) =>
        isLogin ? (
          <Component {...props} {...rest} search={rest.search} />
        ) : (
          <Redirect to={{ pathname: "/login" }} />
        )
      }
    />
  );
};

export default PrivateRoute;
