# Quick Start Guide

## For Developers

### Understanding the Architecture

The chat application uses a clean, modular architecture:

```
┌─────────────┐
│  chat.html  │  ← View (HTML only)
└─────────────┘
       ↓
┌─────────────┐
│   app.js    │  ← Controller (coordinates everything)
└─────────────┘
   ↓   ↓   ↓
┌────┐┌────┐┌────┐
│ui  ││state││socket│  ← Specialized modules
└────┘└────┘└────┘
   ↓      ↓      ↓
┌─────────────────┐
│   Backend API   │
└─────────────────┘
```

### Module Load Order

**IMPORTANT**: Modules must be loaded in this exact order:

```html
<script src="/js/config.js"></script>    <!-- 1. Configuration -->
<script src="/js/utils.js"></script>     <!-- 2. Utilities -->
<script src="/js/api.js"></script>       <!-- 3. API client -->
<script src="/js/socket.js"></script>    <!-- 4. Socket manager -->
<script src="/js/state.js"></script>     <!-- 5. State manager -->
<script src="/js/ui.js"></script>        <!-- 6. UI manager -->
<script src="/js/app.js"></script>       <!-- 7. App controller -->
```

### Common Tasks

#### 1. Adding a New Message Type

**Step 1**: Update backend Message model
```typescript
// src/models/Message.ts
export type MessageType = 'normal' | 'system' | 'image' | 'YOUR_NEW_TYPE';
```

**Step 2**: Add rendering logic
```javascript
// public/js/ui.js
createMessageElement(message, isOwn) {
  if (message.type === 'YOUR_NEW_TYPE') {
    return this.createYourNewTypeMessage(message);
  }
  // ... existing code
}

createYourNewTypeMessage(message) {
  const el = document.createElement('div');
  // Your rendering logic
  return el;
}
```

**Step 3**: Add socket event handler
```javascript
// public/js/socket.js
setupEventForwarding() {
  // ... existing events
  this.socket.on('message:YOUR_NEW_TYPE', (data) => 
    this.emit('message:YOUR_NEW_TYPE', data)
  );
}
```

**Step 4**: Handle in app controller
```javascript
// public/js/app.js
setupSocketHandlers() {
  // ... existing handlers
  socketManager.on('message:YOUR_NEW_TYPE', (message) => {
    state.addMessage(message);
  });
}
```

#### 2. Adding a New API Endpoint

**Step 1**: Add method to API client
```javascript
// public/js/api.js
class APIClient {
  async yourNewEndpoint(param1, param2) {
    return this.request('/api/your-endpoint', {
      method: 'POST',
      body: JSON.stringify({ param1, param2 })
    });
  }
}
```

**Step 2**: Use in app controller
```javascript
// public/js/app.js
async handleYourAction() {
  try {
    const response = await api.yourNewEndpoint(value1, value2);
    // Handle response
  } catch (error) {
    this.handleError(error);
  }
}
```

#### 3. Adding New State

**Step 1**: Update state structure
```javascript
// public/js/state.js
constructor() {
  this.state = {
    // ... existing state
    yourNewState: {
      property1: null,
      property2: []
    }
  };
}
```

**Step 2**: Add convenience methods
```javascript
// public/js/state.js
setYourNewState(data) {
  this.setState({
    yourNewState: data
  });
}
```

**Step 3**: Subscribe to changes
```javascript
// public/js/app.js
setupStateSubscriptions() {
  // ... existing subscriptions
  state.subscribe('yourNewState', (data) => {
    // Handle state change
    ui.updateYourUI(data);
  });
}
```

#### 4. Adding a New UI Component

**Step 1**: Add DOM reference
```javascript
// public/js/ui.js
init() {
  // ... existing elements
  this.elements.yourNewElement = document.getElementById('yourNewElement');
}
```

**Step 2**: Add rendering method
```javascript
// public/js/ui.js
renderYourComponent(data) {
  const element = this.createYourElement(data);
  this.elements.yourNewElement.appendChild(element);
}

createYourElement(data) {
  const el = document.createElement('div');
  el.className = 'your-classes';
  el.textContent = data.text;
  return el;
}
```

**Step 3**: Add event handler
```javascript
// public/js/ui.js
init() {
  // ... existing init
  this.elements.yourNewElement?.addEventListener('click', () => {
    this.onYourElementClick();
  });
}

onYourElementClick() {
  // Override in app.js
}
```

**Step 4**: Wire up in controller
```javascript
// public/js/app.js
setupUIHandlers() {
  // ... existing handlers
  ui.onYourElementClick = () => this.handleYourElementClick();
}

handleYourElementClick() {
  // Your logic here
}
```

### Debugging

#### Enable Debug Mode
```javascript
// In browser console
localStorage.setItem('debug', 'true');
location.reload();
```

#### Inspect State
```javascript
// In browser console
console.log(state.getState());
console.log(state.get('messages'));
console.log(state.get('user.nickname'));
```

#### Monitor Socket Events
```javascript
// In browser console
socketManager.socket.onAny((event, ...args) => {
  console.log('📡', event, args);
});
```

#### Check API Calls
```javascript
// In browser console
api.healthCheck().then(console.log);
api.getRoomInfo('ABC123').then(console.log);
```

#### Monitor State Changes
```javascript
// In browser console
state.subscribe('messages', (messages) => {
  console.log('Messages changed:', messages.length);
});
```

### Common Patterns

#### Making an API Call
```javascript
async function example() {
  try {
    const response = await api.someMethod(params);
    // Success
    state.updateSomething(response.data);
  } catch (error) {
    // Error
    if (error instanceof APIError) {
      ui.showError(error.message);
    }
  }
}
```

#### Sending a Socket Event
```javascript
function example() {
  if (!socketManager.isConnected()) {
    ui.showError('Not connected');
    return;
  }
  
  socketManager.send('event:name', { data });
}
```

#### Updating State
```javascript
function example() {
  // Single property
  state.setState({ property: value });
  
  // Nested property
  state.setState({
    nested: {
      property: value
    }
  });
  
  // Using convenience method
  state.addMessage(message);
}
```

#### Subscribing to State
```javascript
function example() {
  // Subscribe
  const unsubscribe = state.subscribe('path.to.property', (newValue, oldValue) => {
    console.log('Changed from', oldValue, 'to', newValue);
  });
  
  // Unsubscribe when done
  unsubscribe();
}
```

#### Rendering UI
```javascript
function example() {
  // Create element
  const element = ui.createSomeElement(data);
  
  // Add to DOM
  container.appendChild(element);
  
  // Update existing
  ui.updateSomeElement(id, newData);
  
  // Remove
  ui.removeSomeElement(id);
}
```

### Error Handling

#### API Errors
```javascript
try {
  await api.someMethod();
} catch (error) {
  if (error instanceof APIError) {
    switch (error.code) {
      case 'ROOM_FULL':
        ui.showError('Room is full');
        break;
      case 'UNAUTHORIZED':
        ui.showError('Not authorized');
        break;
      default:
        ui.showError(error.message);
    }
  }
}
```

#### Socket Errors
```javascript
socketManager.on('error', (error) => {
  console.error('Socket error:', error);
  state.setError(error);
  ui.showError(error.message);
});
```

#### Connection Errors
```javascript
socketManager.on('connection:lost', () => {
  ui.showConnectionStatus('disconnected');
  ui.showError('Connection lost. Reconnecting...');
});

socketManager.on('connection:reconnected', () => {
  ui.showConnectionStatus('connected');
  ui.showError('Reconnected!', 2000);
});
```

### Testing

#### Unit Test Example
```javascript
describe('StateManager', () => {
  let state;
  
  beforeEach(() => {
    state = new StateManager();
  });
  
  it('should add message', () => {
    const message = { id: '1', content: 'test' };
    state.addMessage(message);
    expect(state.get('messages')).toContain(message);
  });
  
  it('should notify subscribers', (done) => {
    state.subscribe('messages', (messages) => {
      expect(messages.length).toBe(1);
      done();
    });
    state.addMessage({ id: '1', content: 'test' });
  });
});
```

#### Integration Test Example
```javascript
describe('Message Flow', () => {
  it('should handle new message', async () => {
    // Setup
    const app = new App();
    await app.init();
    
    // Simulate socket event
    socketManager.emit('message:new', mockMessage);
    
    // Wait for state update
    await waitFor(() => {
      expect(state.get('messages')).toContain(mockMessage);
    });
    
    // Check UI
    expect(ui.messageContainer.children.length).toBe(1);
  });
});
```

### Performance Tips

1. **Debounce expensive operations**
```javascript
const debouncedSearch = utils.debounce(searchFunction, 300);
```

2. **Throttle frequent events**
```javascript
const throttledScroll = utils.throttle(scrollHandler, 100);
```

3. **Batch DOM updates**
```javascript
const fragment = document.createDocumentFragment();
messages.forEach(msg => {
  fragment.appendChild(createMessageElement(msg));
});
container.appendChild(fragment);
```

4. **Use event delegation**
```javascript
container.addEventListener('click', (e) => {
  if (e.target.matches('.message-button')) {
    handleMessageButton(e.target);
  }
});
```

### Best Practices

1. **Always use the module singletons**
   - `api` not `new APIClient()`
   - `state` not `new StateManager()`
   - `ui` not `new UIManager()`

2. **Never manipulate DOM directly in app.js**
   - Use `ui.renderSomething()` instead

3. **Never make API calls from ui.js**
   - Use `app.handleSomething()` instead

4. **Always handle errors**
   - Use try/catch for async operations
   - Show user-friendly error messages

5. **Keep functions small and focused**
   - One function = one responsibility
   - Extract complex logic into separate functions

6. **Use meaningful names**
   - `handleSendMessage` not `send`
   - `renderMessageElement` not `render`

7. **Document complex logic**
   - Add comments for non-obvious code
   - Explain "why" not "what"

### Getting Help

1. **Read the architecture docs**
   - `/public/js/README.md` - Full architecture guide
   - `/ARCHITECTURE_REFACTOR.md` - Refactor details

2. **Check the code**
   - Each module is well-commented
   - Look at existing patterns

3. **Use the browser console**
   - Inspect state: `state.getState()`
   - Test API: `api.healthCheck()`
   - Monitor events: `socketManager.socket.onAny(...)`

4. **Enable debug mode**
   - Set `config.debug.enabled = true`
   - Check console for detailed logs
