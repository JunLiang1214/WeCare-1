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
import warnings
warnings.filterwarnings("ignore")

openai_api_key = os.environ.get("OPENAI_API_KEY")
pinecone_api_key = os.environ.get("PINECONE_API_KEY")

class LLM_Chatbot:
    def __init__(self, openai_api_key = openai_api_key, pinecone_api_key = pinecone_api_key, model = 'gpt-3.5-turbo-1106', temperature = 0.5):
        #setting up pinecone
        
        self.pinecone_environment = 'gcp-starter'
        self.pinecone_index_name = 'test'
        self.pinecone_namespace = 'healthhub'
        
        self.pc = Pinecone(api_key = pinecone_api_key, environment = self.pinecone_environment)
        self.spec = spec = PodSpec(environment=self.pinecone_environment)
        
        self.medical_report = ''

        #make sure index exists and is set up
        if self.pinecone_index_name in self.pc.list_indexes().names():
            self.index = self.pc.Index(self.pinecone_index_name)
        else:
            raise Exception('Pinecone Index not set up or running')
        
        #setting up embedding model
        self.embed = OpenAIEmbeddings(
            model='text-embedding-ada-002',
            openai_api_key=openai_api_key
        )
        
        #setting up llm model
        self.llm = ChatOpenAI(openai_api_key = openai_api_key, model = model, temperature = temperature)
        
        #setting up chained llm model that has memory of chat history
        self.conversation = ConversationChain(
            llm = self.llm,
            verbose=False,
            memory = ConversationBufferWindowMemory(k=5) #only looks back at the past 5 messages
        )
        
    #function that retrieves the top k most similar contexts to a query from pinecone vector DB
    #returns a list of strings
    def retrieval_pinecone(self, query, k=3):
        embed_query = self.embed.embed_query(query)
        res = self.index.query(vector=embed_query, top_k=k, namespace=self.pinecone_namespace, include_metadata=True)
        contexts = [item['metadata']['text'] for item in res['matches']]
        return contexts
    
    #function that sends a prompt to openai to generate a response
    #returns the response from openai as a string
    def get_model_response(self, user_input):
        #the actual prompt by human
        human_message = HumanMessage(
            content = user_input,
            metadata = {
                'type': 'normal'
            }
        )
        
        contexts = self.retrieval_pinecone(human_message.content) #retrieves top 3 most similar contexts from pinecone
        
        #this is the context given to the chatbot when sending a prompt -> if user already uploaded a medical report, then include it in the context
        if self.medical_report:
            system_message = SystemMessage(
                content = 'Here is context relevant to your question: \n' + '\n'.join(contexts) + '\n\n' +
                "Here is further context based on a medical report uploaded by the user: \n" + self.medical_report + '\n\n' +
                "You are a friendly chatbot that breaks down complex medical terms into simple language. Talk with compassion and empathy. \n\n"
            )
        else:
            system_message = SystemMessage(
                    content = 'Here is context relevant to your question: \n' + '\n'.join(contexts) + '\n\n' +
                    "You are a friendly chatbot that breaks down complex medical terms into simple language. Talk with compassion and empathy. \n\n"
                )
        
        prompt = [system_message, human_message] #final prompt is a combination of the context and the user input
        response = self.conversation.predict(input=prompt)
        time.sleep(0.5)
        
        return response
    
    #function that gets the chat history and returns it as a list of strings
    def get_chat_history(self):
        full_chat_history = []
        for msg in self.conversation.memory.chat_memory.messages:
            if msg.type == 'human':
                if msg.content[1]["metadata"]["type"] == "summary":
                    full_chat_history.append(f'Human: Uploaded Medical Report')
                else:
                    full_chat_history.append(f'Human: {msg.content[1]["content"]}')
                full_chat_history.append('----------------------------------------------------------------------------------------------')
            else:
                full_chat_history.append(f'AI: {msg.content}')
                full_chat_history.append('----------------------------------------------------------------------------------------------')
        
        return full_chat_history
    
    #function that generates a pdf of the chat history
    #returns file path of pdf for FastAPI to serve
    def save_chat_history(self):
        chat_history = self.get_chat_history()
        file_name = f'chat_history.pdf'
        
        new_pdf = FPDF()
        new_pdf.add_page()
        new_pdf.set_font("Arial", size=20)
        new_pdf.cell(200, 10, txt="Chat History", ln=1, align="C")
        new_pdf.set_font("Arial", size=15)
        
        for item in chat_history:
            item = re.sub(r'[^\x00-\x7F]', ' ', item).strip() #remove non-ascii characters
            item = re.sub(r'\n\s*\n', '\n\n', item) #remove extra newlines
            new_pdf.multi_cell(200, 10, txt=item, align="L")
        
        new_pdf.output(name = file_name, dest='F')
        
        return file_name
    
    #function that takes in a pdf file and returns its content as a string
    def extract_pdf(self, input_pdf):
        pdf = PdfReader(input_pdf)
        text = ''
        for page in pdf.pages:
            text += page.extract_text() + '\n'
        return text

    #function that sends a prompt to openai to summarize the uploaded pdf
    #returns the response from openai as a string
    def get_model_response_pdf_summary(self, input_pdf):
        pdf_text = self.extract_pdf(input_pdf)
        human_message = HumanMessage(
            content = pdf_text,
            metadata = {
                'type': 'summary'
            }
        )

        contexts = self.retrieval_pinecone(human_message.content)

        system_message = SystemMessage(
            content = 'Here is context relevant to your question: \n' + '\n'.join(contexts) + '\n\n' +
            'Imagine you are talking to an elderly person. Give a summary of the medical report that is easy to understand. After the summary, provide a glossary where you give a simplified definition of each difficult or medical term used in the given medical report. \n\n'
        )
        
        entire_message = [system_message, human_message]
        response = self.conversation.predict(input=entire_message)
        time.sleep(0.5)
        
        self.medical_report = response
        
        return response