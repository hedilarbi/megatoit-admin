// app/commandes/[code]/page.tsx

import OrderComponent from "@/components/OrderComponent";
import Link from "next/link";
import React from "react";
import { FaArrowLeftLong } from "react-icons/fa6";

// 1) Define the shape of your params
interface PageProps {
  params: {
    code: string;
  };
}

// 2) Annotate your function with that type
const Page = async ({ params }: PageProps) => {
  const { code } = params;

  return (
    <div className="h-screen p-6 bg-gray-100 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-6 space-x-4">
          <Link
            href="/tableau-de-bord"
            className="bg-blue-600 text-white rounded-full p-3 flex justify-center items-center"
          >
            <FaArrowLeftLong />
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">#{code}</h1>
        </div>
      </div>
      <OrderComponent code={code} />
    </div>
  );
};

export default Page;
