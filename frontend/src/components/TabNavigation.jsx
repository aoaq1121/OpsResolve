export function TabNavigation({ tabs, activeTab, onTabChange, openConflictCount }) {
  return (
    <div className="tabs">
      {tabs.new && (
        <div className={`tab ${activeTab === "new" ? "active" : ""}`} onClick={() => onTabChange("new")}>
          New Record
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

      {tabs.decisions && (
        <div
          className={`tab ${activeTab === "decisions" ? "active" : ""}`}
          onClick={() => onTabChange("decisions")}
        >
          Decision Review
        </div>
      )}
    </div>
  );
}
