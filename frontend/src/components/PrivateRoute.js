import React, { useState, useEffect } from "react";
import axios from "axios";
import { Route, Redirect } from "react-router-dom";

const PrivateRoute = ({ component: Component, ...rest }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isActive, setIsActive] = useState(false);
  /*
	useEffect(() => {

		const fetchData = async() => {

			try {
				// eslint-disable-next-line
				const result = await axios.get('/checkAuthentication');
				if (isActive) setIsLogin(true);
			} catch (err) {
				if (isActive) setIsLogin(false);
			} finally {
				if (isActive) setIsActive(false);
			}

		}
		fetchData();
			
		}, [isLogin, isActive]);

	if (isActive) return null;
*/
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
