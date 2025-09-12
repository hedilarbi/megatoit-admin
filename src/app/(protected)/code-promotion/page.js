import Link from "next/link";
import React from "react";
import CodePromoContent from "../../../components/CodePromoContent";

const page = () => {
  return (
    <div className="h-screen p-6 bg-gray-100 w-full  relative">
      <div className="">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Codes promotions</h1>
          <Link
            href="/code-promotion/ajouter"
            className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition"
          >
            Créer un code promo
          </Link>
        </div>

        <CodePromoContent />
      </div>
    </div>
  );
};

export default page;
