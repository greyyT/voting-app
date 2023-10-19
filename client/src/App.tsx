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
      body: JSON.stringify({ name: 'player2', pollID: '93SLUE' }),
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
    </div>
  );
}

export default App;
