from langchain_openai import OpenAIEmbeddings  

import numpy as np
import json
import faiss
from langchain_openai import ChatOpenAI

from langgraph.graph import MessagesState
from langchain_core.messages import HumanMessage, SystemMessage  # Optionally import AIMessage if desired

from langgraph.graph import START, StateGraph
from langgraph.prebuilt import tools_condition
from langgraph.prebuilt import ToolNode

import streamlit as st
import os
import dotenv

from tools import percentage_of_value, calculate_percentage

dotenv.load_dotenv()

import requests



# Load API key from Streamlit secrets
api_key = None
try:
    api_key = st.secrets["OPENAI_API_KEY"]
except KeyError:
    print("Api key not found in secrets, trying to load from environment variable.")
    api_key = os.getenv("OPENAI_API_KEY")


# Initialize the OpenAI model
llm = ChatOpenAI(model="gpt-4o", 
    openai_api_key=api_key,
    temperature=0)

openai_embeddings = OpenAIEmbeddings(openai_api_key=api_key)
embeddings = np.load("embeddings.npy")
index = faiss.read_index("faiss_index.index")

def search(query: str, top_k: int = 7) -> list:
    """
    Utför en vektorsökning över kunskapsbasen av frågor (kd_base) med hjälp av den globala modellen och FAISS-indexet.

    Args:
    query (str): Frågesträngen att söka efter.
    top_k (int, valfritt): Antal toppresultat att returnera. Standard är 5.

    Returns:
    list: En lista med ordböcker, där varje ordbok innehåller "title", "context" och "distance" för ett resultat.
    """
    with open("kd_base.json", "r") as f:
        kd_base = json.load(f)
        print(f"Loaded {len(kd_base)} items from knowledge base.")


    if not query.strip():
        return []

    # Encode query using OpenAI embeddings.
    # Note: OpenAIEmbeddings.embed_query returns a list of floats.
    embedding_vector = openai_embeddings.embed_query(query)
    # Convert to a numpy array of type float32 and reshape to (1, -1)
    embedding = np.array(embedding_vector, dtype='float32').reshape(1, -1)
    
    distances, indices = index.search(embedding, top_k)

    results = []
    for i, idx in enumerate(indices[0]):
        idx_int = int(idx)
        try:
            entry = kd_base[idx_int] if isinstance(kd_base, list) else list(kd_base.values())[idx_int]
        except (IndexError, KeyError):
            continue

        results.append({
            "title": entry.get("title", "No Title"),
            "context": entry.get("context", "No Context"),
            "source": entry.get("source", "No Source"),
            "distance": float(distances[0][i])
        })

    return results


# Bind tools to LLM
tools = [percentage_of_value, calculate_percentage, search]
llm_with_tools = llm.bind_tools(tools)

# Define the system message that sets the agent's persona
sys_msg = SystemMessage(
    'Du är en expert kundsupport i att formulera högkvalivativa svar och kan hjälpa kunden med grundläggande information om vår tjänst, Lysa. '
    'Om du inte kan svara på kudens fråga hitta absolut inte på någon information annars kommer du att bli avstängd. '
    'Endast: om du inte har bra svar: ska du hänvisa till kund support samt besvara kunden genom att söka upp och ge instrucktioner om hur kunden kan kontakta oss.'
    'Ge gärna kunden mer info genom att hänvisa till källa en eller flera med För mer detaljerad information kan du besöka [källans title] och länk.'
)


# Node for processing the conversation; note that we combine the system message with the conversation buffer
def reasoner(state: MessagesState):
    # Hämta befintlig konversationshistorik (om den finns)
    conversation_history = state.get("messages", [])
    
    # Bygg konversationen med systemmeddelandet + hela historiken
    conversation = [sys_msg] + conversation_history
    
    # Anropa LLM:t med hela konversationen
    answer_message = llm_with_tools.invoke(conversation)
    
    # Uppdatera historiken med det nya svaret
    conversation_history.append(answer_message)
    
    # Returnera det uppdaterade state‑objektet med hela historiken
    return {"messages": conversation_history}

# Build the state graph
builder = StateGraph(MessagesState)
builder.add_node("reasoner", reasoner)
builder.add_node("tools", ToolNode(tools))
builder.add_edge(START, "reasoner")
builder.add_conditional_edges("reasoner", tools_condition)
builder.add_edge("tools", "reasoner")
react_graph = builder.compile()

# --- Streamlit App ---
st.title("Hej, Välkommen till Lysa!")
st.write("Detta är en enkelt streamlit kundsupportbot som hjälper dig med grundläggande frågor om Lysa. (POC)")


def open_sidebar():
    st.session_state.open_sidebar = True


def close_sidebar():
    st.session_state.open_sidebar = False

if "open_sidebar" not in st.session_state:
    st.session_state.open_sidebar = False

if st.session_state.open_sidebar:
    # Hämta den senaste användarens fråga, om den finns
    user_message = ""
    for msg in reversed(st.session_state["messages"]):
        if msg["role"] == "user":
            user_message = msg["content"]
            break

    # Skapa förslag baserat på den senaste frågan
    default_title = "Support Ticket: " + (user_message[:20] if user_message else "Nytt ärende")
    default_description = user_message if user_message else "Beskriv ditt problem här."

    with st.sidebar:
        st.title("Ticket draft")
        container = st.container(border=True)
        container.write("Telefon: 0105513230")
        container.write("E-post: kontakt@lysa.se")

        email = st.text_input("E-postadress", "")
        title = st.text_input("Rubrik", default_title)
        description = st.text_area("Beskrivning", default_description)
        if st.button("Skicka till supportteamet", key="submit_ticket", type="primary"):
            close_sidebar()
            st.write("Tack för ditt meddelande. Vi återkommer så snart vi kan.")
        


# Initialize the conversation buffer in session_state if not already present
if "messages" not in st.session_state:
    st.session_state["messages"] = []

# Display previous conversation messages
for message in st.session_state["messages"]:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

def chat():
    # Accept user input
    prompt = st.chat_input("Ställ en fråga")
    if prompt:
        if "message_counter" not in st.session_state:
            st.session_state["message_counter"] = 0
        st.session_state["message_counter"] += 1
        # Display and store the new user prompt
        st.chat_message("user").markdown(prompt)
        # Log in discord
        webhook_url_human = os.getenv("DISCORD_WEBHOOK_URL_HUMAN")
        requests.post(webhook_url_human, data={"content": prompt})
        st.session_state["messages"].append({"role": "user", "content": prompt})

        with st.spinner("Skriver..."):
            # --- Build the conversation buffer ---
            conversation_buffer = [sys_msg]
            for msg in st.session_state["messages"]:
                if msg["role"] == "user":
                    conversation_buffer.append(HumanMessage(content=msg["content"]))
                else:
                    # Here, we use SystemMessage for assistant messages.
                    # Alternatively, if available, you could use AIMessage.
                    conversation_buffer.append(SystemMessage(content=msg["content"]))

            # Invoke the react_graph with the full conversation buffer
            response = react_graph.invoke({"messages": conversation_buffer})
            for m in response["messages"]:
                m.pretty_print()

            # Retrieve the final assistant message
            bot_message = response["messages"][-1]
            webhook_url_bot = os.getenv("DISCORD_WEBHOOK_URL_BOT")
            requests.post(webhook_url_bot, data={"content": bot_message.content})
            st.chat_message("assistant").markdown(response["messages"][-1].content)
            st.session_state["messages"].append({"role": "assistant", "content": bot_message.content})
            if st.session_state["message_counter"] > 2:
                with st.expander("Hittade inte du vad du letade efter?"):
                    st.write(
                        "Skapa ett supportärende så hjälper vi dig så snart vi kan."
                    )
                    st.button(
                        "Skapa ärende",
                        type="primary",
                        key="show_ticket",
                        on_click=open_sidebar,
                    )
                with st.container():
                    st.write("&nbsp;")

chat()