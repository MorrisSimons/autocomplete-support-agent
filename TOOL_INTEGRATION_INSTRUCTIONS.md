# Simple Tool Integration for Autocomplete

## What This Does
When you type "our customer fees are", the AI automatically:
1. Searches your vector database
2. Gets relevant data
3. Autocompletes your sentence

## Minimal Code Required

### 1. Define Your Tool
```python
class VectorSearchTool:
    def get_tool_schema(self):
        return {
            "type": "function",
            "function": {
                "name": "search_vector_db",
                "description": "Search the vector database for customer information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query"}
                    },
                    "required": ["query"]
                }
            }
        }
    
    def execute_tool_call(self, tool_call):
        # Your vector search logic here
        query = json.loads(tool_call['function']['arguments'])['query']
        results = self.search(query)
        return results
```

### 2. Add Tools to Your API Call
```python
payload = {
    "messages": [{"role": "user", "content": user_input}],
    "model": "your-model",
    "tools": [your_tool.get_tool_schema()],  # Add this
    "tool_choice": "auto"                    # Add this
}
```

### 3. Handle Tool Calls in Response
```python
response = api_call(payload)
message = response['choices'][0]['message']

if 'tool_calls' in message:
    # Execute tool
    tool_result = your_tool.execute_tool_call(message['tool_calls'][0])
    
    # Make follow-up call with tool results
    follow_up = f"Based on search results: {tool_result}\n\nComplete the user's sentence."
    final_response = api_call([{"role": "user", "content": follow_up}])
    
    return final_response['choices'][0]['message']['content']
```

## React Component Integration

### What to Add in streamlit_copilot.tsx:

```typescript
// Add these 2 methods to your Copilot class:

private executeToolCalls = async (toolCalls: any[]): Promise<string[]> => {
  const results: string[] = [];
  
  for (const toolCall of toolCalls) {
    const functionName = toolCall.function?.name;
    const args = JSON.parse(toolCall.function?.arguments);
    
    if (functionName === 'search_knowledge_base') {
      // Call your actual vector search here
      const result = await yourVectorSearch(args.query);
      results.push(result);
    }
  }
  
  return results;
}

private makeFollowUpCall = async (apiUrl: string, userInput: string, toolResults: string[]) => {
  const followUpPrompt = `Based on search results: ${toolResults.join('\n')}\n\nComplete: "${userInput}"`;
  
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`},
    body: JSON.stringify({
      messages: [{"role": "user", "content": followUpPrompt}],
      model: "your-model"
    })
  });
  
  return response.json().choices[0].message.content;
}
```

## That's It
- **Python**: Define tool and handle API calls
- **React**: Add 2 methods to execute tools and make follow-up calls
- **Result**: AI searches database and autocompletes sentences

## Example Flow
1. User types: "our customer fees are"
2. AI calls search_vector_db tool
3. Tool searches vector database
4. AI gets results and completes: "our customer fees are 0.4% annually"
5. User sees autocomplete suggestion

No complex architectures. Just these 3 steps.


