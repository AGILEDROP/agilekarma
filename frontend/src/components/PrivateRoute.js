import React from "react";
import { Route } from "react-router-dom";
import Login from "../pages/Login";
import { useSetLogin } from "../hooks/useSetLogin";

const PrivateRoute = ({ component: Component, ...rest }) => {
  const isLogin = useSetLogin();

  if (!isLogin) {
    return <Route component={Login} />;
  }
  return (
    <Route
      {...rest}
      render={(props) => (
        <Component {...props} {...rest} search={rest.search} />
      )}
    />
  );
};

export default PrivateRoute;
