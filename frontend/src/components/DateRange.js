import React, { useState, useEffect } from 'react';
import queryString from 'query-string';
import { DateRangePicker, defaultStaticRanges, createStaticRanges } from 'react-date-range';
import {
  fromUnixTime,
  getUnixTime,
  addDays,
  endOfDay,
  startOfDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  startOfWeek,
  endOfWeek,
  // isSameDay,
  // differenceInCalendarDays,
} from 'date-fns';
import { enGB } from 'date-fns/locale'
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import Creatable from "react-select/creatable";
import { components } from "react-select";

import {
  ButtonGroup,
  ButtonDropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle
} from 'reactstrap';

const defineds = {
  startOfWeek: startOfWeek(new Date()),
  endOfWeek: endOfWeek(new Date()),
  startOfLastWeek: startOfWeek(addDays(new Date(), -7)),
  endOfLastWeek: endOfWeek(addDays(new Date(), -7)),
  startOfToday: startOfDay(new Date()),
  endOfToday: endOfDay(new Date()),
  startOfYesterday: startOfDay(addDays(new Date(), -1)),
  endOfYesterday: endOfDay(addDays(new Date(), -1)),
  startOfMonth: startOfMonth(new Date()),
  endOfMonth: endOfMonth(new Date()),
  startOfLastMonth: startOfMonth(addMonths(new Date(), -1)),
  endOfLastMonth: endOfMonth(addMonths(new Date(), -1)),
};

const Menu = props => {
  const optionSelectedLength = props.getValue().length || 0;
  return (
    <components.Menu {...props}>
      {optionSelectedLength < 10 ? (
        props.children
      ) : (
        <div style={{ margin: 15 }}>Max limit achieved</div>
      )}
    </components.Menu>
  );
};
 
const DateRange = props => {

  const isValidNewOption = (inputValue, selectValue) =>
    inputValue.length > 0 && selectValue.length < 10;

  const parsedQuery = queryString.parse(props.query);

  const [state, setState] = useState([
    {
      startDate: (props.query.length === 0) ? getUnixTime(0) : fromUnixTime(parsedQuery.startDate),
      endDate: (props.query.length === 0) ? endOfDay(new Date()) : fromUnixTime(parsedQuery.endDate),
      key: 'selection'
    }
  ]);

  const [dropdownOpen, setOpen] = useState(false);
  const toggleDropDown = () => setOpen(!dropdownOpen);

  let channelsOptions = [];
  const channels = props.listChannels;
  if (channels) {
    channelsOptions = channels.map(item => {
      return { value: item.channel_id, label: '#' + item.channel_name };
    });
  }

  let channelsArray = [];
  let channelsSelected = [];
  let channelsSelected2 = [];

  if (props.channel.includes(',')) { 
    channelsArray = props.channel.split(',');
  } else if (props.channel === 'all') {
    channelsArray.push('all');
  } else {
    channelsArray.push(props.channel);
  }

  if (props.channel !== 'all') {

    channelsSelected = props.listChannels ? props.listChannels.filter((el, index) => {

      if (channelsArray.filter(channel => channel).includes(el.channel_id)) {
        return { value: el.channel_id, label: '#' + el.channel_name };
      }

    }) : null;

  }

  if (channelsSelected) {
    channelsSelected2 = channelsSelected.map(item => {
      return { value: item.channel_id, label: '#' + item.channel_name };
    });
  }

  const [selectedOption, setSelectedOption] = useState((channelsSelected2.length > 0) ? channelsSelected2 : null);

  useEffect(() => {

    const selectedOption2 = selectedOption ? selectedOption.map(el => {
      return el.value
    }) : selectedOption ? props.channel : 'all';

    props.onChannelClick(selectedOption2);
  
    props.onSearchClick('');
    props.onFilterClick(0);
  }, [selectedOption]);

  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {

    if (getUnixTime(state[0].startDate) === getUnixTime(defineds.startOfToday) &&
        getUnixTime(state[0].endDate) === getUnixTime(defineds.endOfToday))  {
      setSelectedDate('Today');
    } else if (getUnixTime(state[0].startDate) === getUnixTime(defineds.startOfYesterday) && 
        getUnixTime(state[0].endDate) === getUnixTime(defineds.endOfYesterday)) {
      setSelectedDate('Yesterday');
    } else if (getUnixTime(state[0].startDate) === getUnixTime(defineds.startOfWeek) && 
        getUnixTime(state[0].endDate) === getUnixTime(defineds.endOfWeek)) {
      setSelectedDate('This Week');
    } else if (getUnixTime(state[0].startDate) === getUnixTime(defineds.startOfLastWeek) && 
        getUnixTime(state[0].endDate) === getUnixTime(defineds.endOfLastWeek)) {
      setSelectedDate('Last Week');
    } else if (getUnixTime(state[0].startDate) === getUnixTime(defineds.startOfMonth) && 
        getUnixTime(state[0].endDate) === getUnixTime(defineds.endOfMonth)) {
      setSelectedDate('This Month');
    } else if (getUnixTime(state[0].startDate) === getUnixTime(defineds.startOfLastMonth) && 
        getUnixTime(state[0].endDate) === getUnixTime(defineds.endOfLastMonth)) {
      setSelectedDate('Last Month');
    } else if (getUnixTime(state[0].startDate) === getUnixTime(0) && 
        getUnixTime(state[0].endDate) === getUnixTime(endOfDay(new Date()))) {
      setSelectedDate('Beginning of Time');
    } else {
      setSelectedDate('Custom Range');
    }

  }, [props, state])

  
  
  return (
    <div className="container">
     <div className="row mt-5">
        <div className="col">
          <Creatable
              components={{ Menu }}
              isMulti
              isValidNewOption={isValidNewOption}
              options={channelsOptions}
              defaultValue={selectedOption}
              onChange={setSelectedOption}
              className="reactSelect"
              placeholder="All Channels"
            />
        </div>
        <div className="col text-right dates">
          <ButtonDropdown isOpen={dropdownOpen} toggle={toggleDropDown}>
            <DropdownToggle caret>
              Dates
            </DropdownToggle>
            <DropdownMenu right>
                <DateRangePicker
                  onChange={ 
                    item => { 
                      setState([item.selection]);
                      props.onStartDateClick(getUnixTime(item.selection.startDate));
                      props.onEndDateClick(getUnixTime(item.selection.endDate));
                      props.onSearchClick('');
                    }
                  }
                  showSelectionPreview={true}
                  moveRangeOnFirstSelection={false}
                  months={1}
                  ranges={state}
                  direction="horizontal"
                  locale={enGB}
                  weekStartsOn={1}
                  staticRanges={[
                    ...defaultStaticRanges,
                    ...createStaticRanges([
                      {
                        label: 'Beginning of Time',
                        range: () => ({
                          startDate: fromUnixTime(0),
                          endDate: endOfDay(new Date())
                        })
                      }
                    ])
                  ]}
                />
            </DropdownMenu>
          </ButtonDropdown>
          <div className="selectedDate">{selectedDate}</div>
        </div>
      </div>
    </div>
  )
}

export default DateRange;