import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const sw = collapsed ? 64 : 220;
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Header sidebarWidth={sw} />
      <main className="transition-all duration-200 pt-[60px]" style={{ marginLeft: sw }}>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
