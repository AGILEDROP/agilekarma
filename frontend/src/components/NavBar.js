import React, { useState } from "react";
import { BrowserRouter as Router, Link, useLocation } from "react-router-dom";
import logo from "../assets/logo.svg";
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
} from "reactstrap";
import { useLogout } from "../hooks/useLogout";

const NavBar = (props) => {
  const { logout } = useLogout();

  const handleLogout = () => {
    logout();
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

          <Link to={"/login"} onClick={handleLogout} className="btn-logout">
            Log out
          </Link>
        </Collapse>
      </div>
    </Navbar>
  );
};

export default NavBar;
