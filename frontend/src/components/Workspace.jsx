import { Topbar } from "./Topbar";
import { TabNavigation } from "./TabNavigation";
import { NewRecord } from "./NewRecord";
import { DecisionReview } from "./DecisionReview";
import { ReviewApproval } from "./ReviewApproval";
import ActiveConflicts from "./ActiveConflicts";

export function Workspace({
  role,
  department,
  activeTab,
  tabs,
  openConflictCount,
  onTabChange,
  onLogout,
}) {
  return (
    <div className="app-shell">
      <Topbar role={role} department={department} openConflictCount={openConflictCount} onLogout={onLogout} />

      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        openConflictCount={openConflictCount}
      />

      {activeTab === "new" && (
        <NewRecord onViewConflicts={() => onTabChange("conflicts")} department={department} />
      )}

      {activeTab === "conflicts" && <ActiveConflicts role={role} />}

      {activeTab === "decisions" && <DecisionReview />}

      {activeTab === "reviews" && <ReviewApproval />}
    </div>
  );
}
