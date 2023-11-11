import React, { useState } from 'react';
import { actions } from '../state';

const Join: React.FC = () => {
  const [pollID, setPollID] = useState('');
  const [name, setName] = useState('');
  const [apiError, setApiError] = useState('');

  const fieldsValidator = (): boolean => {
    if (pollID.length < 6 || pollID.length > 6) {
      return false;
    }

    if (name.length < 1 || name.length > 25) {
      return false;
    }

    return true;
  };

  const handleJoinPoll = async () => console.log('joinPoll');

  return (
    <div className="flex flex-col w-full justify-around items-stretch h-full mx-auto max-w-sm">
      <div className="mb-12">
        <div className="my-4">
          <h3 className="text-center">Enter Code Provided by &quot;Friend&quot;</h3>
          <div className="text-center w-full">
            <input
              type="text"
              name="poll-id"
              maxLength={6}
              value={pollID}
              onChange={(e) => setPollID(e.target.value)}
              className="box info w-full"
              autoCapitalize="characters"
              style={{ textTransform: 'uppercase' }}
            />
          </div>
        </div>
        <div className="my-4">
          <h3 className="text-center">Your Name</h3>
          <div className="text-center w-full">
            <input
              type="text"
              name="rankr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="box info w-full"
            />
          </div>
        </div>
        {apiError && <p className="text-center text-red-600 font-light mt-8">{apiError}</p>}
      </div>
      <div className="my-12 flex flex-col justify-center items-center">
        <button className="box btn-orange w-32 my-2" disabled={!fieldsValidator()} onClick={handleJoinPoll}>
          Join
        </button>
        <button className="box btn-puple w-32 my-2" onClick={() => actions.startOver()}>
          Start Over
        </button>
      </div>
    </div>
  );
};

export default Join;
