function App() {
  const onSubmit = async () => {
    const response = await fetch('http://localhost:3000', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        query: `
          query {
            hello
          }
        `,
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
