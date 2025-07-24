import CreateAbonnementForm from "@/components/CreateAbonnementForm";

import Link from "next/link";
import React from "react";
import { FaArrowLeftLong } from "react-icons/fa6";
const page = () => {
  return (
    <div className="h-screen p-6 bg-gray-100 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex  items-center mb-6 space-x-4">
          <Link
            href="/abonnements"
            className="bg-blue-600 text-white rounded-full p-3 flex justify-center items-center"
          >
            <FaArrowLeftLong className="" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">
            Créer un abonnement
          </h1>
        </div>
      </div>
      <CreateAbonnementForm />
    </div>
  );
};

export default page;
