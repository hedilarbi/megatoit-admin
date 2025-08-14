"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { FaRegIdCard } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { GiHockey } from "react-icons/gi";
import { FaUsers, FaTicket } from "react-icons/fa6";
import { IoLogOut } from "react-icons/io5";

import Megatoit from "@/assets/megatoit.png";

// Navigation items type definition
type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  ariaLabel: string;
  matchPattern?: RegExp; // Added for matching URL patterns
};

// Main navigation items
const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/tableau-de-bord",
    icon: <MdDashboard />,
    ariaLabel: "Navigate to dashboard",
  },
  {
    label: "Matchs",
    href: "/matchs",
    icon: <GiHockey />,
    ariaLabel: "Navigate to patients",
    matchPattern: /^\/matchs(\/.*)?$/, // Matches /patients and /patients/[id]
  },
  {
    label: "Billets",
    href: "/tickets",
    icon: <FaTicket />,
    ariaLabel: "Navigate to invitations",
    matchPattern: /^\/tickets(\/.*)?$/, // Matches /patients and /patients/[id]
  },
  // {
  //   label: "Abonnements",
  //   href: "/abonnements",
  //   icon: <FaRegIdCard />,
  //   ariaLabel: "Navigate to patients",
  //   matchPattern: /^\/abonnements(\/.*)?$/, // Matches /patients and /patients/[id]
  // },

  {
    label: "Utilisateurs",
    href: "/utilisateurs",
    icon: <FaUsers />,
    ariaLabel: "Navigate to invitations",
    matchPattern: /^\/utlisateurs(\/.*)?$/, // Matches /patients and /patients/[id]
  },
  {
    label: "Employés",
    href: "/comptes",
    icon: <FaUsers />,
    ariaLabel: "Navigate to invitations",
    matchPattern: /^\/comptes(\/.*)?$/, // Matches /patients and /patients/[id]
  },
];

// SideBar Component
const SideBar = () => {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Check if a nav item is active based on current path
  const isNavItemActive = (item: NavItem): boolean => {
    if (item.matchPattern) {
      return item.matchPattern.test(pathname);
    }
    return pathname === item.href;
  };

  return (
    <aside
      id="sidebar"
      className="h-full bg-white shadow-lg w-64"
      aria-label="Sidebar navigation"
    >
      <div className="flex flex-col h-full p-5">
        {/* Logo */}
        <div className="flex justify-center py-4">
          <Image
            src={Megatoit} // Adjust the path to your logo
            className="w-auto h-24"
            width={180}
            height={48}
            alt="Application logo"
          />
        </div>

        {/* Navigation Links */}
        <nav
          className="flex flex-col gap-2 mt-6 flex-grow"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.ariaLabel}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                             ${
                               isActive
                                 ? "bg-emerald-50 text-emerald-900 font-semibold"
                                 : "text-gray-600 hover:bg-gray-100"
                             }`}
              >
                {item.icon}
                <span className="text-base">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Section */}
        <div className="mt-auto pb-8">
          <div className="h-px bg-gray-200 w-full my-4" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Logout from application"
          >
            <IoLogOut />
            <span className="text-base">Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SideBar;
