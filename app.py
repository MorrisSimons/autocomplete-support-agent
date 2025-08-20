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

groq_client = Groq(api_key=groq_api_key)

# Page configuration
st.set_page_config(
    page_title="Lysa customer support Copilot – Smart Support Suggestions",
    layout="wide",
    page_icon="💬"
)

# Title
st.title("💬 Lysa Support Agent Tool")
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
    
    user_input = copilot(
        prompt_template="Help me respond to this customer question: {text}",
        api_url="https://api.groq.com/openai/v1/chat/completions",
        api_key=groq_api_key,
        rpm_limit=50,
        height=400,
        font_family="Arial",
        model="llama3-8b-8192",
        max_tokens=200,
        temperature=0.7,
        key="test_custom_component"
    )
    
    if user_input:
        st.success("AI Response Generated!")

    else:
        st.info("Type in the box above to generate an AI response.")
    
# Footer
st.markdown("---")
st.markdown("*Built for Lysa Customer Support Team*")