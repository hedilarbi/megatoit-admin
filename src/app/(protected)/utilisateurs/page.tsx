import UtilisateursContent from "@/components/UtilisateursContent";

import React from "react";

const page = () => {
  return (
    <div className="h-screen p-6 bg-gray-100 w-full  relative">
      <div className="">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Utilisateurs</h1>
        </div>

        <UtilisateursContent />
      </div>
    </div>
  );
};

export default page;
