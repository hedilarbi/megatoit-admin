import AbonementsContent from "@/components/AbonementsContent";

import Link from "next/link";
import React from "react";

const page = () => {
  return (
    <div className="h-screen p-6 bg-gray-100 w-full  relative">
      <div className="">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Abonnement</h1>
          <Link
            href="/abonnements/ajouter"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition"
          >
            Créer un abonnement
          </Link>
        </div>

        <AbonementsContent />
      </div>
    </div>
  );
};

export default page;
