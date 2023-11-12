import { proxy, ref } from 'valtio';
import { subscribeKey } from 'valtio/utils';
import { derive } from 'derive-valtio';

import { Poll } from 'shared';
import { getTokenPayload } from './util';
import { Socket } from 'socket.io-client';
import { createSocketWithHandlers, socketIOUrl } from './socket-io';

export enum AppPage {
  Welcome = 'welcome',
  Create = 'create',
  Join = 'join',
  WaitingRoom = 'waiting-room',
}

type Me = {
  id: string;
  name: string;
};

export type AppState = {
  isLoading: boolean;
  me?: Me;
  currentPage: AppPage;
  poll?: Poll;
  accessToken?: string;
  socket?: Socket;
};

const state: AppState = proxy({
  isLoading: false,
  currentPage: AppPage.Welcome,
});

const stateWithComputed: AppState = derive(
  {
    me: (get) => {
      const accessToken = get(state).accessToken;

      if (!accessToken) {
        return;
      }

      const token = getTokenPayload(accessToken);

      return {
        id: token.sub,
        name: token.name,
      };
    },
    isAdmin: (get) => (!get(state).me ? false : get(state).me?.id === get(state).poll?.adminID),
  },
  {
    proxy: state,
  },
);

const actions = {
  setPage: (page: AppPage): void => {
    state.currentPage = page;
  },
  startOver: (): void => {
    actions.setPage(AppPage.Welcome);
  },
  startLoading: (): void => {
    state.isLoading = true;
  },
  stopLoading: (): void => {
    state.isLoading = false;
  },
  initializePoll: (poll?: Poll): void => {
    state.poll = poll;
  },
  setPollAccessToken: (token?: string): void => {
    state.accessToken = token;
  },
  initializeSocket: (): void => {
    if (!state.socket) {
      state.socket = ref(createSocketWithHandlers({ socketIOUrl, state, actions }));
    } else {
      state.socket.connect();
    }
  },
  updatePoll: (poll: Poll): void => {
    state.poll = poll;
  },
};

subscribeKey(state, 'accessToken', () => {
  if (state.accessToken && state.poll) {
    localStorage.setItem('rankr:accessToken', state.accessToken);
  } else {
    localStorage.removeItem('rankr:accessToken');
  }
});

export type AppActions = typeof actions;

export { stateWithComputed as state, actions };
