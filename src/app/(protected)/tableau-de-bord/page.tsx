import DashboardContent from "@/components/DashboardContent";

import React from "react";

const page = () => {
  return (
    <div className="h-screen p-6 bg-gray-100 w-full  relative overflow-y-scroll">
      <div className="">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Tableau de bord</h1>
        </div>

        <DashboardContent />
      </div>
    </div>
  );
};

export default page;
