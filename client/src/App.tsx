import { useSnapshot } from 'valtio';
import Pages from './Pages';
import { actions, state } from './state';
import Loader from './components/ui/Loader';
import { useEffect } from 'react';
import { getTokenPayload } from './util';
import SnackBar from './components/ui/SnackBar';

const App: React.FC = () => {
  const currentState = useSnapshot(state);

  useEffect(() => {
    console.log('App useEffect - check token and send to proper page');

    actions.startLoading();

    const accessToken = localStorage.getItem('rankr:accessToken');

    // if there's not accessToken, we'll be shown the default
    // state.currentPage of AppPage.Welcome
    if (!accessToken) {
      actions.stopLoading();
      return;
    }

    const { exp: tokenExp } = getTokenPayload(accessToken);
    const currentTimeInSeconds = Date.now() / 1000;

    // Remove old token
    // If token is within 10 seconds, prevent them from
    // connecting (poll will almost be over) since token
    // duration and poll duration are approximately at
    // the same time
    if (tokenExp < currentTimeInSeconds - 10) {
      localStorage.removeItem('rankr:accessToken');
      actions.stopLoading();
      return;
    }

    // reconnect to poll
    actions.setPollAccessToken(accessToken); // needed for socket.io connection
    // socket initialization on server sends updated poll to the client
    actions.initializeSocket();
  }, []);

  useEffect(() => {
    console.log('Check current participant');
    const myID = currentState.me?.id;

    if (myID && currentState.socket?.connected && !currentState.poll?.participants[myID]) {
      actions.startOver();
    }
  }, [currentState.poll?.participants, currentState.me?.id, currentState.socket?.connected]);

  return (
    <>
      <Loader isLoading={currentState.isLoading} color="orange" width={120} />
      {currentState.wsErrors.map((error) => (
        <SnackBar
          key={error.id}
          type="error"
          title={error.type}
          message={error.message}
          show={true}
          onClose={() => actions.removeWsError(error.id)}
          autoCloseDuration={5000}
        />
      ))}
      <Pages />
    </>
  );
};

export default App;
