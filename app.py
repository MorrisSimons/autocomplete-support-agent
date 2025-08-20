import streamlit as st
import json

# Page configuration
st.set_page_config(
    page_title="Lysa Support Agent Tool",
    page_icon="💬",
    layout="wide"
)

# Title
st.title("💬 Lysa Support Agent Tool")
st.markdown("Smart answer suggestions for customer support agents")

# Create two columns
col1, col2 = st.columns([1, 2])

with col1:
    st.subheader("📋 Customer Questions")
    
    # Question selector dropdown with title and description, 80% Swedish, 20% English
    question_options = [
        {
            "title": "Vad är avgifterna för Lysa?",
            "body": "Hej,\n\nJag undrar vilka avgifter som gäller för att öppna och ha ett ISK-konto hos Lysa. Kan ni ge mig en översikt över kostnaderna?\n\nTack på förhand!"
        },
        {
            "title": "Hur öppnar jag ett konto?",
            "body": "Hej,\n\nJag vill gärna börja spara hos Lysa. Kan ni beskriva steg-för-steg hur jag öppnar ett konto?\n\nMed vänlig hälsning,"
        },
        {
            "title": "Vad är minsta möjliga investeringsbelopp?",
            "body": "Hej,\n\nJag är intresserad av att börja investera hos er. Vad är det minsta beloppet jag kan sätta in för att starta?\n\nTack!"
        },
        {
            "title": "Hur tar jag ut pengar?",
            "body": "Hej,\n\nJag vill veta hur jag går tillväga för att ta ut pengar från mitt Lysa-konto. Kan ni förklara processen?\n\nTack på förhand!"
        },
        {
            "title": "Vilka investeringsstrategier erbjuder ni?",
            "body": "Hej,\n\nJag är nyfiken på vilka investeringsstrategier ni erbjuder. Kan ni ge en översikt över alternativen?\n\nTack!"
        },
        {
            "title": "Hur ändrar jag mitt månadssparande?",
            "body": "Hej,\n\nJag vill ändra beloppet på mitt månadssparande. Hur gör jag det hos Lysa?\n\nMed vänlig hälsning,"
        },
        {
            "title": "Vad händer om jag flyttar utomlands?",
            "body": "Hej,\n\nJag planerar att flytta utomlands. Hur påverkar det mitt konto och mitt sparande hos Lysa?\n\nTack för hjälpen!"
        },
        {
            "title": "Hur lägger jag till ett uttagskonto?",
            "body": "Hej,\n\nJag vill lägga till ett nytt bankkonto för uttag. Hur gör jag det hos er?\n\nTack!"
        },
        # 20% English questions
        {
            "title": "What is the tax treatment for ISK?",
            "body": "Hello,\n\nCould you please explain how ISK accounts are taxed? I would like to understand the tax implications.\n\nThank you!"
        },
        {
            "title": "How do I contact customer support?",
            "body": "Hello,\n\nI need assistance and would like to contact your customer support. What are the available ways to reach your team?\n\nBest regards,"
        }
    ]
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
    st.subheader("✍️ Agent Response")
    
    # Agent input box with autocomplete
    agent_response = st.text_area(
        "Type your response here (autocomplete suggestions will appear below):",
        height=200,
        placeholder="Start typing your response to the customer...",
        key="agent_input"
    )
    
    # Placeholder for autocomplete suggestions
    st.markdown("---")
    st.markdown("**💡 Autocomplete Suggestions:**")
    
    # This is where we'll add the autocomplete logic later
    if agent_response:
        st.info("🔍 Searching knowledge base for suggestions...")
        st.write("(Autocomplete suggestions will appear here)")
    else:
        st.write("Start typing to see autocomplete suggestions")

# Footer
st.markdown("---")
st.markdown("*Built for Lysa Customer Support Team*")
