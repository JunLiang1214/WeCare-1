import os
import pandas as pd
import openai
import uuid
import re
import time
from pinecone import Pinecone, PodSpec
from langchain.embeddings.openai import OpenAIEmbeddings #to convert text to embeddings for Pinecone vector DB
from langchain.chat_models import ChatOpenAI #this is used to generate the chatbot
from langchain.schema import HumanMessage, SystemMessage #SystemMessage to give context, while HumanMessage is the user input
from langchain.memory import ConversationBufferWindowMemory #to store the conversation history over the past k messages
from langchain.chains import ConversationChain #to chain the conversation together
from PyPDF2 import PdfReader
from fpdf import FPDF
import io
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from llm_openai import LLM_Chatbot
import warnings
from fastapi.middleware.cors import CORSMiddleware
warnings.filterwarnings("ignore")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  
    allow_headers=["*"],
)
app.llm = LLM_Chatbot()

#schema for user input in chatbot
class user_input_schema(BaseModel):
    user_input: str
 
#schema for response by chatbot to user input   
class chatbot_response_schema(BaseModel):
    response: str

#call this endpoint every time user goes to the chatbot page to refresh the chatbot and chat history
@app.get("/chatbot")
def init_chatbot():
    app.llm = LLM_Chatbot()

#call this endpoint when user sends a message in the chatbot
#expecting a JSON in the form {"user_input": user_input}
#returning a JSON in the form {"response": response}
@app.post("/chatbot/chat", response_model= chatbot_response_schema)
async def get_model_response(user_input: user_input_schema):
    
    user_input = user_input.dict()["user_input"]
    res = app.llm.get_model_response(user_input)
    return {"response": res}
    
#call this endpoint when user wants to save the chat history
#OPEN IT IN A NEW WINDOW -> the PDF will be displayed in the browser by just calling the endpoint
#IF YOU OPEN IN THE SAME WINDOW, then the user loses access to the chatbot
@app.get("/chatbot/save_chat_history")
async def save_chat_history():
    file_name = app.llm.save_chat_history()
    headers = {"Content-Disposition": f"inline; filename={file_name}"} #change 'inline' to 'attachment' to download instead of view and vice versa 
    response = FileResponse(file_name, media_type="application/pdf", headers=headers)
    return response

#call this endpoint when user uploads a PDF -> print the response inside the chatbot
#expecting a PDF file
#returning a JSON in the form {"response": response} -> display this in the chztbot chat
@app.post("/chatbot/summarize_pdf")
async def get_model_response_pdf_summary(file: UploadFile = File(...)):
    file_name = 'uploaded_pdf'
    with open(file_name, "wb") as pdf_file:
        pdf_file.write(file.file.read())
    
    response = app.llm.get_model_response_pdf_summary(file_name)
    return {"response": response}
    