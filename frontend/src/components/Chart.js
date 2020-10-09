import React, { useState, useEffect } from 'react';
import axios from 'axios';
// import queryString from 'query-string';
import logo from '../logo.svg';
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  Button,
  ButtonGroup,
  ButtonDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle
} from 'reactstrap';

const Chart = (props) => {

  // const parsedQuery = queryString.parse(props.location.search);

  // id | user_receive | user_give | timestamp | channel
  // const [users, setUsers] = useState([
  //   {id: 3, user_receive: "Klemen Brodej", user_give: "Martin Kenjic", timestamp: "1600527600", channel: "#dev" },
  //   {id: 4, user_receive: "Bostjan Kovac", user_give: "Martin Kenjic", timestamp: "1600527600", channel: "#dev" },
  //   {id: 5, user_receive: "Klemen Brodej", user_give: "Martin Kenjic", timestamp: "1600527600", channel: "#dev" },
  //   {id: 6, user_receive: "Bostjan Kovac", user_give: "Martin Kenjic", timestamp: "1601337600", channel: "#dev" },
  //   {id: 7, user_receive: "Klemen Brodej", user_give: "Martin Kenjic", timestamp: "1600527600", channel: "#dev" },
  //   {id: 8, user_receive: "Klemen Brodej", user_give: "Martin Kenjic", timestamp: "1600527600", channel: "#dev" },
  //   {id: 9, user_receive: "Klemen Brodej", user_give: "Martin Kenjic", timestamp: "1600527600", channel: "#dev" },
  //   {id: 10, user_receive: "Klemen Brodej", user_give: "Martin Kenjic", timestamp: "1601337600", channel: "#dev" },
  //   {id: 11, user_receive: "Janez Novak", user_give: "Martin Kenjic", timestamp: "1601337600", channel: "#dev" },
  //   {id: 12, user_receive: "Janez Novak", user_give: "Martin Kenjic", timestamp: "1601337600", channel: "#dev" },
  //   {id: 13, user_receive: "Janez Novak", user_give: "Martin Kenjic", timestamp: "1600527600", channel: "#dev" },
  //   {id: 14, user_receive: "Lena Gregorcic", user_give: "Martin Kenjic", timestamp: "1601596800", channel: "#dev" },
  //   {id: 15, user_receive: "Lena Gregorcic", user_give: "Martin Kenjic", timestamp: "1601596800", channel: "#dev" },
  //   {id: 14, user_receive: "Lena Gregorcic", user_give: "Martin Kenjic", timestamp: "1601596800", channel: "#dev" },
  //   {id: 16, user_receive: "Lena Gregorcic", user_give: "Martin Kenjic", timestamp: "1601596800", channel: "#dev" },
  //   {id: 17, user_receive: "John Smith", user_give: "Martin Kenjic", timestamp: "1601596800", channel: "#random" },
  //   {id: 18, user_receive: "John Smith", user_give: "Martin Kenjic", timestamp: "1601596800", channel: "#random" },
  //   {id: 19, user_receive: "John Smith", user_give: "Martin Kenjic", timestamp: "1601596800", channel: "#random" },
  //   {id: 20, user_receive: "John Smith", user_give: "Martin Kenjic", timestamp: "1601596800", channel: "#random" },
  // ]);

  const botUser = "U01ASBLRRNZ";
  const [channel, setChannel] = useState('C01C75LPV6W');
  const token = "716c2e435e9291eb526939abcb63891323691b7558c42ca9b45f982c321b8462";
  const ts = "1602226835";

  // const apiURL = 'https://a564aa475f76.eu.ngrok.io/leaderboard' + props.location.search;
  const apiURL = 'https://a564aa475f76.eu.ngrok.io/leaderboard?token=' + token + '&ts=' + ts + '&botUser=' + botUser + '&channel=' + channel;
  const [users, setUsers] = useState('');

  const channelURL = 'https://a564aa475f76.eu.ngrok.io/channels?token=' + token + '&ts=' + ts + '&botUser=' + botUser + '&channel=' + channel;
  const [listChannels, setListChannels] = useState('');

  useEffect(() => {
    const getChart = async() => {
      await axios.get(apiURL)
        .then(res => {
          setUsers(res.data);
        })
        .catch(err => console.error(err.message))
    }
    getChart();

    const getChannels = async() => {
      await axios.get(channelURL)
        .then(res => {
          setListChannels(res.data);
        })
        .catch(err => console.error(err.message))
    }
    getChannels();

    // eslint-disable-next-line
  }, [apiURL, channelURL, channel]);

  // console.log(parsedQuery);

  const [searchTerm, setSearchTerm] = useState('');
  const handleChange = e => setSearchTerm(e.target.value);
  const results = !searchTerm ? users : users.filter(user =>
    user.item.toLowerCase().includes(searchTerm.toLocaleLowerCase())
  );


  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(!isOpen);

  const [dropdownOpen, setOpen] = useState(false);
  const toggleDropDown = () => setOpen(!dropdownOpen);

  return(
    <>
    <Navbar light expand="md">
      <div className="container">
        <NavbarBrand href="/"><img src={logo} alt="Agiledrop" /></NavbarBrand>
        <NavbarToggler onClick={toggle} />
        <Collapse isOpen={isOpen} navbar>
          <Nav className="mr-auto" navbar>

            <ButtonGroup>
              <Button>Btn #1</Button>
              <Button>Btn #2</Button>
              <ButtonDropdown isOpen={dropdownOpen} toggle={toggleDropDown}>
                <DropdownToggle caret>
                  Channels
                </DropdownToggle>
                <DropdownMenu>
                  {listChannels ? (listChannels.map((el, index) => (
                    <DropdownItem key={index} onClick={() => setChannel(el.channel_id)}>#{el.channel_name}</DropdownItem>
                    )
                  )) : <DropdownItem>No Channels</DropdownItem>}
                </DropdownMenu>
              </ButtonDropdown>
            </ButtonGroup>

          </Nav>
        </Collapse>
        </div>
      </Navbar>
      <div className="container pt-5 pb-5">
        <div className="row">
        <div className="col">
          <div className="card-deck">
            {users ? (users.slice(0, 3).map(user => (
                <div className={`${user.rank === 1 ? 'first' : user.rank === 2 ? 'second' : user.rank === 3 ? 'third' : ''} card text-center`} key={user.rank}>
                    { user.rank === 1 ? <div className="podium"><span role="img" aria-label="1">🥇</span></div> :
                      user.rank === 2 ? <div className="podium"><span role="img" aria-label="2">🥈</span></div> :
                      user.rank === 3 ? <div className="podium"><span role="img" aria-label="3">🥉</span></div> :
                      null
                    }
                    <h4>{user.item}</h4>
                    <div className="card-footer score">
                      {user.score}
                    </div>
                </div>
              ))) : null }
          </div>
        </div>
        </div>
        {(results === undefined || results.length === 0) ?
        
        <div className="row mt-5">
          <div className="col text-center">
            <h1>No karma given yet!</h1>
            <p>Be the first to give some karma points on slack.</p>
          </div>
        </div>

        :
        
        <div className="row mt-5">
        <div className="col-6">
          <h3 className="pb-3">Karma List</h3>
        </div>
        <div className="col-6">
            <input
              className="form-control"
              type="text"
              placeholder="Search"
              aria-label="Search"
              value={searchTerm}
              onChange={handleChange}
            />
        </div>
        <div className="col">
          <div className="table-responsive">
            <table className="table table-borderless table-striped">
              <thead>
                <tr>
                  <th scope="col" className="text-left">Rank</th>
                  <th scope="col" className="text-center">Name</th>
                  <th scope="col" className="text-right">Karma</th>
                </tr>
              </thead>
              <tbody>
               {(results.map(user => (
                  <tr key={user.rank}>
                    <th className="text-left" scope="row">{user.rank}</th>
                    <td className="text-center">{user.item}</td>
                    <td className="text-right">{user.score}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
        }
      </div>
    </>
  )
}

export default Chart;