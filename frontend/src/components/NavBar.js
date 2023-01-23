import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.svg";
import userIcon from "../assets/user.png";
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
} from "reactstrap";
import { useLogout } from "../hooks/useLogout";
import { getUserData } from "../hooks/getUserData";
import { useOutsideClick } from "../hooks/handleOutsideClick";

const NavBar = (props) => {
  const [user, setUser] = useState("");
  const [menu, setMenu] = useState(false);
  const { logout } = useLogout();

  useEffect(() => {
    const fetch = async () => {
      const getData = await getUserData(localStorage.getItem("access_token"));
      const user =
        getData.given_name.toLocaleLowerCase() +
        getData.family_name.toLocaleLowerCase();
      setUser(user);
    };
    fetch();
  }, []);

  const handleClickOutside = () => {
    setMenu(false);
  };

  const ref = useOutsideClick(handleClickOutside);

  const handleLogout = () => {
    logout();
  };

  const handleMenu = () => {
    setMenu(!menu);
  };

  let location = useLocation();
  const urlParams = location.search;

  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);

  return (
    <Navbar light expand="md">
      <div className="container">
        <NavbarBrand href="/">
          <img src={logo} alt="Agiledrop" />
        </NavbarBrand>
        <NavbarToggler onClick={toggle} />
        <Collapse isOpen={isOpen} navbar>
          <Nav className="mr-auto" navbar>
            <NavItem>
              <Link
                to={"/" + urlParams}
                onClick={(value) => props.onSearchClick("")}
                className="nav-link"
              >
                Top Chart
              </Link>
            </NavItem>
            <NavItem>
              <Link
                to={"/feed" + urlParams}
                onClick={(value) => props.onSearchClick("")}
                className="nav-link"
              >
                Feed
              </Link>
            </NavItem>
          </Nav>

          <input
            className="form-control"
            type="text"
            placeholder="Search"
            aria-label="Search"
            value={props.search}
            onChange={(e) => props.onChange(e.target.value)}
          />
          <div className="user-wrapper">
            <button
              ref={ref}
              className={`btn-user ${menu && "active"}`}
              onClick={handleMenu}
            >
              <img src={userIcon} alt="Your Karma profile" />
            </button>
            {menu && (
              <ul className="user-menu">
                <li>
                  <Link to={`user/${user}`}>My Karma</Link>
                </li>
                <li className="user-menu-logout">
                  <Link to={"/login"} onClick={handleLogout}>
                    Log out
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </Collapse>
      </div>
    </Navbar>
  );
};

export default NavBar;
