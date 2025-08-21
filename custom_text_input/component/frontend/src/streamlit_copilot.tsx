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
    failedRequests: 0
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
            fontSize: '0.8em',
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
  const api_upl = this.props.args["api_url"]
  this.setState({ text, suggestion: "" }, () => {
    if (text.trim() !== "") {
      this.callApi(text, api_upl).then(suggestion => {
         if (this.state.text.trim() !== "") {
          this.setState({ suggestion: this.state.text + suggestion })
        }
      })
    }
  })
}


  private onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
  if (event.key === 'Enter') {
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
      requestsThisMinute: 0
    });
  }

  private abortController = new AbortController();

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

  const {prompt_template, api_url, api_key, height, fontFamily, border, ...model_kwargs} = this.props.args;
  const prompt = prompt_template.replace("{text}", text); // format the prompt
  
  // Generalize to support both chat and legacy completions APIs, not just Groq
  // Determine if the API expects chat format (messages) or legacy format (prompt)
  // Use a prop or model_kwargs to allow user to specify the format, fallback to auto-detect
  const isChatApi = (
    this.props.args["api_format"] === "chat" ||
    api_upl.includes('/chat/completions')
  );

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
    
    // Handle both chat completions and legacy completions formats
    if (isChatApi && responseJson.choices && responseJson.choices[0] && responseJson.choices[0].message) {
      return responseJson.choices[0].message.content;
    } else if (responseJson.choices && responseJson.choices[0] && responseJson.choices[0].text) {
      return responseJson.choices[0].text;
    } else {
      console.error("Unexpected response format:", responseJson);
      return "";
    }
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
