import React, { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import GoogleButton from "react-google-button";
import { useAuthContext } from "../hooks/useAuthContext";
import { Redirect } from "react-router-dom";
const Login = (props) => {
  const [isLogin, setIsLogin] = useState(false);
  const { dispatch, accessToken } = useAuthContext();

  useEffect(() => {
    if (accessToken != null) {
      setIsLogin(true);
    } else {
      setIsLogin(false);
    }
  }, [accessToken]);

  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (response) => {
      try {
        const tokens = await axios.post(
          "http://agilekarma.localhost/auth/google",
          {
            code: response.code,
          }
        );

        dispatch({ type: "LOGIN", payload: tokens.data.access_token });

        localStorage.setItem("access_token", tokens.data.access_token);
        localStorage.setItem("refresh_token", tokens.data.refresh_token);
        localStorage.setItem(
          "expires_in",
          new Date(Date.now() + tokens.data.expires_in * 60 * 1000)
        );
      } catch (error) {
        console.log(error);
      }
    },
    onError: (error) => console.log(error),
  });

  if (isLogin) {
    return <Redirect to="/" />;
  }
  return (
    <div className="login-page">
      <h2>Welcome to Agilekarma</h2>
      <GoogleButton onClick={() => googleLogin()} />
    </div>
  );
};

export default Login;
