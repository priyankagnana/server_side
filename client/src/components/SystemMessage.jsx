import React from 'react';

const SystemMessage = ({ message }) => {
  return (
    <div className="flex items-center justify-center my-2 px-4">
      <div className="bg-gray-100 rounded-full px-4 py-1.5 max-w-[80%]">
        <p className="text-xs text-gray-600 text-center">
          {message.content}
        </p>
      </div>
    </div>
  );
};

export default SystemMessage;

