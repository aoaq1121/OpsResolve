import { useState } from "react";
import "./App.css";
import mockConflicts from "./data/mockConflicts";
import { ROLES, getVisibleTabs } from "./constants/appConstants";
import { EntryScreen } from "./components/EntryScreen";
import { Workspace } from "./components/Workspace";
import { GlobalAlertBanner } from "./components/GlobalAlertBanner";

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("entry");
  const [role, setRole] = useState("");
  const [department, setDepartment] = useState("");
  const [activeTab, setActiveTab] = useState("new");

  const openConflictCount = mockConflicts.filter((c) => c.status !== "resolved").length;
  const tabs = getVisibleTabs(role);

  function App() {
  return (
    <div className="app-container">
      <GlobalAlertBanner />  {/* This makes it visible to everyone, always */}
      <Navbar />
      <MainContent />
    </div>
    );
  }

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

  // Entry / login screen
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

  // Main workspace
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