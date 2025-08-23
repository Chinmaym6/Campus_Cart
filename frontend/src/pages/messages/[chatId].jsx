import React from 'react';
import MessagesPage from './index';

// This component handles the dynamic route for individual chats
// The main MessagesPage component handles the chatId parameter internally
function ChatPage() {
    return <MessagesPage />;
}

export default ChatPage;
