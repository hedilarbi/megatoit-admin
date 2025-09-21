import AbonementsContent from "@/components/AbonementsContent";

import React from "react";

const page = () => {
  return (
    <div className="h-screen p-6 bg-gray-100 w-full  relative overflow-y-auto">
      <div className="">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Abonnement vendu</h1>
        </div>

        <AbonementsContent />
      </div>
    </div>
  );
};

export default page;
