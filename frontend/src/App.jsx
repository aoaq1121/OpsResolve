import React, { useState, useEffect, useMemo } from 'react';
import "./App.css";
import { ROLES, getVisibleTabs } from "./constants/appConstants";
import { EntryScreen } from "./components/EntryScreen";
import { Workspace } from "./components/Workspace";

export default function App() {
  const [screen, setScreen]   = useState("entry");
  const [role, setRole]       = useState("");
  const [department, setDepartment] = useState("");
  const [activeTab, setActiveTab]   = useState("new");
  const [openConflictCount, setOpenConflictCount] = useState(0);

  const tabs = getVisibleTabs(role);

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
