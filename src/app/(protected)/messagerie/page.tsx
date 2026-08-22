import MessagerieContent from "@/components/MessagerieContent";

import React from "react";

const page = () => {
  return (
    <div className="flex h-screen w-full flex-col bg-gray-100 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Messagerie</h1>
      </div>

      <div className="min-h-0 flex-1">
        <MessagerieContent />
      </div>
    </div>
  );
};

export default page;
