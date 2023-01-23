import axios from "axios";

export const getUserData = async (token) => {
  if (token) {
    try {
      const { data } = await axios({
        method: "post",
        url: `https://www.googleapis.com/oauth2/v3/userinfo?alt=json&access_token=${token}`,
      });

      return data;
    } catch (error) {
      if (error.response.status == 401) {
        throw new Error(error);
      }
    }
  }
};
