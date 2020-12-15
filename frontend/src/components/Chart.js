import React, { useCallback, useState, useEffect } from 'react';
import { BrowserRouter as Router, Link, useHistory } from 'react-router-dom';
import axios from 'axios';
import queryString from 'query-string';

import { getUnixTime, endOfDay } from 'date-fns';

import _ from "lodash";

import DateRange from './DateRange';

const Chart = props => {

  const apiURL = process.env.REACT_APP_API_URL;

  const parsedQuery = queryString.parse(props.location.search);

  const [channel, setChannel] = useState(parsedQuery.channel);
  const [startDate, setStartDate] = useState(parsedQuery.startDate);
  const [endDate, setEndDate] = useState(parsedQuery.endDate);

  if (channel === undefined || startDate === undefined || endDate === undefined) {
    setChannel('all');
    setStartDate(0);
    setEndDate(getUnixTime(endOfDay(new Date())));
  }

  // const apiURL = 'https://a564aa475f76.eu.ngrok.io/leaderboard' + props.location.search;
  const leaderboardURL = apiURL + '/leaderboard?channel=' + channel + '&startDate=' + startDate + '&endDate=' + endDate;
  const [users, setUsers] = useState();

  const channelsURL = apiURL + '/channels?channel=' + channel;
  const [listChannels, setListChannels] = useState();

  const [paginationSearch, setPaginationSearch] = useState(0);

  useEffect(() => {
    const getChart = async() => {
      await axios.get(leaderboardURL)
        .then(res => {
          setUsers(res.data);
        })
        .catch(err => console.error(err.message))
    }
    getChart();

    const getChannels = async() => {
      await axios.get(channelsURL)
        .then(res => {
          setListChannels(res.data);
        })
        .catch(err => console.error(err.message))
    }
    getChannels();

    // eslint-disable-next-line
  }, [leaderboardURL, channelsURL, channel]);

  let history = useHistory();
  useEffect(() => {
    history.push('?channel=' + channel + '&startDate=' + startDate + '&endDate=' + endDate)
  }, [channel, startDate, endDate]);

  const [searchValue, setSearchValue] = useState("");
  const debounce = useCallback(
    _.debounce(_searchVal => {
      setSearchValue(_searchVal);
    }, 500),
    []
  );

  useEffect(() => {
    debounce(props.search);
  }, [props.search]);

  const results = !searchValue ? users : users.filter(user =>
    user.item.toLowerCase().includes(searchValue.toLocaleLowerCase())
  );

  return(
    <>
      <DateRange 
        listChannels={listChannels} 
        channel={channel} 
        query={props.location.search}
        onChannelClick={ value => setChannel(value) }
        onStartDateClick={ value => setStartDate(value) }
        onEndDateClick={ value => setEndDate(value) }
        onSearchClick={ value => props.onClick(value) }
        onFilterClick={ value => setPaginationSearch(0) }
      />

      {(users === undefined) ?

        <div className="row mt-5">
          <div className="col text-center">
            <svg width="50" height="50" viewBox="0 0 135 135" xmlns="http://www.w3.org/2000/svg" fill="#000">
              <path d="M67.447 58c5.523 0 10-4.477 10-10s-4.477-10-10-10-10 4.477-10 10 4.477 10 10 10zm9.448 9.447c0 5.523 4.477 10 10 10 5.522 0 10-4.477 10-10s-4.478-10-10-10c-5.523 0-10 4.477-10 10zm-9.448 9.448c-5.523 0-10 4.477-10 10 0 5.522 4.477 10 10 10s10-4.478 10-10c0-5.523-4.477-10-10-10zM58 67.447c0-5.523-4.477-10-10-10s-10 4.477-10 10 4.477 10 10 10 10-4.477 10-10z">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 67 67"
                  to="-360 67 67"
                  dur="2.5s"
                  repeatCount="indefinite"/>
              </path>
              <path d="M28.19 40.31c6.627 0 12-5.374 12-12 0-6.628-5.373-12-12-12-6.628 0-12 5.372-12 12 0 6.626 5.372 12 12 12zm30.72-19.825c4.686 4.687 12.284 4.687 16.97 0 4.686-4.686 4.686-12.284 0-16.97-4.686-4.687-12.284-4.687-16.97 0-4.687 4.686-4.687 12.284 0 16.97zm35.74 7.705c0 6.627 5.37 12 12 12 6.626 0 12-5.373 12-12 0-6.628-5.374-12-12-12-6.63 0-12 5.372-12 12zm19.822 30.72c-4.686 4.686-4.686 12.284 0 16.97 4.687 4.686 12.285 4.686 16.97 0 4.687-4.686 4.687-12.284 0-16.97-4.685-4.687-12.283-4.687-16.97 0zm-7.704 35.74c-6.627 0-12 5.37-12 12 0 6.626 5.373 12 12 12s12-5.374 12-12c0-6.63-5.373-12-12-12zm-30.72 19.822c-4.686-4.686-12.284-4.686-16.97 0-4.686 4.687-4.686 12.285 0 16.97 4.686 4.687 12.284 4.687 16.97 0 4.687-4.685 4.687-12.283 0-16.97zm-35.74-7.704c0-6.627-5.372-12-12-12-6.626 0-12 5.373-12 12s5.374 12 12 12c6.628 0 12-5.373 12-12zm-19.823-30.72c4.687-4.686 4.687-12.284 0-16.97-4.686-4.686-12.284-4.686-16.97 0-4.687 4.686-4.687 12.284 0 16.97 4.686 4.687 12.284 4.687 16.97 0z">
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 67 67"
                  to="360 67 67"
                  dur="8s"
                  repeatCount="indefinite"/>
              </path>
            </svg>
          </div>
        </div>

        :

      <div className="container pt-5 pb-5">
        <div className="row">
        <div className="col">
          <div className="card-deck">
            {users ? (users.slice(0, 3).map((user, index) => (
                <div className={`${user.rank === 1 ? 'first' : user.rank === 2 ? 'second' : user.rank === 3 ? 'third' : ''} card text-center`} key={index}>
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
        {(users.length === 0) ?
        
        <div className="row mt-5">
          <div className="col text-center">
            { (channel === 'all') ? <p>All Channels</p> : null }
            <p>{listChannels ? (listChannels.map(el => {
              if (el.channel_id === channel) 
                return '#' + el.channel_name
              else
                return null
            })) : null }</p>
            <h1>No karma given yet!</h1>
            <p>Be the first to give some karma points on slack.</p>
          </div>
        </div>

        :

        <div className="row mt-5">

        {(results === undefined || results.length === 0) ?
            <div className="col text-center mt-5">
              <h3>No Results</h3>
            </div>
          :
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
               {(results.map((user, index) => (
                  <tr key={index}>
                    <th className="text-left" scope="row">{user.rank}</th>
                    <td className="text-center">
                      <Link 
                        to={{
                          pathname: "/user/" + user.item.split(" ").join("").toLocaleLowerCase(),
                          search: props.location.search
                        }}>
                        {user.item}
                      </Link>
                    </td>
                    <td className="text-right">{user.score}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
        }
        </div>
        }
      </div>
      }
    </>
  )
}

export default Chart;