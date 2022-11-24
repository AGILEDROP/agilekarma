import React from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";

const Login = (props) => {
  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (response) => {
      console.log(response);
      const tokens = await axios.post(
        `${process.env.BACKEND_URL}/auth/google`,
        {
          code: response.code,
        }
      );

      console.log(tokens);
    },
    onError: (error) => console.log(error),
  });
  return <button onClick={() => googleLogin()}>Sign in with Google</button>;
};

export default Login;
