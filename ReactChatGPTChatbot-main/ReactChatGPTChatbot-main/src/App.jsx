import React, { useState, useRef,useEffect } from 'react'
import './App.css'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import logo from "./image/logo.png"
import http from "./http"
const API_KEY = "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";
// "Explain things like you would to a 10 year old learning how to code."
const systemMessage = { //  Explain things like you're talking to a software professional with 5 years of experience.
  "role": "system", "content": "Explain things like you're talking to a software professional with 2 years of experience."
}

function App() {

  const [messages, setMessages] = useState([
    {
      message: "Hello, This is WeCare! Ask me anything!",
      sentTime: "just now",
      sender: "ChatGPT"
    }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/chatbot", {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log(data); // Do something with the fetched data
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData(); // Call the async function immediately
  
  }, []); // Empty dependency array means this effect runs once after the component mounts
  
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (message) => {
    const newMessage = {
      message,
      direction: 'outgoing',
      sender: "user"
    };
    const sendMessage = {
      user_input: message
    }
    const newMessages = [...messages, newMessage];

    setMessages(newMessages);

    // Initial system message to determine ChatGPT functionality
    // How it responds, how it talks, etc.
    setIsTyping(true);
    await fetch("http://127.0.0.1:8000/chatbot/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(sendMessage)
    }).then((res) => {
      res.json().then((data) => { // Parse the JSON content of the response
        console.log(data); // Log the parsed JSON data
        const responseText = data.response; // Accessing the 'response' property from the parsed JSON data
        console.log(responseText); // Log the response text
        setMessages([...newMessages, {
          message: responseText,
          sender: "ChatGPT"
        }]);
        setIsTyping(false);
      }).catch((error) => {
        console.error('Error parsing JSON:', error);
      });
    });
  };

  const handleSendPDF = async (message) => {
    const formData = new FormData();
    formData.append('file', message);

    const newMessage = {
      message: "Uploaded Medical Report",
      direction: 'outgoing',
      sender: "user"
    };
    const newMessages = [...messages, newMessage];

    setMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chatbot/summarize_pdf", {
        method: "POST",
        body: formData
      });

      const data = await response.json();
      const responseText = data.response;

      setMessages([...newMessages, {
        message: responseText,
        sender: "ChatGPT"
      }]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsTyping(false);
    }
  };




  const fileInputRef = useRef(null);

  const handleDocs = () => {
    if (fileInputRef.current) {
      // Programmatically trigger file input click
      fileInputRef.current.click();
    }

  }
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Get the file extension
      const extension = file.name.split('.').pop().toLowerCase();
      // Check if the file type is PDF based on extension
      if (extension === 'pdf') {
        handleSendPDF(file);
      }
    }
    // You can perform further processing of the uploaded file here
  }
  const ChatHistory = async () => {
    const response = await fetch("http://127.0.0.1:8000/chatbot/save_chat_history", {
      method: "GET",
    })
    window.open("http://127.0.0.1:8000/chatbot/save_chat_history", "_blank");

  }
  const night = () =>{
    const bg = document.querySelector('body')
    const chat = document.querySelector(".cs-main-container")
    if (bg.style.background == "black" ){
      bg.style.background = "white"
      chat.style.backgroundColor = "white"
      
    }
    else{
      bg.style.background = "black"
      chat.style.backgroundColor = "black"
    }
  }

  return (
    <div className="App">
      <div style={{ position: "relative", height: "800px", width: "700px", }}>
        <div style={{ height: "10%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ height: "100%", display: "flex", alignItems: "center",flex:"4" }}>
            <img src={logo} alt="" style={{ height: "100%" }} />
            <p style={{ fontFamily: "Mukta", fontSize: "2rem", fontWeight: "bold", marginLeft: "8px" }}>WeCare</p>
          </div>
          <button onClick={ChatHistory} style={{flex:"1"}}>Chat History</button>
          <button onClick={night} style={{outline:"none",flex:"1",marginLeft:"1%"}}>Night Mode</button>
        </div>


        <MainContainer style={{ height: "80%", borderRadius: "25px" }}>
          <ChatContainer id="chat">
            <MessageList
              scrollBehavior="smooth"
              typingIndicator={isTyping ? <TypingIndicator content="WeCare is typing" /> : null}
              style={{ paddingTop: "5%" }}
            >
              {messages.map((message, i) => {
                console.log(message)
                return <Message key={i} model={message} />
              })}
            </MessageList>
            <MessageInput placeholder="Type message here" onSend={handleSend} onAttachClick={handleDocs} />

          </ChatContainer>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </MainContainer>
        <div style={{float:"left",paddingTop:"3%", fontFamily: "Mukta",width:"100%",textAlign:"start"}}>
          <svg  style={{marginRight:"2%"}}aria-hidden="true" focusable="false" data-prefix="fas" data-icon="paperclip" class="svg-inline--fa fa-paperclip fa-w-14 " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M43.246 466.142c-58.43-60.289-57.341-157.511 1.386-217.581L254.392 34c44.316-45.332 116.351-45.336 160.671 0 43.89 44.894 43.943 117.329 0 162.276L232.214 383.128c-29.855 30.537-78.633 30.111-107.982-.998-28.275-29.97-27.368-77.473 1.452-106.953l143.743-146.835c6.182-6.314 16.312-6.422 22.626-.241l22.861 22.379c6.315 6.182 6.422 16.312.241 22.626L171.427 319.927c-4.932 5.045-5.236 13.428-.648 18.292 4.372 4.634 11.245 4.711 15.688.165l182.849-186.851c19.613-20.062 19.613-52.725-.011-72.798-19.189-19.627-49.957-19.637-69.154 0L90.39 293.295c-34.763 35.56-35.299 93.12-1.191 128.313 34.01 35.093 88.985 35.137 123.058.286l172.06-175.999c6.177-6.319 16.307-6.433 22.626-.256l22.877 22.364c6.319 6.177 6.434 16.307.256 22.626l-172.06 175.998c-59.576 60.938-155.943 60.216-214.77-.485z"></path></svg>
              Click to upload Medical Report
          </div>
          <div style={{float:"left",paddingTop:"3%", fontFamily: "Mukta",width:"100%",textAlign:"start"}}>
          <svg  style={{marginRight:"2%"}}aria-hidden="true" focusable="false" data-prefix="fas" data-icon="paper-plane" class="svg-inline--fa fa-paper-plane fa-w-16 " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M476 3.2L12.5 270.6c-18.1 10.4-15.8 35.6 2.2 43.2L121 358.4l287.3-253.2c5.5-4.9 13.3 2.6 8.6 8.3L176 407v80.5c0 23.6 28.5 32.9 42.5 15.8L282 426l124.6 52.2c14.2 6 30.4-2.9 33-18.2l72-432C515 7.8 493.3-6.8 476 3.2z"></path></svg>
              Click to send message or press "Enter"
              </div>
      </div>
    </div>
  )
}

export default App
