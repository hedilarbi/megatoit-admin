import MatchsContent from "@/components/MatchsContent";
import Link from "next/link";
import React from "react";

const page = () => {
  return (
    <div className="h-screen p-6 bg-gray-100 w-full  relative">
      <div className="">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Matchs</h1>
          <Link
            href="/matchs/ajouter"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition"
          >
            Créer un match
          </Link>
        </div>

        <MatchsContent />
      </div>
    </div>
  );
};

export default page;
