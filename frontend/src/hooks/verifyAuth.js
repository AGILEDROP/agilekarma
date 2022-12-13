import axios from "axios";

export const verifyAuth = () => {
  const accessToken = localStorage.getItem("access_token");

  axios.defaults.headers.common = {
    Authorization: `${accessToken}`,
  };

  return axios;
};
