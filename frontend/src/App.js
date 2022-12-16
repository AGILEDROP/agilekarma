import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from "react-router-dom";
import "./App.css";

import PrivateRoute from "./components/PrivateRoute";

import NavBar from "./components/NavBar";
import Chart from "./pages/Chart";
import KarmaFeed from "./pages/KarmaFeed";
import UserProfile from "./pages/UserProfile";
import Login from "./pages/Login";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useSetLogin } from "./hooks/useSetLogin";

const App = (props) => {
  const [searchTerm, setSearchTerm] = useState("");
  const isLogin = useSetLogin();

  return (
    <GoogleOAuthProvider clientId={`${process.env.REACT_APP_GOOGLE_CLIENT_ID}`}>
      <Router>
        {isLogin && (
          <PrivateRoute
            path="/"
            component={NavBar}
            search={searchTerm}
            onChange={(value) => setSearchTerm(value)}
            onSearchClick={(value) => setSearchTerm(value)}
          />
        )}
        <Switch>
          <Route exact path="/login" component={Login} />
          <PrivateRoute
            exact
            path="/"
            component={Chart}
            search={searchTerm}
            onSearchClick={(value) => setSearchTerm(value)}
          />
          <PrivateRoute
            exact
            path="/feed"
            component={KarmaFeed}
            search={searchTerm}
            onSearchClick={(value) => setSearchTerm(value)}
          />
          <PrivateRoute
            path="/user/:user"
            component={UserProfile}
            search={searchTerm}
          />
        </Switch>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;
