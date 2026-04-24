export function TabNavigation({ tabs, activeTab, onTabChange, openConflictCount }) {
  return (
    <div className="tabs">
      {tabs.new && (
        <div className={`tab ${activeTab === "new" ? "active" : ""}`} onClick={() => onTabChange("new")}>
          New Record
        </div>
      )}

      {tabs.request && (
        <div className={`tab ${activeTab === "request" ? "active" : ""}`} onClick={() => onTabChange("request")}>
          Request Machine
        </div>
      )}

      {tabs.conflicts && (
        <div
          className={`tab ${activeTab === "conflicts" ? "active" : ""}`}
          onClick={() => onTabChange("conflicts")}
        >
          Active Conflicts
          {openConflictCount > 0 && <span className="tab-badge">{openConflictCount}</span>}
        </div>
      )}

      {tabs.performance && (
        <div
          className={`tab ${activeTab === "performance" ? "active" : ""}`}
          onClick={() => onTabChange("performance")}
        >
          Performance
        </div>
      )}
    </div>
  );
}
