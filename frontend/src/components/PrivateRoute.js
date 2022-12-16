import React from "react";
import { Route } from "react-router-dom";
import Login from "../pages/Login";
import { useSetLogin } from "../hooks/useSetLogin";

const PrivateRoute = ({ component: Component, ...rest }) => {
  const isLogin = useSetLogin();

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
