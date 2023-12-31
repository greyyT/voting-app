import { AppPage, actions, state } from './state';
import { CSSTransition } from 'react-transition-group';

import Create from './pages/Create';
import Join from './pages/Join';
import Welcome from './pages/Welcome';
import { useSnapshot } from 'valtio';
import WaitingRoom from './pages/WaitingRoom';
import { useEffect } from 'react';
import Voting from './pages/Voting';
import Results from './pages/Results';

const routeConfig = {
  [AppPage.Welcome]: Welcome,
  [AppPage.Create]: Create,
  [AppPage.Join]: Join,
  [AppPage.WaitingRoom]: WaitingRoom,
  [AppPage.Voting]: Voting,
  [AppPage.Results]: Results,
};

const Pages: React.FC = () => {
  const currentState = useSnapshot(state);

  useEffect(() => {
    if (currentState.me?.id && currentState.poll && !currentState.poll?.isStarted) {
      actions.setPage(AppPage.WaitingRoom);
    }

    if (currentState.me?.id && currentState.poll?.isStarted) {
      actions.setPage(AppPage.Voting);
    }

    if (currentState.me?.id && currentState.hasVoted) {
      actions.setPage(AppPage.Results);
    }
  }, [currentState.me?.id, currentState.poll, currentState.poll?.isStarted, currentState.hasVoted]);

  return (
    <>
      {Object.entries(routeConfig).map(([page, Component]) => (
        <CSSTransition key={page} in={page === currentState.currentPage} timeout={300} classNames="page" unmountOnExit>
          <div className="page mobile-height max-w-screen-sm mx-auto py-8 px-4 overflow-y-auto">
            <Component />
          </div>
        </CSSTransition>
      ))}
    </>
  );
};

export default Pages;
