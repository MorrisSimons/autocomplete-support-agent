import streamlit as st
import json
import os
from groq import Groq
import dotenv
from custom_text_input.component import copilot

# Load environment variables
dotenv.load_dotenv()

# Initialize Groq client with API key from environment
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    st.error("❌ GROQ_API_KEY environment variable not found. Please set it in your .env file.")
    st.stop()

# Load Pinecone credentials
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_environment = os.getenv("PINECONE_ENVIRONMENT")
pinecone_index_name = os.getenv("PINECONE_INDEX_NAME")
pinecone_host = os.getenv("PINECONE_HOST")
openai_api_key = os.getenv("OPENAI_API_KEY")
embedding_model = os.getenv("EMBEDDING_MODEL", "text-embedding-ada-002")
search_top = int(os.getenv("SEARCHTOP", "3"))

if not pinecone_api_key:
    st.warning("⚠️ PINECONE_API_KEY not found. Pinecone search will use fallback keyword matching.")

if not openai_api_key:
    st.warning("⚠️ OPENAI_API_KEY not found. Pinecone search will use fallback keyword matching.")

groq_client = Groq(api_key=groq_api_key)

# Simple tool class for demonstration
class VectorSearchTool:
    def __init__(self):
        # For now, just return mock data
        # Later this can be connected to your actual vector database
        self.mock_knowledge_base = {
            "fees": "Lysa charges 0.4% annually for investment accounts",
            "sparkonto": "Sparkonto Auto offers 3.5% interest rate",
            "pension": "You can transfer your pension to Lysa with no fees",
            "security": "Lysa is under Finansinspektionen supervision"
        }
    
    def search(self, query: str) -> str:
        """Simple search function - replace with actual vector search later"""
        query_lower = query.lower()
        
        # Simple keyword matching for demo
        for key, value in self.mock_knowledge_base.items():
            if key in query_lower or any(word in query_lower for word in key.split()):
                return value
        
        return f"Searching for: {query}. No specific information found in knowledge base."

# Initialize the tool
knowledge_tool = VectorSearchTool()

# Page configuration
st.set_page_config(
    page_title="Customer support Copilot – Smart Support Suggestions",
    layout="wide",
    page_icon="💬"
)

# Title
st.title("💬 Support Agent Tool")
st.markdown("Smart answer suggestions for customer support agents")

# Create two columns
col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("📋 Customer Questions")
    
    # Load question options from external JSON file
    with open("questions.json", "r", encoding="utf-8") as f:
        question_options = json.load(f)
    questions = [f"{q['title']}" for q in question_options]
    
    selected_question = st.selectbox(
        "Select a customer question:",
        questions,
        index=0
    )
    
    # Display selected question
    selected_index = questions.index(selected_question)
    selected_q = question_options[selected_index]
        # Use custom CSS to set the text color of the text area to white

    
    # Use custom CSS to make the text in the text area white (Streamlit's st.text_area uses a div and span, not a textarea)
    st.markdown(
        """
        <style>
        /* Target the disabled text area label and content */
        div[data-testid="stTextArea"] textarea[disabled] {
            color: white !important;
            background-color: #262730 !important;
            /* For placeholder text */
            -webkit-text-fill-color: white !important;
        }
        div[data-testid="stTextArea"] label {
            color: white !important;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
    st.text_area(
        "Customer's full message:",
        value=selected_q['body'],
        height=300,
        disabled=True,
        key="customer_message"
    )


with col2:
    st.subheader("✍️ Custom Component Test")
    
    # Define price inputs outside column blocks for accessibility
    input_price = st.number_input("Input price per 1M tokens ($)", value=0.05, step=0.01)
    output_price = st.number_input("Output price per 1M tokens ($)", value=0.10, step=0.01)

    user_input = copilot(
        prompt_template="[SYSTEM] Du är en autokompletteringsassistent för Lysa kundsupport. Du har tillgång till ett kunskapsbas-verktyg för att söka efter korrekt information. Använd alltid verktyg när du behöver specifik information om avgifter, räntor, policys osv. Använd <answer>-taggar för ditt slutgiltiga svar.\n\nKundfrågans titel: {question_title}\n\nKundfrågans detaljer: {text}\n\nOm du behöver specifik information, använd verktyget search_knowledge_base. Ge sedan ett hjälpsamt svar inom <answer>-taggar:\n<answer>\nDitt svar här...\n</answer>",
        api_url="https://api.groq.com/openai/v1/chat/completions",
        api_key=groq_api_key,
        rpm_limit=50,
        height=400,
        font_family="Arial",
        model="deepseek-r1-distill-llama-70b",
        max_tokens=400,
        temperature=0.7,
        key="test_custom_component",
        token_cost=input_price,
        output_token_cost=output_price,
        text=selected_q['body'],
        question_title=selected_q['title'],
        # Pinecone integration parameters
        pinecone_api_key=pinecone_api_key,
        pinecone_environment=pinecone_environment,
        pinecone_index_name=pinecone_index_name,
        pinecone_host=pinecone_host,
        openai_api_key=openai_api_key,
        embedding_model=embedding_model,
        search_top=search_top
    )

st.markdown("---")
st.markdown("*Built for Lysa Customer Support Team*")