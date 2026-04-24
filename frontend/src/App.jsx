import "./App.css";
import { ROLES, getVisibleTabs } from "./constants/appConstants";
import { EntryScreen } from "./components/EntryScreen";
import { Workspace } from "./components/Workspace";
import { useState, useEffect } from "react";

export default function App() {
  const [screen, setScreen]         = useState("entry");
  const [role, setRole]             = useState("");
  const [department, setDepartment] = useState("");
  const [activeTab, setActiveTab]   = useState("new");
  const [openConflictCount, setOpenConflictCount] = useState(0);

  const tabs = getVisibleTabs(role);

  useEffect(() => {
    if (!department) return;
    function load() {
      fetch("http://localhost:3001/api/conflicts")
        .then((res) => res.json())
        .then((data) => {
          const raw = Array.isArray(data) ? data : data.data || [];
          const open = raw.filter((c) => {
            const isOpen = c.status !== "resolved" && c.status !== "overridden";
            const depts = c.departmentsInvolved || [c.department_a, c.department_b].filter(Boolean) || [];
            return isOpen && depts.includes(department);
          }).length;
          setOpenConflictCount(open);
        })
        .catch(() => setOpenConflictCount(0));
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [department]);

  function handleContinue() {
    if (!role || !department) {
      alert("Please select both role and department.");
      return;
    }
    setActiveTab("new");
    setScreen("workspace");
  }

  function handleLogout() {
    setScreen("entry");
    setRole("");
    setDepartment("");
  }

  if (screen === "entry") {
    return (
      <EntryScreen
        role={role}
        department={department}
        onRoleChange={setRole}
        onDepartmentChange={setDepartment}
        onContinue={handleContinue}
      />
    );
  }

  return (
    <Workspace
      role={role}
      department={department}
      activeTab={activeTab}
      tabs={tabs}
      openConflictCount={openConflictCount}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
    />
  );
}
