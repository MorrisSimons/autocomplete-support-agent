import {
  StreamlitComponentBase,
  withStreamlitConnection,
  Streamlit,
} from "streamlit-component-lib"
import React, { ReactNode } from "react"

interface State {
  text: string
  suggestion: string
  isFocused: boolean
  textAreaIsFocused: boolean
  requestsThisMinute: number
  currentMinute: number
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  inputCost: number
  outputCost: number
  totalCost: number
  debounceTimer: number | null
}

class Copilot extends StreamlitComponentBase<State> {

  private userTextarea: HTMLTextAreaElement | null = null;
  private suggestionTextarea: HTMLTextAreaElement | null = null;
  public state = {
    "text": "",
    "suggestion": "",
    "isFocused": false,
    'textAreaIsFocused': false,
    requestsThisMinute: 0,
    currentMinute: Math.floor(Date.now() / 60000),
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    inputCost: 0,
    outputCost: 0,
    totalCost: 0,
    debounceTimer: null,
  }

  public render = (): ReactNode => {
    const { theme } = this.props
    if (!theme) {
      return <div>Theme is undefined, please check streamlit version.</div>
    }
    const height_int = this.props.args["height"]
    const font_fam = theme.font;

    const f_height = height_int + 'px';

    const f_focused = '1px solid ' + theme.primaryColor;
    const f_not_focused = '1px solid ' + theme.secondaryBackgroundColor;

    return (
        <div>
          {/* Request Counter Display */}
          <div style={{
            fontSize: '1em',
            color: theme.textColor,
            marginBottom: '0.5em',
            padding: '0.5em',
            backgroundColor: theme.backgroundColor,
            borderRadius: '0.3em',
            border: '1px solid ' + theme.secondaryBackgroundColor,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
               <strong>API Stats:</strong> Total: {this.state.totalRequests} | 
              ✅ Success: {this.state.successfulRequests} | 
              ❌ Failed: {this.state.failedRequests} | 
              {/* Shows how many API requests have been made in the current minute, out of the allowed requests per minute (RPM) limit */}
              Requests this per minute / limit: {this.state.requestsThisMinute} / {this.props.args["rpm_limit"]} 
              <br />
              <strong>Cost:</strong> Input: ${this.state.inputCost.toFixed(6)} | Output: ${this.state.outputCost.toFixed(6)} | Total: ${this.state.totalCost.toFixed(6)}
              
              
            </div>
            <button
              onClick={this.resetCounters}
              style={{
                fontSize: '0.7em',
                padding: '0.2em 0.5em',
                backgroundColor: theme.primaryColor,
                color: 'white',
                border: 'none',
                borderRadius: '0.3em',
                cursor: 'pointer'
              }}
              title="Reset counters"
            >
              🔄 Reset
            </button>
          </div>
          
          <div
            tabIndex={0}
            style={
              {
                height:f_height,
                width:'auto',
                border:this.state.isFocused ? f_focused: f_not_focused,
                borderRadius:'0.5em',
                overflowY:'scroll',
                overflowX:'hidden',
                position: 'relative',
                backgroundColor: theme.secondaryBackgroundColor
              }
            }
            onFocus={this._onFocus}
            onBlur={this._onBlur}
          >
            <textarea
              style={
                {
                  marginLeft:'0.5em',
                  fontFamily:font_fam,
                  marginTop:'0.2em',
                  whiteSpace: 'pre-wrap',
                  width:  'calc(100% - 1.2em)',
                  height: '100%',
                  border: 'none',
                  outline: 'none',
                  position: 'absolute',
                  backgroundColor: 'transparent',
                  color: theme.base === 'light' ? 'rgba(41,51,62,0.5)' : 'rgba(255,255,255,0.5)',
                  padding: '0'
                }
              }
              value={this.state.suggestion}
              readOnly
              ref={(textarea) => { this.suggestionTextarea = textarea; }}
            />
            <textarea
              style={
              {
                marginLeft:'0.5em',
                fontFamily:font_fam,
                marginTop:'0.2em',
                whiteSpace: 'pre-wrap',
                width:  'calc(100% - 1.2em)',
                height: '100%',
                border: 'none',
                outline: 'none',
                position: 'absolute',
                backgroundColor: 'transparent',
                color:theme.textColor,
                padding: '0'
              }
            }
              value={this.state.text}
              onChange={this.onChange}
              onKeyDown={this.onKeyDown}
              onBlur={this._onTextAreaBlur}
              onScroll={this.onScroll}
              ref={(textarea) => { this.userTextarea = textarea; }}
            />
          </div>
        </div>
    )
  }

  public componentDidUpdate(): void {
  if (this.userTextarea && this.suggestionTextarea) {
    this.suggestionTextarea.scrollTop = this.userTextarea.scrollTop;
  }
}

  private onScroll = (): void => {
    this.forceUpdate();
  }
  private onChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const text = event.target.value
    this.setState({ text, suggestion: "" })
    
    // Clear any existing timer
    if (this.state.debounceTimer !== null) {
      window.clearTimeout(this.state.debounceTimer!)
    }
    
    // Set a new debounced timer (500ms delay)
    const timer = window.setTimeout(() => {
      if (text.trim() !== "") {
        const api_upl = this.props.args["api_url"]
        this.callApi(text, api_upl).then(suggestion => {
          if (this.state.text.trim() !== "") {
            this.setState({ suggestion: this.state.text + suggestion })
          }
        })
      }
    }, 500) // Wait 500ms after user stops typing
    
    this.setState({ debounceTimer: timer })
  }


  private onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
  if (event.key === 'Tab') {
    event.preventDefault()
    this.setState(prevState => ({
      text: prevState.suggestion,
      suggestion: ''
    }), () => {
      // Create a synthetic event and call onChange manually
      const syntheticEvent = {
        target: { value: this.state.text }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      this.onChange(syntheticEvent);
    })
  }
}

  private _onTextAreaBlur = (): void => {
    this.setState({ textAreaIsFocused: false }, () => {
      Streamlit.setComponentValue(this.state.text);
      this.setState({ suggestion: '' });
    });
  }

  private _onFocus = (): void => {
    this.setState({ isFocused: true })
  }

  private _onBlur = (): void => {
    this.setState({ isFocused: false })
  }

  private resetCounters = (): void => {
    this.setState({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      requestsThisMinute: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0
    });
  }

  // Cleanup timer when component unmounts
  componentWillUnmount(): void {
    if (this.state.debounceTimer !== null) {
      window.clearTimeout(this.state.debounceTimer!)
    }
  }

  private abortController = new AbortController();

  // Add tool call execution method
  private executeToolCalls = async (toolCalls: any[]): Promise<string[]> => {
    const results: string[] = [];
    
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function?.name;
      const args = JSON.parse(toolCall.function?.arguments || '{}');
      
      console.log(`Executing tool: ${functionName} with args:`, args);
      
      if (functionName === 'search_knowledge_base') {
        // Execute the real Pinecone search tool with enhanced source info
        const toolResult = await this.executeTool(functionName, args);
        
        // Add source context to the result
        const searchQuery = args.query || 'unknown query';
        const enhancedResult = `Search Query: "${searchQuery}"\n\n${toolResult}\n\nSource: Information retrieved from Lysa's knowledge base via Pinecone vector search.`;
        
        results.push(enhancedResult);
      } else {
        results.push(`Unknown tool: ${functionName}`);
      }
    }
    
    return results;
  }

  // Real Pinecone search tool results
  private executeTool = async (toolName: string, args: any): Promise<string> => {
    if (toolName === 'search_knowledge_base') {
      // Extract query string safely
      let query = '';
      if (typeof args.query === 'string') {
        query = args.query;
      } else if (args.query && typeof args.query === 'object') {
        // If query is an object, try to get the value
        query = args.query.toString() || '';
      } else {
        query = String(args.query || '');
      }
      
      console.log(`Processing query: "${query}"`);
      
      // Use real Pinecone search if credentials are available
      const pineconeApiKey = this.props.args["pinecone_api_key"];
      const pineconeIndexName = this.props.args["pinecone_index_name"];
      const openaiApiKey = this.props.args["openai_api_key"];
      
      if (pineconeApiKey && pineconeIndexName && openaiApiKey) {
        try {
          // Generate embedding using OpenAI REST API
          const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: this.props.args["embedding_model"] || "text-embedding-ada-002",
              input: query
            })
          });
          
          if (!embeddingResponse.ok) {
            throw new Error(`OpenAI API error: ${embeddingResponse.status}`);
          }
          
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data[0].embedding;
          
          // Search Pinecone using REST API
          const pineconeEnvironment = this.props.args["pinecone_environment"];
          const pineconeHost = this.props.args["pinecone_host"] || "https://api.pinecone.io";
          
          // Construct the correct Pinecone query endpoint
          let indexUrl;
          if (pineconeHost.includes('svc.') && pineconeHost.includes('.pinecone.io')) {
            // If pinecone_host already contains the full index URL, use it directly
            indexUrl = `https://${pineconeHost}/query`;
          } else {
            // Otherwise, construct the standard Pinecone API URL
            indexUrl = `${pineconeHost}/indexes/${pineconeIndexName}/query`;
          }
          
          console.log(`Pinecone query URL: ${indexUrl}`);
          
          const searchResponse = await fetch(indexUrl, {
            method: 'POST',
            headers: {
              'Api-Key': pineconeApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              vector: queryEmbedding,
              topK: this.props.args["search_top"] || 3,
              includeMetadata: true
            })
          });
          
          if (!searchResponse.ok) {
            throw new Error(`Pinecone API error: ${searchResponse.status}`);
          }
          
          const searchData = await searchResponse.json();
          
          if (searchData.matches && searchData.matches.length > 0) {
            const results = searchData.matches
              .map((match: any) => ({
                title: match.metadata?.title || 'No title',
                source: match.metadata?.source || 'No source',
                text: match.metadata?.text || match.metadata?.content || 'No content'
              }))
              .filter((result: any) => result.text !== 'No content');
            
            if (results.length > 0) {
              console.log("Found results:", results);
              return JSON.stringify({
                count: results.length,
                results: results
              }, null, 2);
            }
            
          }
          
          // No results found
          return "";
        } catch (error) {
          console.error("Pinecone search error:", error);
          return "";
        }
      }
      
      // No credentials available
      return "";
    }
    
    return "";
  }

  // Add follow-up call method for tool results
  private makeFollowUpCall = async (apiUrl: string, userInput: string, toolResults: string[]): Promise<string> => {
    const followUpPrompt = `You are an AUTOCOMPLETE assistant for Lysa customer support. Continue the user's message naturally without any formatting or extra text.\n\nUser's partial message: "${userInput}"\n\nSearch Results from Lysa's knowledge base:\n${toolResults.join('\n\n')}\n\nRULES:\n- Continue exactly from where the user stopped\n- NO ellipses (...) at the beginning\n- NO extra text like "(I'll wait...)" or similar\n- NO quotes or formatting\n- Just continue the sentence naturally using the search results\n\nContinue from "${userInput}":`;
    
    const {prompt_template, api_key, height, fontFamily, border, text: questionText, question_title, ...model_kwargs} = this.props.args;
    const prompt = prompt_template
      .replace("{text}", questionText || "")
      .replace("{question_title}", question_title || "");
    
    const isChatApi = (
      this.props.args["api_format"] === "chat" ||
      apiUrl.includes('/chat/completions')
    );
    
    // Create a new abort controller for the follow-up call to avoid conflicts
    const followUpAbortController = new AbortController();

    let payload;
    if (isChatApi) {
      const validParams: any = {};
      if (model_kwargs.model) validParams.model = model_kwargs.model;
      if (model_kwargs.max_tokens) validParams.max_tokens = model_kwargs.max_tokens;
      if (model_kwargs.temperature) validParams.temperature = model_kwargs.temperature;
      if (model_kwargs.top_p) validParams.top_p = model_kwargs.top_p;
      if (model_kwargs.stop) validParams.stop = model_kwargs.stop;

      payload = {
        messages: [
          {
            role: "user",
            content: followUpPrompt
          }
        ],
        ...validParams,
        stream: false
      };
    } else {
      payload = {
        prompt: followUpPrompt,
        ...model_kwargs,
        echo: false
      };
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (api_key) {
      headers['Authorization'] = `Bearer ${api_key}`;
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
        signal: followUpAbortController.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseJson = await response.json();
      
      let fullResponse = "";
      if (isChatApi && responseJson.choices && responseJson.choices[0] && responseJson.choices[0].message) {
        fullResponse = responseJson.choices[0].message.content;
      } else if (responseJson.choices && responseJson.choices[0] && responseJson.choices[0].text) {
        fullResponse = responseJson.choices[0].text;
      } else {
        console.error("Unexpected response format:", responseJson);
        return "";
      }
      
      // Extract answer from response
      let extractedAnswer = "";
      const answerTagIndex = fullResponse.indexOf("<answer>");
      if (answerTagIndex !== -1) {
        extractedAnswer = fullResponse.substring(answerTagIndex + 8);
        const endTagIndex = extractedAnswer.indexOf("</answer>");
        if (endTagIndex !== -1) {
          extractedAnswer = extractedAnswer.substring(0, endTagIndex);
        }
      } else {
        extractedAnswer = fullResponse;
      }
      
      return extractedAnswer;
    } catch (error) {
      console.error("Follow-up call error:", error);
      return "";
    }
  }

private callApi = async (text: string, api_upl: string): Promise<string> => {
  // Abort the previous request
  this.abortController.abort();
  this.abortController = new AbortController();

  if (text.trim() === "") {
    return "";
  }

  const currentMinute = Math.floor(Date.now() / 60000);
  if (currentMinute > this.state.currentMinute) {
    this.setState({
      currentMinute: currentMinute,
      requestsThisMinute: 0
    });
  } else if (this.state.requestsThisMinute > this.props.args["rpm_limit"]) {
    // Retry after 1 second if limit is exceeded
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.callApi(text, api_upl));
      }, 1000);
    });
  }

  const {prompt_template, api_url, api_key, height, fontFamily, border, text: questionText, question_title, ...model_kwargs} = this.props.args;
  const prompt = prompt_template
    .replace("{text}", text) // Use the actual user input for autocomplete
    .replace("{question_title}", question_title || ""); // format the prompt with both placeholders
  
  // Generalize to support both chat and legacy completions APIs, not just Groq
  // Determine if the API expects chat format (messages) or legacy format (prompt)
  // Use a prop or model_kwargs to allow user to specify the format, fallback to auto-detect
  const isChatApi = (
    this.props.args["api_format"] === "chat" ||
    api_upl.includes('/chat/completions')
  );

  // Definiera verktyg för API-anropet
  const tools = [
    {
      type: "function",
      function: {
        name: "search_knowledge_base",
        description: "Sök i Lysas kunskapsbas efter information för kundsupport",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Sökfråga för att hitta relevant information"
            }
          },
          required: ["query"]
        }
      }
    }
  ];

  let payload;
  if (isChatApi) {
    // Use chat completions format for any compatible API
    const validParams: any = {};
    if (model_kwargs.model) validParams.model = model_kwargs.model;
    if (model_kwargs.max_tokens) validParams.max_tokens = model_kwargs.max_tokens;
    if (model_kwargs.temperature) validParams.temperature = model_kwargs.temperature;
    if (model_kwargs.top_p) validParams.top_p = model_kwargs.top_p;
    if (model_kwargs.stop) validParams.stop = model_kwargs.stop;

    payload = {
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      ...validParams,
      tools: tools,
      tool_choice: "auto",
      stream: false
    };
  } else {
    // Use legacy completions format for other APIs
    payload = {
      prompt: prompt,
      ...model_kwargs,
      echo: false
    };
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  
  // Add API key if provided
  if (api_key) {
    headers['Authorization'] = `Bearer ${api_key}`;
  }

  try {
    // Increment total requests counter
    this.setState(prevState => ({
      totalRequests: prevState.totalRequests + 1
    }));
    
    const response = await fetch(api_upl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      
      // Increment failed requests counter
      this.setState(prevState => ({
        failedRequests: prevState.failedRequests + 1
      }));
      
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    this.setState(prevState => ({
      requestsThisMinute: prevState.requestsThisMinute + 1,
      successfulRequests: prevState.successfulRequests + 1
    }));

    const responseJson = await response.json();
    
    // Calculate costs based on token usage
    const inputTokens = responseJson.usage?.prompt_tokens || 0;
    const outputTokens = responseJson.usage?.completion_tokens || 0;
    
    const inputPrice = this.props.args["token_cost"] || 0.05;
    const outputPrice = this.props.args["output_token_cost"] || 0.10;
    
    // If no usage info, estimate based on text length (rough approximation)
    const estimatedInputTokens = inputTokens || Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = outputTokens || 0;
    
    const newInputCost = (estimatedInputTokens / 1_000_000) * inputPrice;
    const newOutputCost = (estimatedOutputTokens / 1_000_000) * outputPrice;
    
    this.setState(prevState => ({
      inputCost: prevState.inputCost + newInputCost,
      outputCost: prevState.outputCost + newOutputCost,
      totalCost: prevState.totalCost + newInputCost + newOutputCost
    }));
    
    // Handle both chat completions and legacy completions formats
    let fullResponse = "";
    let message = null;
    
    if (isChatApi && responseJson.choices && responseJson.choices[0] && responseJson.choices[0].message) {
      message = responseJson.choices[0].message;
      fullResponse = message.content || "";
    } else if (responseJson.choices && responseJson.choices[0] && responseJson.choices[0].text) {
      fullResponse = responseJson.choices[0].text;
    } else {
      console.error("Unexpected response format:", responseJson);
      return "";
    }
    
    // Log the full response to console (this will show the thinking process)
    console.log("Full AI Response:", fullResponse);
    
    // Check if there are tool calls
    if (isChatApi && message && message.tool_calls && message.tool_calls.length > 0) {
      console.log("Tool calls detected:", message.tool_calls);
      
      // Execute the tool calls
      const toolResults = await this.executeToolCalls(message.tool_calls);
      console.log("Tool execution results:", toolResults);
      
      // Make a follow-up call with the tool results
      const finalResponse = await this.makeFollowUpCall(api_upl, text, toolResults);
      
      // Extract answer from the follow-up response
      let extractedAnswer = "";
      const answerTagIndex = finalResponse.indexOf("<answer>");
      if (answerTagIndex !== -1) {
        extractedAnswer = finalResponse.substring(answerTagIndex + 8);
        const endTagIndex = extractedAnswer.indexOf("</answer>");
        if (endTagIndex !== -1) {
          extractedAnswer = extractedAnswer.substring(0, endTagIndex);
        }
      } else {
        // If no <answer> tags, try to find content after <think> tags or return clean response
        const thinkTagIndex = finalResponse.indexOf("<think>");
        if (thinkTagIndex !== -1) {
          const endThinkIndex = finalResponse.indexOf("</think>");
          if (endThinkIndex !== -1) {
            // Extract content after </think> tag
            extractedAnswer = finalResponse.substring(endThinkIndex + 8).trim();
          } else {
            // No closing </think> tag, take everything after <think>
            extractedAnswer = finalResponse.substring(thinkTagIndex + 7).trim();
          }
        } else {
          // No tags found, return the full response
          extractedAnswer = finalResponse;
        }
      }
      
      // Clean up the extracted answer
      extractedAnswer = extractedAnswer.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      
      console.log("Extracted Answer from follow-up:", extractedAnswer);
      return extractedAnswer;
    }
    
    // Extract only the content after <answer> tag
    let extractedAnswer = "";
    const answerTagIndex = fullResponse.indexOf("<answer>");
    if (answerTagIndex !== -1) {
      extractedAnswer = fullResponse.substring(answerTagIndex + 8); // 8 is the length of "<answer>"
      // Remove any trailing tags or extra content
      const endTagIndex = extractedAnswer.indexOf("</answer>");
      if (endTagIndex !== -1) {
        extractedAnswer = extractedAnswer.substring(0, endTagIndex);
      }
    } else {
      // If no <answer> tag found, return the full response
      extractedAnswer = fullResponse;
    }
    
    // Log the extracted answer for debugging
    console.log("Extracted Answer:", extractedAnswer);
    
    return extractedAnswer;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return "";  // Return empty string if request was aborted
    }
    console.error("Error decoding response", error);
    return "";
  }
}
}

export default withStreamlitConnection(Copilot)
