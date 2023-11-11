import { useSnapshot } from 'valtio';
import Pages from './Pages';
import { state } from './state';
import Loader from './components/ui/Loader';

const App: React.FC = () => {
  const currentState = useSnapshot(state);

  return (
    <>
      <Loader isLoading={currentState.isLoading} color="orange" width={120} />
      <Pages />
    </>
  );
};

export default App;
