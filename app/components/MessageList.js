import Message from './Message';
import TypingIndicator from './TypingIndicator';

export default function MessageList({ messages, isTyping, messagesEndRef, onRetry }) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 md:px-6 py-6 space-y-4 pb-36 bg-gray-100">
      <div className="w-full max-w-full mx-auto space-y-4">
        {messages.map((message, idx) => {
          const isLast = idx === messages.length - 1;
          const animate = isTyping && isLast && message.sender === 'bot';
          return (
            <Message key={message.id} message={message} onRetry={onRetry} animate={animate} />
          );
        })}

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}