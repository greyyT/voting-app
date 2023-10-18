function App() {
  const onSubmit = async () => {
    const response = await fetch('http://localhost:3000/polls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        topic: 'What is your favorite color?',
        votesPerVoter: 2,
        name: 'Color Poll',
      }),
    });
    const data = await response.json();
    console.log(data);
  };
  return (
    <div className="h-screen w-screen bg-black text-white flex items-center justify-center">
      <button onClick={onSubmit} className="px-8 py-6 text-2xl text-white bg-purple-500 rounded-2xl">
        Submit
      </button>
    </div>
  );
}

export default App;
