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
    window.location.href="http://127.0.0.1:8000/chatbot/save_chat_history"
  }

  return (
    <div className="App">
      <div style={{ position: "relative", height: "800px", width: "700px", }}>
        <div style={{ height: "10%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ height: "100%", display: "flex", alignItems: "center" }}>
            <img src={logo} alt="" style={{ height: "100%" }} />
            <p style={{ fontFamily: "Mukta", fontSize: "2rem", fontWeight: "bold", marginLeft: "8px" }}>WeCare</p>
          </div>
          <button onClick={ChatHistory}>Chat History</button>
        </div>


        <MainContainer style={{ height: "80%", borderRadius: "25px" }}>
          <ChatContainer>
            <MessageList
              scrollBehavior="smooth"
              typingIndicator={isTyping ? <TypingIndicator content="ChatGPT is typing" /> : null}
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
      </div>
    </div>
  )
}

export default App
