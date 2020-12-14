import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link, redirectTo } from '@reach/router';
import ReactPlaceholder from 'react-placeholder';
import { TextBlock, RectShape } from 'react-placeholder/lib/placeholders';
import { FormattedMessage } from 'react-intl';
import { Form } from 'react-final-form';
import Select from 'react-select';
import messages from './messages';
import { useFetch } from '../hooks/UseFetch';
import { useEditTeamAllowed } from '../hooks/UsePermissions';
import { useSetTitleTag } from '../hooks/UseMetaTags';
import { fetchLocalJSONAPI, pushToLocalJSONAPI } from '../network/genericJSONRequest';
import { exporttoCSVFile } from '../network/genericCSVExport';
import DataTable from 'react-data-table-component';
import { Button } from '../components/button';
import moment from 'moment';
import {
  getMembersDiff,
  filterActiveMembers,
  filterActiveManagers,
  filterInactiveMembersAndManagers,
  formatMemberObject,
} from '../utils/teamMembersDiff';
import { Members, JoinRequests } from '../components/teamsAndOrgs/members';
import {
  TeamInformation,
  TeamForm,
  TeamsManagement,
  TeamSideBar,
  TeamsStats,
} from '../components/teamsAndOrgs/teams';
import { MessageMembers } from '../components/teamsAndOrgs/messageMembers';
import { Projects } from '../components/teamsAndOrgs/projects';
import { FormSubmitButton, CustomButton } from '../components/button';
import { DeleteModal } from '../components/deleteModal';
import { NotFound } from './notFound';
import { useLocation } from '@reach/router';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import { isObject } from '@turf/helpers';

export function ManageTeams() {
  useSetTitleTag('Manage teams');
  return <ListTeams managementView={true} />;
}

export function MyTeamsUserSatsIndetailed() {
  useSetTitleTag('My teams MyTeamsUserSatsIndetailed ');

  useEffect(() => {
    getUserNameBasedStats();
    getUserNames();
  }, []);

  const token = useSelector((state) => state.auth.get('token'));
  const [userNames, setUserNames] = useState({});
  const getUserNames = async () => {
    const response = await fetchLocalJSONAPI(`users/`, token);

    const jsonData = await response.users;

    setUserNames(jsonData);
  };

  const location = useLocation();
  let selectUserStats = [];
  for (var i = 0; i < userNames.length; i++) {
    var obj = {};
    obj.value = userNames[i].username;
    obj.label = userNames[i].username;
    selectUserStats.push(obj);
  }

  let selectTaskSatus = [
    { value: 'MAPPED', label: 'MAPPED' },
    { value: 'VALIDATED', label: 'VALIDATED' },
  ];
  const maxDateApp = new Date();
  const customStyles = {
    headCells: {
      style: {
        fontSize: '15px',
        fontWeight: 'bold',
      },
    },

    cells: {
      style: {
        fontSize: '14px',
      },
    },
  };

  const popUpTableColumns = [
    {
      name: 'Task Url',
      selector: 'TaskUrl',
      sortable: true,
      grow: 2,
      minWidth: '100px',
      cell: (row) => (
        <Link to={`/projects/${row.TaskUrl}/tasks?page=1&search=${row.TaskId}`}>
          Project {row.TaskUrl} - Task {row.TaskId}
        </Link>
      ),
    },
    {
      name: 'Task',
      selector: 'TaskId',
      sortable: true,
      grow: 2,
      minWidth: '100px',
      omit: 'yes',
    },
    {
      name: 'Current State',
      selector: 'CurrentState',
      sortable: true,
      grow: 2,
      minWidth: '100px',
    },

    {
      name: ' Task Finish time ',
      selector: 'TaskFinishTime',
      sortable: true,
      grow: 2,
      minWidth: '100px',
    },
    {
      name: 'Time spent on task (hh:mm:ss)',
      selector: 'TimeSpentOnTask',
      sortable: true,
      grow: 2,

      minWidth: '100px',
    },
    {
      name: 'Validator',
      selector: 'Reviewer',
      sortable: true,
      grow: 2,
      minWidth: '200px',
    },
  ];
  var dateObj = new Date();

  // subtract seven day from current time
  dateObj.setDate(dateObj.getDate() - 7);
  let [value, onChange] = useState([dateObj, new Date()]);
  let [selectedUserName, setSelectedUserName] = useState(null);
  let [selectedTaskStatus, setSelectedTaskStatus] = useState(null);
  const [teamMetricsStats, setTeamMetricsStats] = useState({});

  const params = new URLSearchParams(location.search);

  // You can access specific parameters:
  let selectedStringName = params.get('name');
  let selectedStatus = params.get('status');

  let varSelectedUser = { value: selectedStringName, label: selectedStringName };
  let defaultelectedStatus = { value: selectedStatus, label: selectedStatus };
  let userNameSelected = varSelectedUser.value;

  var convertSeconds = (sec) => {
    var hrs = Math.floor(sec / 3600);
    var min = Math.floor((sec - hrs * 3600) / 60);
    var seconds = sec - hrs * 3600 - min * 60;
    seconds = Math.round(seconds * 100) / 100;

    var result = hrs < 10 ? '0' + hrs : hrs;
    result += ':' + (min < 10 ? '0' + min : min);
    result += ':' + (seconds < 10 ? '0' + seconds : seconds);
    return result;
  };
  const getUserNameBasedStats = async () => {
    var startDateFormatted = moment(value[0]).format('YYYY-MM -DD');

    var endDateFormatted = moment(value[1]).format('YYYY-MM -DD');

    const response = await fetchLocalJSONAPI(
      `users/${userNameSelected}/tasks/?status=${selectedStatus}&start_date=${startDateFormatted}&end_date=${endDateFormatted}`,
      token,
    );
    const jsonData = await response.tasks;
    setTeamMetricsStats(jsonData);
  };
  let dataUserBasedStats = [];
  for (let i = 0; i < teamMetricsStats.length; i++) {
    let obj = {};
    obj.TaskUrl = teamMetricsStats[i].project_id;
    obj.TaskId = teamMetricsStats[i].tasks_id;
    obj.CurrentState = teamMetricsStats[i].task_status;
    obj.TaskFinishTime = moment(teamMetricsStats[i].action_date).format('DD-MM-YYYY HH:mm:ss');
    obj.TimeSpentOnTask = convertSeconds(teamMetricsStats[i].total_time_spent);
    obj.Reviewer = teamMetricsStats[i].reviewer;

    dataUserBasedStats.push(obj);
  }

  function submitUserSelected(Values) {
    selectedUserName = Values.value;
    let taskStatus = '';
    if (selectedTaskStatus) {
      if (isObject(selectedTaskStatus)) {
        taskStatus = selectedTaskStatus.value;
      } else {
        taskStatus = selectedTaskStatus;
      }
    } else {
      taskStatus = 'MAPPED';
    }
    generateUserBasedMetricsStats(selectedUserName, taskStatus, value[0], value[1]);
    //generateUserBasedMetricsStats();
  }
  function submitTaskSelected(Values) {
    selectedTaskStatus = Values.value;
    let userNameselected = '';
    if (selectedUserName) {
      userNameselected = selectedUserName.value;
    } else {
      userNameselected = userNameSelected;
    }

    generateUserBasedMetricsStats(userNameselected, selectedTaskStatus, value[0], value[1]);
  }
  var generateUserBasedMetricsStats = (userName, taskStatus, startDate, endDate) => {
    var startDateFormatted = moment(startDate).format('YYYY-MM -DD');

    var endDateFormatted = moment(endDate).format('YYYY-MM -DD');

    let url = `users/${userName}/tasks/?status=${taskStatus}&start_date=${startDateFormatted}&end_date=${endDateFormatted}`;
    fetchLocalJSONAPI(url, token)
      .then((res) => {
        const responseData = res.tasks;
        setTeamMetricsStats(responseData);
      })
      .catch((e) => console.log('call back failed in task index file' + e));
  };

  return (
    <div className="mv4">
      <div class="cf shadow-4 pv3 ph2 bg-white">
        <table>
          <tr>
            <td>
              <label className="pt3 pb2">Select a User :</label>
            </td>
            <td style={{ width: 200 }}>
              <Select
                id="userselect"
                classNamePrefix="react-select"
                defaultValue={varSelectedUser}
                options={selectUserStats}
                onChange={(value) => {
                  setSelectedUserName(value);
                  submitUserSelected(value);
                }}
              />
            </td>
            <td>
              <label className="pt3 pb2">Task Type :</label>
            </td>
            <td style={{ width: 200 }}>
              <Select
                id="userselectTask"
                classNamePrefix="react-select"
                defaultValue={defaultelectedStatus}
                options={selectTaskSatus}
                onChange={(value) => {
                  setSelectedTaskStatus(value);
                  submitTaskSelected(value);
                }}
              />
            </td>
            <td>
              <label className="pt3 pb2 " style={{ marginLeft: '200px' }}>
                Date Range :
              </label>
            </td>
            <td style={{ width: 300 }}>
              <DateRangePicker
                onChange={onChange}
                value={value}
                maxDate={maxDateApp}
                className="rangepicker"
              />
            </td>
            <td>
              <Button
                className="bg-red white"
                onClick={() => exporttoCSVFile(dataUserBasedStats, 'User Level')}
              >
                Export Results
              </Button>
            </td>
          </tr>
        </table>
      </div>
      <DataTable
        columns={popUpTableColumns}
        data={dataUserBasedStats}
        defaultSortField="title"
        pagination
        highlightOnHover
        customStyles={customStyles}
      />
    </div>
  );
}

export function MyTeams() {
  useSetTitleTag('My teams');
  return (
    <div className="w-100 cf bg-tan blue-dark">
      <ListTeams />
    </div>
  );
}

export function ListTeams({ managementView = false }: Object) {
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  const token = useSelector((state) => state.auth.get('token'));
  const [teams, setTeams] = useState(null);
  const [userTeamsOnly, setUserTeamsOnly] = useState(true);

  useEffect(() => {
    if (token && userDetails && userDetails.id) {
      let queryParam;
      if (managementView) {
        queryParam = userTeamsOnly ? `?manager=${userDetails.id}` : '';
      } else {
        queryParam = `?member=${userDetails.id}`;
      }
      fetchLocalJSONAPI(`teams/${queryParam}`, token).then((res) => setTeams(res.teams));
    }
  }, [userDetails, token, managementView, userTeamsOnly]);

  const placeHolder = (
    <div className="pb4 bg-tan">
      <div className="w-50-ns w-100 cf ph6-l ph4">
        <TextBlock rows={1} className="bg-grey-light h3" />
        <TextBlock rows={1} className="bg-grey-light h2 mt2" />
      </div>
      <RectShape className="bg-white dib mv2 mh6" style={{ width: 250, height: 300 }} />
      <RectShape className="bg-white dib mv2 mh6" style={{ width: 250, height: 300 }} />
    </div>
  );

  return (
    <ReactPlaceholder
      showLoadingAnimation={true}
      customPlaceholder={placeHolder}
      delay={10}
      ready={teams !== null}
    >
      <TeamsManagement
        teams={teams}
        userDetails={userDetails}
        managementView={managementView}
        userTeamsOnly={userTeamsOnly}
        setUserTeamsOnly={setUserTeamsOnly}
      />
      <TeamsStats />
    </ReactPlaceholder>
  );
}

const joinTeamRequest = (team_id, username, role, token) => {
  pushToLocalJSONAPI(
    `teams/${team_id}/actions/join/`,
    JSON.stringify({ username: username, role: role }),
    token,
    'POST',
  );
};
const leaveTeamRequest = (team_id, username, role, token) => {
  pushToLocalJSONAPI(
    `teams/${team_id}/actions/leave/`,
    JSON.stringify({ username: username, role: role }),
    token,
    'POST',
  );
};

export function CreateTeam() {
  useSetTitleTag('Create new team');
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  const token = useSelector((state) => state.auth.get('token'));
  const [managers, setManagers] = useState([]);
  const [members, setMembers] = useState([]);
  const [newTeamId, setNewTeamId] = useState(null);

  useEffect(() => {
    if (userDetails && userDetails.username && managers.length === 0) {
      setManagers([{ username: userDetails.username, pictureUrl: userDetails.pictureUrl }]);
    }
  }, [userDetails, managers]);

  useEffect(() => {
    if (newTeamId) {
      redirectTo(`/manage/teams/${newTeamId}`);
    }
  }, [newTeamId]);

  const addManagers = (values) => {
    const newValues = values.filter(
      (newUser) => !managers.map((i) => i.username).includes(newUser.username),
    );
    setManagers(managers.concat(newValues));
  };
  const removeManagers = (username) => {
    setManagers(managers.filter((i) => i.username !== username));
  };
  const addMembers = (values) => {
    const newValues = values.filter(
      (newUser) => !members.map((i) => i.username).includes(newUser.username),
    );
    setMembers(members.concat(newValues));
  };
  const removeMembers = (username) => {
    setMembers(members.filter((i) => i.username !== username));
  };
  const createTeam = (payload) => {
    delete payload['organisation'];
    pushToLocalJSONAPI('teams/', JSON.stringify(payload), token, 'POST').then((result) => {
      managers
        .filter((user) => user.username !== userDetails.username)
        .map((user) => joinTeamRequest(result.teamId, user.username, 'MANAGER', token));
      members.map((user) => joinTeamRequest(result.teamId, user.username, 'MEMBER', token));
      setNewTeamId(result.teamId);
    });
  };

  return (
    <Form
      onSubmit={(values) => createTeam(values)}
      render={({ handleSubmit, pristine, form, submitting, values }) => {
        return (
          <form onSubmit={handleSubmit} className="blue-grey">
            <div className="cf pb5">
              <h3 className="f2 mb3 ttu blue-dark fw7 barlow-condensed">
                <FormattedMessage {...messages.newTeam} />
              </h3>
              <div className="w-40-l w-100 fl">
                <div className="bg-white b--grey-light ba pa4 mb3">
                  <h3 className="f3 blue-dark mv0 fw6">
                    <FormattedMessage {...messages.teamInfo} />
                  </h3>
                  <TeamInformation />
                </div>
              </div>
              <div className="w-40-l w-100 fl pl5-l pl0 ">
                <div className="mb3">
                  <Members
                    addMembers={addManagers}
                    removeMembers={removeManagers}
                    members={managers}
                    resetMembersFn={setManagers}
                    creationMode={true}
                  />
                </div>
                <div className="mb3">
                  <Members
                    addMembers={addMembers}
                    removeMembers={removeMembers}
                    members={members}
                    resetMembersFn={setMembers}
                    creationMode={true}
                    type={'members'}
                  />
                </div>
              </div>
            </div>
            <div className="fixed left-0 right-0 bottom-0 cf bg-white h3">
              <div className="w-80-ns w-60-m w-50 h-100 fl tr">
                <Link to={'../'}>
                  <CustomButton className="bg-white mr5 pr2 h-100 bn bg-white blue-dark">
                    <FormattedMessage {...messages.cancel} />
                  </CustomButton>
                </Link>
              </div>
              <div className="w-20-l w-40-m w-50 h-100 fr">
                <FormSubmitButton
                  disabled={submitting || pristine || !values.organisation_id || !values.visibility}
                  className="w-100 h-100 bg-red white"
                  disabledClassName="bg-red o-50 white w-100 h-100"
                >
                  <FormattedMessage {...messages.createTeam} />
                </FormSubmitButton>
              </div>
            </div>
          </form>
        );
      }}
    ></Form>
  );
}

export function EditTeam(props) {
  useSetTitleTag('Edit team');
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  const token = useSelector((state) => state.auth.get('token'));
  const [error, loading, team] = useFetch(`teams/${props.id}/`);
  const [initManagers, setInitManagers] = useState(false);
  const [managers, setManagers] = useState([]);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [canUserEditTeam] = useEditTeamAllowed(team);
  useEffect(() => {
    if (!initManagers && team && team.members) {
      setManagers(filterActiveManagers(team.members));
      setMembers(filterActiveMembers(team.members));
      setRequests(filterInactiveMembersAndManagers(team.members));
      setInitManagers(true);
    }
  }, [team, managers, initManagers]);

  const addManagers = (values) => {
    const newValues = values
      .filter((newUser) => !managers.map((i) => i.username).includes(newUser.username))
      .map((user) => formatMemberObject(user, true));
    setManagers(managers.concat(newValues));
  };
  const removeManagers = (username) => {
    setManagers(managers.filter((i) => i.username !== username));
  };
  const addMembers = (values) => {
    const newValues = values
      .filter((newUser) => !members.map((i) => i.username).includes(newUser.username))
      .map((user) => formatMemberObject(user));
    setMembers(members.concat(newValues));
  };
  const removeMembers = (username) => {
    setMembers(members.filter((i) => i.username !== username));
  };
  const updateManagers = () => {
    const { usersAdded, usersRemoved } = getMembersDiff(team.members, managers, true);
    usersAdded.forEach((user) => joinTeamRequest(team.teamId, user, 'MANAGER', token));
    usersRemoved.forEach((user) => leaveTeamRequest(team.teamId, user, 'MANAGER', token));
    team.members = team.members
      .filter((user) => user.function === 'MEMBER' || user.active === false)
      .concat(managers);
  };
  const updateMembers = () => {
    const { usersAdded, usersRemoved } = getMembersDiff(team.members, members);
    usersAdded.forEach((user) => joinTeamRequest(team.teamId, user, 'MEMBER', token));
    usersRemoved.forEach((user) => leaveTeamRequest(team.teamId, user, 'MEMBER', token));
    team.members = team.members
      .filter((user) => user.function === 'MANAGER' || user.active === false)
      .concat(members);
  };

  const updateTeam = (payload) => {
    pushToLocalJSONAPI(`teams/${props.id}/`, JSON.stringify(payload), token, 'PATCH');
  };

  if (team && team.teamId && !canUserEditTeam) {
    return (
      <div className="cf w-100 pv5">
        <div className="tc">
          <h3 className="f3 fw8 mb4 barlow-condensed">
            <FormattedMessage {...messages.teamEditNotAllowed} />
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div className="cf pb4 bg-tan">
      <div className="cf mt4">
        <h3 className="f2 ttu blue-dark fw7 barlow-condensed v-mid ma0 dib ttu">
          <FormattedMessage {...messages.manageTeam} />
        </h3>
        <DeleteModal id={team.teamId} name={team.name} type="teams" />
      </div>
      <div className="w-40-l w-100 mt4 fl">
        <TeamForm
          userDetails={userDetails}
          team={{
            name: team.name,
            description: team.description,
            inviteOnly: team.inviteOnly,
            visibility: team.visibility,
            organisation_id: team.organisation_id,
          }}
          updateTeam={updateTeam}
          disabledForm={error || loading}
        />
      </div>
      <div className="w-40-l w-100 mt4 pl5-l pl0 fl">
        <Members
          addMembers={addManagers}
          removeMembers={removeManagers}
          saveMembersFn={updateManagers}
          resetMembersFn={setManagers}
          members={managers}
        />
        <div className="h1"></div>
        <Members
          addMembers={addMembers}
          removeMembers={removeMembers}
          saveMembersFn={updateMembers}
          resetMembersFn={setMembers}
          members={members}
          type="members"
        />
        <div className="h1"></div>
        <JoinRequests
          requests={requests}
          teamId={team.teamId}
          addMembers={addMembers}
          updateRequests={setRequests}
        />
        <div className="h1"></div>
        <MessageMembers teamId={team.teamId} />
      </div>
    </div>
  );
}

export function TeamDetail(props) {
  useSetTitleTag(`Team #${props.id}`);
  const userDetails = useSelector((state) => state.auth.get('userDetails'));
  const token = useSelector((state) => state.auth.get('token'));
  const [error, loading, team] = useFetch(`teams/${props.id}/`);
  // eslint-disable-next-line
  const [projectsError, projectsLoading, projects] = useFetch(
    `projects/?teamId=${props.id}&omitMapResults=true`,
    props.id,
  );
  const [isMember, setIsMember] = useState(false);
  const [managers, setManagers] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (team && team.members) {
      setManagers(filterActiveManagers(team.members));
      setMembers(filterActiveMembers(team.members));
      const membersFiltered = team.members.filter(
        (member) => member.username === userDetails.username,
      );
      if (membersFiltered.length) {
        setIsMember(membersFiltered.filter((i) => i.active === true).length ? true : 'requested');
      }
    }
  }, [team, userDetails.username]);

  const joinTeam = () => {
    pushToLocalJSONAPI(
      `teams/${props.id}/actions/join/`,
      JSON.stringify({ role: 'MEMBER', username: userDetails.username }),
      token,
      'POST',
    ).then((res) => setIsMember(team.inviteOnly ? 'requested' : true));
  };

  const leaveTeam = () => {
    pushToLocalJSONAPI(
      `teams/${props.id}/actions/leave/`,
      JSON.stringify({ username: userDetails.username }),
      token,
      'POST',
    ).then((res) => setIsMember(false));
  };

  if (!loading && error) {
    return <NotFound />;
  } else {
    return (
      <>
        <div className="cf pa4-ns pa2 bg-tan blue-dark overflow-y-scroll-ns vh-minus-185-ns h-100">
          <div className="w-40-l w-100 mt2 fl">
            <TeamSideBar
              team={team}
              members={members}
              managers={managers}
              requestedToJoin={isMember === 'requested'}
            />
          </div>
          <div className="w-60-l w-100 mt2 pl5-l pl0 fl">
            <Projects
              projects={projects}
              viewAllEndpoint={`/explore/?team=${props.id}`}
              ownerEntity="team"
              showManageButtons={false}
            />
          </div>
        </div>
        <div className="fixed bottom-0 cf bg-white h3 w-100">
          <div className="w-80-ns w-60-m w-50 h-100 fl tr">
            <Link to={'/contributions/teams'}>
              <CustomButton className="bg-white mr5 pr2 h-100 bn bg-white blue-dark">
                <FormattedMessage {...messages.myTeams} />
              </CustomButton>
            </Link>
          </div>
          <div className="w-20-l w-40-m w-50 h-100 fr">
            {isMember ? (
              <CustomButton
                className="w-100 h-100 bg-red white"
                disabledClassName="bg-red o-50 white w-100 h-100"
                onClick={() => leaveTeam()}
              >
                <FormattedMessage
                  {...messages[isMember === 'requested' ? 'cancelRequest' : 'leaveTeam']}
                />
              </CustomButton>
            ) : (
              <CustomButton
                className="w-100 h-100 bg-red white"
                disabledClassName="bg-red o-50 white w-100 h-100"
                onClick={() => joinTeam()}
              >
                <FormattedMessage {...messages.joinTeam} />
              </CustomButton>
            )}
          </div>
        </div>
      </>
    );
  }
}
