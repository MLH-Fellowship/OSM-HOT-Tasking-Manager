import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Popup from 'reactjs-popup';
import { navigate } from '@reach/router';
import { useDropzone } from 'react-dropzone';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import { Button } from '../button';
import { Alert } from '../alert';
import { DeleteModal } from '../deleteModal';
import { styleClasses } from '../../views/projectEdit';
import { fetchLocalJSONAPI, pushToLocalJSONAPI } from '../../network/genericJSONRequest';
import { useOnDrop } from '../../hooks/UseUploadImage';
import { useAsync } from '../../hooks/UseAsync';
import FileRejections from '../comments/fileRejections';
import DropzoneUploadStatus from '../comments/uploadStatus';
import { DROPZONE_SETTINGS } from '../../config';

const ActionStatus = ({ status, action }) => {
  let successMessage = '';
  let errorMessage = '';

  switch (action) {
    case 'MESSAGE_CONTRIBUTORS':
      successMessage = 'messageContributorsSuccess';
      errorMessage = 'messageContributorsError';
      break;
    case 'MAP_ALL_TASKS':
      successMessage = 'mapAllSuccess';
      errorMessage = 'mapAllError';
      break;
    case 'INVALIDATE_ALL_TASKS':
      successMessage = 'invalidateAllSuccess';
      errorMessage = 'invalidateAllError';
      break;
    case 'VALIDATE_ALL_TASKS':
      successMessage = 'validateAllSuccess';
      errorMessage = 'validateAllError';
      break;
    case 'RESET_BAD_IMAGERY':
      successMessage = 'resetBadImagerySuccess';
      errorMessage = 'resetBadImageryError';
      break;
    case 'RESET_ALL':
      successMessage = 'resetAllSuccess';
      errorMessage = 'resetAllError';
      break;
    case 'TRANSFER_PROJECT':
      successMessage = 'transferProjectSuccess';
      errorMessage = 'transferProjectError';
      break;
    case 'DELETE_PROJECT':
      successMessage = 'deleteProjectSuccess';
      errorMessage = 'deleteProjectError';
      break;
    default:
      return null;
  }

  return (
    <>
      {status === 'success' && (
        <Alert type="success">
          <FormattedMessage {...messages[successMessage]} />
        </Alert>
      )}
      {status === 'error' && (
        <Alert type="error">{<FormattedMessage {...messages[errorMessage]} />}</Alert>
      )}
    </>
  );
};

const ResetTasksModal = ({ projectId, close }: Object) => {
  const token = useSelector((state) => state.auth.get('token'));

  const resetTasks = () => {
    return fetchLocalJSONAPI(`projects/${projectId}/tasks/actions/reset-all/`, token, 'POST');
  };
  const resetTasksAsync = useAsync(resetTasks);

  return (
    <div className={styleClasses.modalClass}>
      <h2 className={styleClasses.modalTitleClass}>
        <FormattedMessage {...messages.taskReset} />
      </h2>

      <p className={`${styleClasses.pClass} pb3 `}>
        <FormattedMessage {...messages.taskResetConfirmation} />
      </p>

      <ActionStatus status={resetTasksAsync.status} action="RESET_ALL" />
      <p className="tr">
        <Button className={styleClasses.whiteButtonClass} onClick={close}>
          <FormattedMessage {...messages.cancel} />
        </Button>
        <Button
          className={styleClasses.primaryButtonClass}
          onClick={() => resetTasksAsync.execute()}
          loading={resetTasksAsync.status === 'pending'}
          disabled={resetTasksAsync.status === 'pending'}
        >
          <FormattedMessage {...messages.taskResetButton} />
        </Button>
      </p>
    </div>
  );
};

const ResetBadImageryModal = ({ projectId, close }: Object) => {
  const token = useSelector((state) => state.auth.get('token'));

  const resetBadImagery = () => {
    return fetchLocalJSONAPI(
      `projects/${projectId}/tasks/actions/reset-all-badimagery/`,
      token,
      'POST',
    );
  };

  const resetBadImageryAsync = useAsync(resetBadImagery);

  return (
    <div className={styleClasses.modalClass}>
      <h2 className={styleClasses.modalTitleClass}>
        <FormattedMessage {...messages.resetBadImagery} />
      </h2>

      <p className={styleClasses.pClass}>
        <FormattedMessage {...messages.resetBadImageryConfirmation} />
      </p>
      <p className={`${styleClasses.pClass} pb2`}>
        <FormattedMessage {...messages.resetBadImageryDescription} />
      </p>

      <ActionStatus status={resetBadImageryAsync.status} action="RESET_BAD_IMAGERY" />
      <p>
        <Button className={styleClasses.whiteButtonClass} onClick={close}>
          <FormattedMessage {...messages.cancel} />
        </Button>
        <Button
          className={styleClasses.primaryButtonClass}
          onClick={() => resetBadImageryAsync.execute()}
          loading={resetBadImageryAsync.status === 'pending'}
          disabled={resetBadImageryAsync.status === 'pending'}
        >
          <FormattedMessage {...messages.resetBadImageryButton} />
        </Button>
      </p>
    </div>
  );
};

const ValidateAllTasksModal = ({ projectId, close }: Object) => {
  const token = useSelector((state) => state.auth.get('token'));

  const validateAllTasks = () => {
    return fetchLocalJSONAPI(`projects/${projectId}/tasks/actions/validate-all/`, token, 'POST');
  };

  const validateAllTasksAsync = useAsync(validateAllTasks);

  return (
    <div className={styleClasses.modalClass}>
      <h2 className={styleClasses.modalTitleClass}>
        <FormattedMessage {...messages.validateAllTasks} />
      </h2>

      <p className={styleClasses.pClass}>
        <FormattedMessage {...messages.validateAllTasksConfirmation} />
      </p>
      <p className={`${styleClasses.pClass} pb2`}>
        <FormattedMessage {...messages.validateAllTasksDescription} />
      </p>

      <ActionStatus status={validateAllTasksAsync.status} action="VALIDATE_ALL_TASKS" />
      <p>
        <Button className={styleClasses.whiteButtonClass} onClick={close}>
          <FormattedMessage {...messages.cancel} />
        </Button>
        <Button
          className={styleClasses.primaryButtonClass}
          onClick={() => validateAllTasksAsync.execute()}
          loading={validateAllTasksAsync.status === 'pending'}
          disabled={validateAllTasksAsync.status === 'pending'}
        >
          <FormattedMessage {...messages.validateAllTasks} />
        </Button>
      </p>
    </div>
  );
};

const InvalidateAllTasksModal = ({ projectId, close }: Object) => {
  const token = useSelector((state) => state.auth.get('token'));

  const invalidateAllTasks = () => {
    return fetchLocalJSONAPI(`projects/${projectId}/tasks/actions/invalidate-all/`, token, 'POST');
  };

  const invalidateAllTasksAsync = useAsync(invalidateAllTasks);

  return (
    <div className={styleClasses.modalClass}>
      <h2 className={styleClasses.modalTitleClass}>
        <FormattedMessage {...messages.invalidateAll} />
      </h2>

      <p className={styleClasses.pClass}>
        <FormattedMessage {...messages.invalidateAllConfirmation} />
      </p>
      <p className={`${styleClasses.pClass} pb2`}>
        <FormattedMessage {...messages.invalidateAllDescription} />
      </p>

      <ActionStatus status={invalidateAllTasksAsync.status} action="INVALIDATE_ALL_TASKS" />
      <p>
        <Button className={styleClasses.whiteButtonClass} onClick={close}>
          <FormattedMessage {...messages.cancel} />
        </Button>
        <Button
          className={styleClasses.primaryButtonClass}
          onClick={() => invalidateAllTasksAsync.execute()}
          loading={invalidateAllTasksAsync.status === 'pending'}
          disabled={invalidateAllTasksAsync.status === 'pending'}
        >
          <FormattedMessage {...messages.invalidateAll} />
        </Button>
      </p>
    </div>
  );
};

const MapAllTasksModal = ({ projectId, close }: Object) => {
  const token = useSelector((state) => state.auth.get('token'));

  const mapAllTasks = () => {
    return fetchLocalJSONAPI(`projects/${projectId}/tasks/actions/map-all/`, token, 'POST');
  };
  const mapAllTasksAsync = useAsync(mapAllTasks);

  return (
    <div className={styleClasses.modalClass}>
      <h2 className={styleClasses.modalTitleClass}>
        <FormattedMessage {...messages.mapAll} />
      </h2>
      <p className={styleClasses.pClass}>
        <FormattedMessage {...messages.mapAllConfirmation} />
      </p>
      <p className={`${styleClasses.pClass} pb2`}>
        <FormattedMessage {...messages.mapAllDescription} />
      </p>
      <ActionStatus status={mapAllTasksAsync.status} action="MAP_ALL_TASKS" />
      <p>
        <Button className={styleClasses.whiteButtonClass} onClick={close}>
          <FormattedMessage {...messages.cancel} />
        </Button>
        <Button
          className={styleClasses.primaryButtonClass}
          onClick={() => mapAllTasksAsync.execute()}
          loading={mapAllTasksAsync.status === 'pending'}
          disabled={mapAllTasksAsync.status === 'pending'}
        >
          <FormattedMessage {...messages.mapAll} />
        </Button>
      </p>
    </div>
  );
};

const MessageContributorsModal = ({ projectId, close }: Object) => {
  const [data, setData] = useState({ message: '', subject: '' });
  const token = useSelector((state) => state.auth.get('token'));
  const appendImgToMessage = (url) =>
    setData({ ...data, message: `${data.message}\n![image](${url})\n` });
  const [uploadError, uploading, onDrop] = useOnDrop(appendImgToMessage);
  const { fileRejections, getRootProps, getInputProps } = useDropzone({
    onDrop,
    ...DROPZONE_SETTINGS,
  });

  const messageAllContributors = () => {
    return pushToLocalJSONAPI(
      `projects/${projectId}/actions/message-contributors/`,
      JSON.stringify(data),
      token,
      'POST',
    );
  };

  const messageAllContributorsAsync = useAsync(messageAllContributors);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  return (
    <div className={styleClasses.modalClass}>
      <h2 className={styleClasses.modalTitleClass}>
        <FormattedMessage {...messages.messageContributors} />
      </h2>
      <p className={styleClasses.pClass + ' pb3'}>
        <FormattedMessage {...messages.messageContributorsDescription} />
      </p>
      <FormattedMessage {...messages.subjectPlaceholder}>
        {(msg) => {
          return (
            <input
              value={data.subject}
              onChange={handleChange}
              name="subject"
              className="db center pa2 w-100 fl mb3"
              type="text"
              placeholder={msg}
            />
          );
        }}
      </FormattedMessage>
      <FormattedMessage {...messages.messagePlaceholder}>
        {(msg) => {
          return (
            <div {...getRootProps()}>
              <textarea
                {...getInputProps()}
                value={data.message}
                onChange={handleChange}
                name="message"
                className="dib w-100 fl pa2 mb2"
                style={{ display: 'inline-block' }} // we need to set display, as dropzone makes it none as default
                type="text"
                placeholder={msg}
                rows={4}
              />
            </div>
          );
        }}
      </FormattedMessage>
      <DropzoneUploadStatus uploading={uploading} uploadError={uploadError} />
      <FileRejections files={fileRejections} />
      <p className={styleClasses.pClass}>
        <FormattedMessage {...messages.messageContributorsTranslationAlert} />
      </p>

      <ActionStatus status={messageAllContributorsAsync.status} action="MESSAGE_CONTRIBUTORS" />
      <p>
        <Button className={styleClasses.whiteButtonClass} onClick={close}>
          <FormattedMessage {...messages.cancel} />
        </Button>
        <Button
          className={styleClasses.primaryButtonClass}
          onClick={() => messageAllContributorsAsync.execute()}
          loading={messageAllContributorsAsync.status === 'pending'}
          disabled={messageAllContributorsAsync.status === 'pending'}
        >
          <FormattedMessage {...messages.messageContributors} />
        </Button>
      </p>
    </div>
  );
};

const TransferProject = ({ projectId }: Object) => {
  const token = useSelector((state) => state.auth.get('token'));
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState([]);
  const handleUsers = (e) => {
    const fetchUsers = (user) => {
      fetchLocalJSONAPI(`users/?username=${user}&role=ADMIN`, token)
        .then((res) => setUsers(res.users.map((user) => user.username)))
        .catch((e) => setUsers([]));
    };

    const user = e.target.value;
    setUsername(user);
    fetchUsers(user);
  };

  const transferOwnership = () => {
    return pushToLocalJSONAPI(
      `projects/${projectId}/actions/transfer-ownership/`,
      JSON.stringify({ username: username }),
      token,
      'POST',
    );
  };
  const transferOwnershipAsync = useAsync(transferOwnership);

  return (
    <div>
      <Popup
        contentStyle={{ padding: 0, border: 0 }}
        arrow={false}
        trigger={
          <input
            className={styleClasses.inputClass.replace('80', '40') + ' pa2 fl mr2'}
            type="text"
            value={username}
            name="transferuser"
            onChange={handleUsers}
          />
        }
        on="focus"
        position="bottom left"
        open={users.length !== 0 ? true : false}
      >
        <div>
          {users.map((u, n) => (
            <span
              className="db pa1 pointer"
              key={n}
              onClick={() => {
                setUsername(u);
                setUsers([]);
              }}
            >
              {u}
            </span>
          ))}
        </div>
      </Popup>
      <Button
        onClick={() => transferOwnershipAsync.execute()}
        loading={transferOwnershipAsync.status === 'pending'}
        disabled={transferOwnershipAsync.status === 'pending'}
        className={styleClasses.buttonClass}
      >
        <FormattedMessage {...messages.transferProject} />
      </Button>
      <div className="pt1">
        <ActionStatus status={transferOwnershipAsync.status} action="TRANSFER_PROJECT" />
      </div>
    </div>
  );
};

export const ActionsForm = ({ projectId, projectName }: Object) => {
  return (
    <div className="w-100">
      <div className={styleClasses.divClass}>
        <label className={styleClasses.labelClass}>
          <FormattedMessage {...messages.messageContributors} />
        </label>
        <Popup
          trigger={
            <Button className={styleClasses.actionClass}>
              <FormattedMessage {...messages.messageContributors} />
            </Button>
          }
          modal
          closeOnDocumentClick
        >
          {(close) => <MessageContributorsModal projectId={projectId} close={close} />}
        </Popup>
      </div>
      <div className={styleClasses.divClass}>
        <label className={styleClasses.labelClass}>
          <FormattedMessage {...messages.mappingValidationSection} />
        </label>
        <p className={styleClasses.pClass}>
          <FormattedMessage {...messages.mappingValidationSectionDescription} />
        </p>
        <p className={styleClasses.pClass}>
          <span className="fw6">
            <FormattedMessage {...messages.warning} />:{' '}
          </span>
          <FormattedMessage {...messages.canNotUndo} />
        </p>
        <Popup
          trigger={
            <Button className={styleClasses.actionClass}>
              <FormattedMessage {...messages.mapAll} />
            </Button>
          }
          modal
          closeOnDocumentClick
        >
          {(close) => <MapAllTasksModal projectId={projectId} close={close} />}
        </Popup>
        <Popup
          trigger={
            <Button className={styleClasses.actionClass}>
              <FormattedMessage {...messages.invalidateAll} />
            </Button>
          }
          modal
          closeOnDocumentClick
        >
          {(close) => <InvalidateAllTasksModal projectId={projectId} close={close} />}
        </Popup>
        <Popup
          trigger={
            <Button className={styleClasses.actionClass}>
              <FormattedMessage {...messages.validateAllTasks} />
            </Button>
          }
          modal
          closeOnDocumentClick
        >
          {(close) => <ValidateAllTasksModal projectId={projectId} close={close} />}
        </Popup>
      </div>

      <div className={styleClasses.divClass}>
        <label className={styleClasses.labelClass}>
          <FormattedMessage {...messages.resetAll} />
        </label>
        <p className={styleClasses.pClass}>
          <FormattedMessage {...messages.resetAllDescription} />
        </p>
        <p className={styleClasses.pClass}>
          <span className="fw6">
            <FormattedMessage {...messages.warning} />:{' '}
          </span>
          <FormattedMessage {...messages.canNotUndo} />
        </p>
        <Popup
          trigger={
            <Button className={styleClasses.actionClass}>
              <FormattedMessage {...messages.resetAllButton} />
            </Button>
          }
          modal
          closeOnDocumentClick
        >
          {(close) => <ResetTasksModal projectId={projectId} close={close} />}
        </Popup>
        <Popup
          trigger={
            <Button className={styleClasses.actionClass}>
              <FormattedMessage {...messages.resetBadImageryButton} />
            </Button>
          }
          modal
          closeOnDocumentClick
        >
          {(close) => <ResetBadImageryModal projectId={projectId} close={close} />}
        </Popup>
      </div>

      <div className={styleClasses.divClass}>
        <label className={styleClasses.labelClass}>
          <FormattedMessage {...messages.transferProjectTitle} />
        </label>
        <p className={styleClasses.pClass}>
          <span className="fw6">
            <FormattedMessage {...messages.warning} />:{' '}
          </span>
          <FormattedMessage {...messages.canNotUndo} />
        </p>
        <p className={styleClasses.pClass}>
          <FormattedMessage {...messages.transferProjectAlert} />
        </p>
        <TransferProject projectId={projectId} />
      </div>

      <div className={styleClasses.divClass}>
        <label className={styleClasses.labelClass}>
          <FormattedMessage {...messages.cloneProject} />
        </label>
        <p className={styleClasses.pClass}>
          <FormattedMessage {...messages.cloneProjectDescription} />
        </p>
        <Button
          onClick={() => navigate(`/manage/projects/new/?cloneFrom=${projectId}`)}
          className={styleClasses.actionClass}
        >
          <FormattedMessage {...messages.cloneProject} />
        </Button>
      </div>

      <div className={styleClasses.divClass}>
        <label className={styleClasses.labelClass}>
          <FormattedMessage {...messages.deleteProject} />
        </label>
        <p className={styleClasses.pClass}>
          <FormattedMessage {...messages.deleteProjectAlert} />
        </p>
        <p className={styleClasses.pClass}>
          <span className="fw6">
            <FormattedMessage {...messages.warning} />:{' '}
          </span>
          <FormattedMessage {...messages.canNotUndo} />
        </p>
        <DeleteModal
          id={projectId}
          name={projectName}
          type={'projects'}
          className="pointer"
        />
      </div>
    </div>
  );
};
