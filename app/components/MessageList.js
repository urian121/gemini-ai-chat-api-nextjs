import Message from './Message';
import TypingIndicator from './TypingIndicator';

export default function MessageList({ messages, isTyping, messagesEndRef, onRetry }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 pb-36 bg-gray-100 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} onRetry={onRetry} />
        ))}
        
        {isTyping && <TypingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}