import CreateMatchForm from "@/components/CreateMatchForm";
import Link from "next/link";
import React from "react";
import { FaArrowLeftLong } from "react-icons/fa6";
const page = () => {
  return (
    <div className="h-screen p-6 bg-gray-100 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex  items-center mb-6 space-x-4">
          <Link
            href="/matchs"
            className="bg-black text-white rounded-full p-3 flex justify-center items-center hover:bg-gray-800 transition"
          >
            <FaArrowLeftLong className="" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Créer un match</h1>
        </div>
      </div>
      <CreateMatchForm />
    </div>
  );
};

export default page;
