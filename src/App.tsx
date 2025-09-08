import { useState } from 'react';
import './App.css';
import axios, { type AxiosResponse } from 'axios';

function App() {

  const [pass, setPass] = useState<string>("");
  const [error, setError] = useState<string>("");

// const VALIDPASSTEST : string = "12345";

// Create an instance of axios with some default configuration

  const apiClient = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL
  });

// Define a generic API function

  const onValid = () => {
    setError("")   

    if(!pass.trim()){
      setError("Veuillez entrer un ID de connexion");
      return;
    }

    (async () => {
      try {
        const response : AxiosResponse = 
        await apiClient.post(`auth/login`,
          {    
            username: 'emilys',
            password: 'emilyspass'
         });
        console.log(response.data)
      } catch (error) {
        console.log(error)
        setError("Erreur de connexion")
      }
      
    })();
    

    console.log("Hello world :", pass)
 
  }

  return (
    <>
      <div className='header'>
        <img src="./where-logo.png" className='logo'/>
      </div>
      <h1>Connexion</h1>    
        <div>
          <p className='error'>{error}</p>
          <input type='text' 
            onInput={(e: React.ChangeEvent<HTMLInputElement>) => setPass(e.target.value)} 
            value={pass}
          />
          <input type='submit' onClick={onValid} value={"Connect !"}/>
      </div>
    </>
  );
}

export default App;
