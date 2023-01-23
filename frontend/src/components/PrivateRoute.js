import React, { useEffect, useState } from "react";
import { Route } from "react-router-dom";
import { getUserData } from "../hooks/getUserData";
import Login from "../pages/Login";
import { useLogout } from "../hooks/useLogout";

const PrivateRoute = ({ component: Component, ...rest }) => {
  const accessToken = localStorage.getItem("access_token");
  const { logout } = useLogout();

  if (!accessToken) {
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
