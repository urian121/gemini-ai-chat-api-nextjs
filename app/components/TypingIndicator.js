export default function TypingIndicator() {
  return (
    <div className="flex justify-start ml-4">
      <div className="flex max-w-2xl items-end space-x-3">
        {/* Avatar */}
        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium bg-gray-200 text-gray-600">
          AI
        </div>
        
        {/* Typing bubble */}
        <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}