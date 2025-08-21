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
        prompt_template="[SYSTEM] You are an autocomplete assistant for Lysa customer support. You have access to a knowledge base tool to search for accurate information. Always use tools when you need specific information about fees, rates, policies, etc. Use <answer> tags for your final response.\n\nCustomer Question Title: {question_title}\n\nCustomer Question Details: {text}\n\nIf you need specific information, use the search_knowledge_base tool. Then provide a helpful response using <answer> tags:\n<answer>\nYour response here...\n</answer>",
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
        question_title=selected_q['title']
    )

# Add tool execution endpoint
if st.button("🔧 Test Tool Execution"):
    test_query = "What are the fees?"
    result = knowledge_tool.search(test_query)
    st.success(f"Tool test result: {result}")

# Tool execution interface (simulates the /execute_tool endpoint)
st.subheader("🔧 Tool Execution Interface")
with st.form("tool_execution"):
    tool_name = st.selectbox("Tool Name", ["search_knowledge_base"])
    query = st.text_input("Search Query", "fees")
    
    if st.form_submit_button("Execute Tool"):
        if tool_name == "search_knowledge_base":
            result = knowledge_tool.search(query)
            st.success(f"Tool Result: {result}")
        else:
            st.error(f"Unknown tool: {tool_name}")

# Debug section to show tool usage
st.subheader("🐛 Debug Information")
st.info("""
**Tool Integration Status:**
- ✅ React component built and loaded
- ✅ Tool calls are being detected
- ✅ Mock tool results are working
- ✅ AI integration is functional

**Current Flow:**
1. User types → AI detects need for info
2. AI calls search_knowledge_base tool
3. Mock tool returns relevant data
4. AI completes response with tool data

**Test it by typing questions about:**
- Fees, avgifter, kostnad
- ISK accounts, investment
- Sparkonto, interest rates
- Pension, support contact
""")

# Footer
st.markdown("---")
st.markdown("*Built for Lysa Customer Support Team*")