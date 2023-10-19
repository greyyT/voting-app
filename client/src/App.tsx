function App() {
  const createPoll = async () => {
    const response = await fetch('http://localhost:3000/polls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        topic: 'What is your favorite color?',
        votesPerVoter: 2,
        name: 'player1',
      }),
    });
    const data = await response.json();
    console.log(data);
  };

  const joinPoll = async () => {
    const response = await fetch('http://localhost:3000/polls/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ name: 'player2', pollID: 'N03DSL' }),
    });

    const data = await response.json();
    console.log(data);
  };

  const rejoinPoll = async () => {
    const response = await fetch('http://localhost:3000/polls/rejoin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        accessToken:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwb2xsSUQiOiJOMDNEU0wiLCJuYW1lIjoicGxheWVyMiIsImlhdCI6MTY5NzcwNDExOCwiZXhwIjoxNjk3NzExMzE4LCJzdWIiOiJZU1dfOF9EZkRTVzR4eGFSNEhRUTcifQ.1rvCY9N1DXwusPkoZwJ7l_8b3hyB_ARXM4LPiY_Iaf8',
      }),
    });

    const data = await response.json();
    console.log(data);
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex items-center justify-center gap-8">
      <button onClick={createPoll} className="px-8 py-6 text-2xl text-white bg-purple-500 rounded-2xl">
        Create Poll
      </button>
      <button onClick={joinPoll} className="px-8 py-6 text-2xl text-white bg-purple-500 rounded-2xl">
        Join Poll
      </button>
      <button onClick={rejoinPoll} className="px-8 py-6 text-2xl text-white bg-purple-500 rounded-2xl">
        Rejoin
      </button>
    </div>
  );
}

export default App;
