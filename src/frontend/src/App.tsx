import { Toaster } from "@/components/ui/sonner";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ClipboardList,
  Filter,
  Loader2,
  LogOut,
  Package2,
  Receipt,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { OrderStatus } from "./backend";
import type {
  ItemAmount,
  Order,
  OrderItem,
  OrderWithAmounts,
} from "./backend.d";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVER_PASSWORD = "driver123";
const MANAGER_PASSWORD = "manager123";
const OFFICE_PASSWORD = "office123";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "home"
  | "indent"
  | "confirm"
  | "blasterView"
  | "driverLogin"
  | "driverView"
  | "managerLogin"
  | "managerView"
  | "officeLogin"
  | "officeView";

const EXPLOSIVE_ITEMS: Array<{ name: string; unit: string }> = [
  { name: "25mm GEL", unit: "KGS" },
  { name: "83mm Boost", unit: "KGS" },
  { name: "Detonating Fuse", unit: "Roll" },
  { name: "Nonel", unit: "NOS" },
  { name: "Ideal-E-Det", unit: "NOS" },
  { name: "Solar-E-Det", unit: "NOS" },
  { name: "4 mtr", unit: "NOS" },
  { name: "2 mtr", unit: "NOS" },
  { name: "5 mtr", unit: "NOS" },
  { name: "6 mtr", unit: "NOS" },
  { name: "17/ms 3 or 4 mtr", unit: "NOS" },
  { name: "25/ms 3 or 4 mtr", unit: "NOS" },
  { name: "42/ms 3 or 4 mtr", unit: "NOS" },
  { name: "Nonel DTH 11 mtr", unit: "NOS" },
  { name: "Nonel DTH 10 mtr", unit: "NOS" },
];

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const cls = `badge-${normalized}`;
  const label =
    normalized === "billdone"
      ? "Bill Done"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`${cls} inline-block px-3 py-0.5 rounded-full text-xs font-bold my-1`}
    >
      {label}
    </span>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="order-card mt-3">
      <div className="skeleton h-3 w-3/4 mb-2" />
      <div className="skeleton h-3 w-1/2 mb-2" />
      <div className="skeleton h-3 w-2/3 mb-4" />
      <div className="skeleton h-16 w-full" />
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────────────────────────

interface EditableItemState {
  qty: string;
  name: string;
  amount: string;
}

interface OrderCardProps {
  order: Order;
  index: number;
  viewerRole?: "manager" | "driver" | "blaster" | "office";
  editableItems?: Record<string, EditableItemState>;
  /** For office panel: map of itemName -> amount (read-only) */
  orderAmountsMap?: Record<string, string>;
  onItemChange?: (
    originalName: string,
    field: "name" | "qty" | "amount",
    value: string,
  ) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onAccept?: () => void;
  onDelivered?: () => void;
  onSaveItems?: () => void;
  onBillDone?: () => void;
  isActioning?: boolean;
  driverNamesMap?: Record<string, string>;
  showDriverNameInput?: boolean;
  driverNameValue?: string;
  onDriverNameChange?: (v: string) => void;
  onDriverNameConfirm?: () => void;
  driverNameError?: string;
  vehicleNamesMap?: Record<string, string>;
  showVehicleInput?: boolean;
  vehicleValue?: string;
  onVehicleChange?: (v: string) => void;
  onVehicleConfirm?: () => void;
  vehicleError?: string;
}

function OrderCard({
  order,
  index,
  viewerRole,
  editableItems,
  orderAmountsMap,
  onItemChange,
  onApprove,
  onReject,
  onAccept,
  onDelivered,
  onSaveItems,
  onBillDone,
  isActioning,
  driverNamesMap,
  showDriverNameInput,
  driverNameValue,
  onDriverNameChange,
  onDriverNameConfirm,
  driverNameError,
  vehicleNamesMap,
  showVehicleInput,
  vehicleValue,
  onVehicleChange,
  onVehicleConfirm,
  vehicleError,
}: OrderCardProps) {
  const cardOcid = `${viewerRole ?? "blaster"}.item.${index}`;

  return (
    <div className="order-card" data-ocid={cardOcid}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 4,
        }}
      >
        <div style={{ flex: 1 }}>
          <div className="order-card-field">
            <span className="order-card-label">Quarry:</span>
            <span className="order-card-value">{order.quarry}</span>
          </div>
          <div className="order-card-field">
            <span className="order-card-label">Address:</span>
            <span className="order-card-value">{order.address}</span>
          </div>
          <div className="order-card-field">
            <span className="order-card-label">Lease No:</span>
            <span className="order-card-value">{order.lease}</span>
          </div>
          <div className="order-card-field">
            <span className="order-card-label">DGMS:</span>
            <span className="order-card-value">{order.dgms}</span>
          </div>
          <div
            className="order-card-field"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              <span className="order-card-label">Date:</span>
              <span className="order-card-value">{order.date}</span>
            </span>
            <span style={{ textAlign: "right" }}>
              {driverNamesMap?.[String(order.id)] && (
                <span style={{ display: "block" }}>
                  <span className="order-card-label">Driver: </span>
                  <span
                    className="order-card-value"
                    style={{ fontWeight: 700 }}
                  >
                    {driverNamesMap[String(order.id)]}
                  </span>
                </span>
              )}
              {vehicleNamesMap?.[String(order.id)] && (
                <span style={{ display: "block" }}>
                  <span className="order-card-label">Vehicle: </span>
                  <span
                    className="order-card-value"
                    style={{ fontWeight: 700 }}
                  >
                    {vehicleNamesMap[String(order.id)]}
                  </span>
                </span>
              )}
            </span>
          </div>
        </div>
        <div style={{ textAlign: "right", marginLeft: 12, flexShrink: 0 }}>
          <span
            className="order-card-label"
            style={{ display: "block", marginBottom: 2 }}
          >
            Blaster
          </span>
          <span
            className="order-card-value"
            style={{ fontWeight: 700, fontSize: "0.97em" }}
          >
            {order.blaster}
          </span>
        </div>
      </div>
      <StatusBadge status={order.status} />

      <table className="indent-table mt-2">
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingLeft: 6 }}>Item</th>
            <th>Qty</th>
            {(viewerRole === "manager" || viewerRole === "office") && (
              <th>Amount</th>
            )}
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.name}>
              <td style={{ textAlign: "left", paddingLeft: 6 }}>
                {viewerRole === "manager" && editableItems && onItemChange ? (
                  <input
                    value={editableItems[item.name]?.name ?? item.name}
                    onChange={(e) =>
                      onItemChange(item.name, "name", e.target.value)
                    }
                    style={{ width: 120 }}
                  />
                ) : (
                  item.name
                )}
              </td>
              <td>
                {viewerRole === "manager" && editableItems && onItemChange ? (
                  <input
                    value={editableItems[item.name]?.qty ?? item.qty}
                    onChange={(e) =>
                      onItemChange(item.name, "qty", e.target.value)
                    }
                    style={{ width: 60 }}
                  />
                ) : (
                  item.qty || "—"
                )}
              </td>
              {(viewerRole === "manager" || viewerRole === "office") && (
                <td>
                  {viewerRole === "manager" && editableItems && onItemChange ? (
                    <input
                      value={editableItems[item.name]?.amount ?? ""}
                      onChange={(e) =>
                        onItemChange(item.name, "amount", e.target.value)
                      }
                      style={{ width: 70 }}
                    />
                  ) : (
                    orderAmountsMap?.[item.name] || "—"
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Manager actions for Pending */}
      {viewerRole === "manager" &&
        order.status === OrderStatus.pending &&
        (showVehicleInput ? (
          <div className="mt-3">
            <input
              className="form-input mb-1"
              placeholder="Enter vehicle number"
              value={vehicleValue ?? ""}
              onChange={(e) => onVehicleChange?.(e.target.value)}
              data-ocid={`manager.vehicle_input.${index}`}
            />
            {vehicleError && (
              <div
                className="error-msg mb-1"
                data-ocid={`manager.vehicle_error.${index}`}
              >
                {vehicleError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary btn-success btn-sm"
                onClick={onVehicleConfirm}
                disabled={isActioning}
                data-ocid={`manager.approve_button.${index}`}
              >
                {isActioning ? (
                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                ) : null}
                Confirm Approve
              </button>
              <button
                type="button"
                className="btn-primary btn-secondary btn-sm"
                onClick={() => onVehicleChange?.("")}
                disabled={isActioning}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              className="btn-primary btn-success btn-sm"
              onClick={onApprove}
              disabled={isActioning}
              data-ocid={`manager.approve_button.${index}`}
            >
              {isActioning ? (
                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
              ) : null}
              Approve
            </button>
            <button
              type="button"
              className="btn-primary btn-danger btn-sm"
              onClick={onReject}
              disabled={isActioning}
              data-ocid={`manager.reject_button.${index}`}
            >
              Reject
            </button>
          </div>
        ))}

      {/* Manager save items for non-pending orders */}
      {viewerRole === "manager" &&
        order.status !== OrderStatus.pending &&
        onSaveItems && (
          <button
            type="button"
            className="btn-primary btn-sm mt-3"
            onClick={onSaveItems}
            disabled={isActioning}
            data-ocid={`manager.save_button.${index}`}
          >
            {isActioning ? (
              <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
            ) : null}
            Save Changes
          </button>
        )}

      {/* Driver actions */}
      {viewerRole === "driver" &&
        order.status === OrderStatus.approved &&
        (showDriverNameInput ? (
          <div className="mt-3">
            <input
              className="form-input mb-1"
              placeholder="Enter your driver name"
              value={driverNameValue ?? ""}
              onChange={(e) => onDriverNameChange?.(e.target.value)}
              data-ocid={`driver.input.${index}`}
            />
            {driverNameError && (
              <div
                className="error-msg mb-1"
                data-ocid={`driver.error_state.${index}`}
              >
                {driverNameError}
              </div>
            )}
            <button
              type="button"
              className="btn-primary btn-success btn-sm"
              onClick={onDriverNameConfirm}
              disabled={isActioning}
              data-ocid={`driver.confirm_button.${index}`}
            >
              {isActioning ? (
                <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
              ) : null}
              Confirm Accept
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-primary btn-sm mt-3"
            onClick={onAccept}
            disabled={isActioning}
            data-ocid={`driver.accept_button.${index}`}
          >
            {isActioning ? (
              <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
            ) : null}
            Accept
          </button>
        ))}
      {viewerRole === "driver" && order.status === OrderStatus.billDone && (
        <button
          type="button"
          className="btn-primary btn-success btn-sm mt-3"
          onClick={onDelivered}
          disabled={isActioning}
          data-ocid={`driver.delivered_button.${index}`}
        >
          {isActioning ? (
            <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
          ) : null}
          Delivered
        </button>
      )}

      {/* Office action — Bill Done only after driver accepts */}
      {viewerRole === "office" && order.status === OrderStatus.accepted && (
        <button
          type="button"
          className="btn-primary btn-bill btn-sm mt-3 flex items-center gap-1"
          onClick={onBillDone}
          disabled={isActioning}
          data-ocid={`office.primary_button.${index}`}
        >
          {isActioning ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Receipt className="h-3 w-3" />
          )}
          Bill Done
        </button>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const [screen, setScreen] = useState<Screen>("home");

  const navigate = useCallback((s: Screen) => setScreen(s), []);

  return (
    <div className="app-container">
      <header className="app-header">
        <Package2 className="inline-block mr-2 h-4 w-4 opacity-80 -mt-0.5" />
        Pavithra Explosives
      </header>

      <main className="flex-1">
        {screen === "home" && <HomeScreen navigate={navigate} />}
        {screen === "indent" && (
          <IndentScreen
            navigate={navigate}
            actor={actor}
            actorFetching={actorFetching}
            identity={identity}
            login={login}
            isLoggingIn={isLoggingIn}
          />
        )}
        {screen === "confirm" && <ConfirmScreen navigate={navigate} />}
        {screen === "blasterView" && (
          <BlasterViewScreen
            navigate={navigate}
            actor={actor}
            actorFetching={actorFetching}
            identity={identity}
            login={login}
            isLoggingIn={isLoggingIn}
          />
        )}
        {screen === "driverLogin" && <DriverLoginScreen navigate={navigate} />}
        {screen === "driverView" && (
          <DriverViewScreen
            navigate={navigate}
            actor={actor}
            actorFetching={actorFetching}
          />
        )}
        {screen === "managerLogin" && (
          <ManagerLoginScreen navigate={navigate} />
        )}
        {screen === "managerView" && (
          <ManagerViewScreen
            navigate={navigate}
            actor={actor}
            actorFetching={actorFetching}
          />
        )}
        {screen === "officeLogin" && <OfficeLoginScreen navigate={navigate} />}
        {screen === "officeView" && (
          <OfficeViewScreen
            navigate={navigate}
            actor={actor}
            actorFetching={actorFetching}
          />
        )}
      </main>

      <footer className="app-footer">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          caffeine.ai
        </a>
      </footer>

      <Toaster position="top-center" />
    </div>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="screen">
      <h2 className="screen-title">Dashboard</h2>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="btn-primary flex items-center justify-center gap-2"
          onClick={() => navigate("indent")}
          data-ocid="home.primary_button"
        >
          <ClipboardList className="h-4 w-4" />
          New Indent
        </button>
        <button
          type="button"
          className="btn-primary flex items-center justify-center gap-2"
          onClick={() => navigate("blasterView")}
          data-ocid="home.secondary_button"
        >
          <Search className="h-4 w-4" />
          Blaster View
        </button>
        <button
          type="button"
          className="btn-primary flex items-center justify-center gap-2"
          onClick={() => navigate("driverLogin")}
          data-ocid="home.driver_panel_button"
        >
          <Truck className="h-4 w-4" />
          Driver Panel
        </button>
        <button
          type="button"
          className="btn-primary flex items-center justify-center gap-2"
          onClick={() => navigate("managerLogin")}
          data-ocid="home.manager_panel_button"
        >
          <ShieldCheck className="h-4 w-4" />
          Manager Panel
        </button>
        <button
          type="button"
          className="btn-primary flex items-center justify-center gap-2"
          onClick={() => navigate("officeLogin")}
          data-ocid="home.office_panel_button"
        >
          <Building2 className="h-4 w-4" />
          Office Panel
        </button>
      </div>
    </div>
  );
}

// ─── Indent Form Screen ───────────────────────────────────────────────────────

interface ActorProps {
  navigate: (s: Screen) => void;
  actor: import("./backend.d").backendInterface | null;
  actorFetching: boolean;
}

interface IndentScreenProps extends ActorProps {
  identity: import("@icp-sdk/core/agent").Identity | undefined;
  login: () => void;
  isLoggingIn: boolean;
}

function IndentScreen({ navigate, actor }: IndentScreenProps) {
  const [quarry, setQuarry] = useState("");
  const [address, setAddress] = useState("");
  const [blaster, setBlaster] = useState("");
  const [lease, setLease] = useState("");
  const [dgms, setDgms] = useState("");
  const [date, setDate] = useState("");
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQtyChange = (name: string, val: string) => {
    setQtys((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async () => {
    setError("");

    if (
      !quarry.trim() ||
      !address.trim() ||
      !blaster.trim() ||
      !lease.trim() ||
      !dgms.trim() ||
      !date
    ) {
      setError("All fields required");
      return;
    }

    if (!actor) {
      setError(
        "Still connecting to network. Please wait a moment and try again.",
      );
      return;
    }

    const items: OrderItem[] = EXPLOSIVE_ITEMS.map((ei) => ({
      name: ei.name,
      qty: qtys[ei.name] ?? "",
    }));

    setLoading(true);

    try {
      await actor.submitOrder(
        quarry.trim(),
        address.trim(),
        blaster.trim(),
        lease.trim(),
        dgms.trim(),
        date,
        items,
      );
      // Reset form
      setQuarry("");
      setAddress("");
      setBlaster("");
      setLease("");
      setDgms("");
      setDate("");
      setQtys({});
      navigate("confirm");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.toLowerCase().includes("1 order") ||
        msg.toLowerCase().includes("per blaster") ||
        msg.toLowerCase().includes("active order")
      ) {
        setError("Only 1 order allowed per blaster per day");
      } else if (
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("already")
      ) {
        setError("Only 1 order allowed per blaster per day");
      } else {
        setError("Failed to submit order. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while connecting
  if (!actor) {
    return (
      <div className="screen">
        <h2 className="screen-title">Explosive Indent</h2>
        <div
          className="order-card text-center mt-4"
          data-ocid="indent.loading_state"
        >
          <Loader2
            className="h-8 w-8 animate-spin mx-auto mb-3"
            style={{ color: "oklch(var(--navy))" }}
          />
          <p
            className="text-sm"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Connecting to network...
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-secondary mt-3"
          onClick={() => navigate("home")}
          data-ocid="indent.cancel_button"
        >
          <span className="flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </span>
        </button>
      </div>
    );
  }

  // Show full form (no login required)
  return (
    <div className="screen">
      <h2 className="screen-title">Explosive Indent</h2>

      <input
        className="form-input"
        placeholder="Quarry Name *"
        value={quarry}
        onChange={(e) => setQuarry(e.target.value)}
        data-ocid="indent.input"
      />
      <input
        className="form-input"
        placeholder="Quarry Address *"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        data-ocid="indent.address_input"
      />
      <input
        className="form-input"
        placeholder="Blaster Name *"
        value={blaster}
        onChange={(e) => setBlaster(e.target.value)}
        data-ocid="indent.blaster_input"
      />
      <input
        className="form-input"
        placeholder="Lease No *"
        value={lease}
        onChange={(e) => setLease(e.target.value)}
        data-ocid="indent.lease_input"
      />
      <input
        className="form-input"
        placeholder="DGMS Certificate No *"
        value={dgms}
        onChange={(e) => setDgms(e.target.value)}
        data-ocid="indent.dgms_input"
      />
      <input
        className="form-input"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        data-ocid="indent.date_input"
      />

      <div className="mt-3 overflow-x-auto">
        <table className="indent-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}>SL</th>
              <th style={{ textAlign: "left", paddingLeft: 6 }}>Item</th>
              <th>Qty</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {EXPLOSIVE_ITEMS.map((item, idx) => (
              <tr key={item.name}>
                <td>{idx + 1}</td>
                <td style={{ textAlign: "left", paddingLeft: 6 }}>
                  {item.name}
                </td>
                <td>
                  <input
                    value={qtys[item.name] ?? ""}
                    onChange={(e) => handleQtyChange(item.name, e.target.value)}
                    type="number"
                    min="0"
                    placeholder="0"
                  />
                </td>
                <td>{item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="error-msg" data-ocid="indent.error_state">
          {error}
        </div>
      )}

      {loading && (
        <div
          className="flex items-center justify-center gap-2 mt-3 text-sm"
          style={{ color: "oklch(var(--muted-foreground))" }}
          data-ocid="indent.loading_state"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Submitting order...
        </div>
      )}

      <button
        type="button"
        className="btn-primary mt-3"
        onClick={handleSubmit}
        disabled={loading || !actor}
        data-ocid="indent.submit_button"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
          </span>
        ) : !actor ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
          </span>
        ) : (
          "Submit"
        )}
      </button>
      <button
        type="button"
        className="btn-primary btn-secondary"
        onClick={() => navigate("home")}
        data-ocid="indent.cancel_button"
      >
        <span className="flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </span>
      </button>
    </div>
  );
}

// ─── Confirm Screen ───────────────────────────────────────────────────────────

function ConfirmScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div className="screen">
      <h2 className="screen-title">Order Submitted</h2>

      <div className="order-card text-center mt-4">
        <CheckCircle2
          className="h-12 w-12 mx-auto mb-3"
          style={{ color: "oklch(0.5 0.15 145)" }}
        />
        <p className="text-sm mb-2 font-semibold">
          Your indent has been submitted successfully.
        </p>
        <p className="text-sm mb-3">
          Status: <StatusBadge status="pending" />
        </p>
        <p
          className="text-xs"
          style={{ color: "oklch(var(--muted-foreground))" }}
        >
          The manager will review and approve your order.
        </p>
      </div>

      <button
        type="button"
        className="btn-primary mt-4"
        onClick={() => navigate("home")}
        data-ocid="confirm.primary_button"
      >
        Home
      </button>
    </div>
  );
}

// ─── Blaster View Screen ──────────────────────────────────────────────────────

interface BlasterViewScreenProps extends ActorProps {
  identity: import("@icp-sdk/core/agent").Identity | undefined;
  login: () => void;
  isLoggingIn: boolean;
}

function BlasterViewScreen({
  navigate,
  actor,
  actorFetching,
}: BlasterViewScreenProps) {
  const [blasterName, setBlasterName] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [orders, setOrders] = useState<OrderWithAmounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [driverNamesMap, setDriverNamesMap] = useState<Record<string, string>>(
    {},
  );
  const [vehicleNamesMap, setVehicleNamesMap] = useState<
    Record<string, string>
  >({});

  const handleSearch = async () => {
    setError("");

    if (!blasterName.trim()) {
      setError("Blaster name is required.");
      return;
    }

    if (!actor || actorFetching) {
      setError("Connecting to network. Please wait...");
      return;
    }

    setLoading(true);
    setSearched(false);
    try {
      const allOwa = await actor.getAllOrdersWithAmounts();
      const filtered = allOwa.filter((owa) => {
        const nameMatch =
          owa.order.blaster.toLowerCase() === blasterName.trim().toLowerCase();
        const dateMatch = searchDate ? owa.order.date === searchDate : true;
        return nameMatch && dateMatch;
      });
      setOrders(filtered);
      setSearched(true);
      const dnMap: Record<string, string> = {};
      const vnMap: Record<string, string> = {};
      for (const owa of filtered) {
        if (owa.driverName) {
          dnMap[String(owa.order.id)] = owa.driverName;
        }
        if (owa.vehicleNumber) {
          vnMap[String(owa.order.id)] = owa.vehicleNumber;
        }
      }
      setDriverNamesMap(dnMap);
      setVehicleNamesMap(vnMap);
    } catch {
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen">
      <h2 className="screen-title">Blaster Order View</h2>

      <input
        className="form-input"
        placeholder="Blaster Name (Required)"
        value={blasterName}
        onChange={(e) => setBlasterName(e.target.value)}
        data-ocid="blaster.search_input"
      />
      <input
        className="form-input"
        type="date"
        value={searchDate}
        onChange={(e) => setSearchDate(e.target.value)}
        data-ocid="blaster.date_input"
      />

      {error && (
        <div className="error-msg" data-ocid="blaster.error_state">
          {error}
        </div>
      )}

      <button
        type="button"
        className="btn-primary mt-2 flex items-center justify-center gap-2"
        onClick={handleSearch}
        disabled={loading || actorFetching}
        data-ocid="blaster.primary_button"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        Search
      </button>

      <button
        type="button"
        className="btn-primary btn-secondary"
        onClick={() => navigate("home")}
        data-ocid="blaster.cancel_button"
      >
        <span className="flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </span>
      </button>

      {loading && (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      )}

      {searched && !loading && orders.length === 0 && (
        <div className="empty-state" data-ocid="blaster.empty_state">
          <div className="empty-state-icon">📋</div>
          <p>No orders found for this blaster.</p>
        </div>
      )}

      {!loading &&
        orders.map((owa, idx) => (
          <OrderCard
            key={String(owa.order.id)}
            order={owa.order}
            index={idx + 1}
            viewerRole="blaster"
            driverNamesMap={driverNamesMap}
            vehicleNamesMap={vehicleNamesMap}
          />
        ))}
    </div>
  );
}

// ─── Driver Login Screen ──────────────────────────────────────────────────────

function DriverLoginScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (password === DRIVER_PASSWORD) {
      navigate("driverView");
    } else {
      setError("Wrong Password");
    }
  };

  return (
    <div className="screen">
      <h2 className="screen-title">Driver Login</h2>

      <div className="order-card">
        <div className="flex items-center gap-2 mb-4">
          <Truck className="h-5 w-5" style={{ color: "oklch(var(--navy))" }} />
          <span
            className="font-bold text-sm"
            style={{
              fontFamily: "Cabinet Grotesk, sans-serif",
              color: "oklch(var(--navy))",
            }}
          >
            Driver Authentication
          </span>
        </div>

        <input
          className="form-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          data-ocid="driver.input"
        />

        {error && (
          <div className="error-msg" data-ocid="driver.error_state">
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-primary mt-3"
        onClick={handleLogin}
        data-ocid="driver.primary_button"
      >
        Login
      </button>
      <button
        type="button"
        className="btn-primary btn-secondary"
        onClick={() => navigate("home")}
        data-ocid="driver.cancel_button"
      >
        <span className="flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </span>
      </button>
    </div>
  );
}

// ─── Driver View Screen ───────────────────────────────────────────────────────

function DriverViewScreen({ navigate, actor }: ActorProps) {
  const [filterDate, setFilterDate] = useState("");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<bigint | null>(null);
  const [error, setError] = useState("");
  const [pendingAcceptId, setPendingAcceptId] = useState<bigint | null>(null);
  const [driverNameInput, setDriverNameInput] = useState("");
  const [driverNameError, setDriverNameError] = useState("");
  const [driverNamesMap, setDriverNamesMap] = useState<Record<string, string>>(
    {},
  );
  const [vehicleNamesMap, setVehicleNamesMap] = useState<
    Record<string, string>
  >({});

  const fetchOrders = useCallback(
    async (date: string) => {
      if (!actor) {
        setError("Network not ready. Please refresh and try again.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const allWithAmounts = await actor.getAllOrdersWithAmounts();
        const filtered = allWithAmounts.filter(
          (owa) => owa.order.date === date,
        );
        setAllOrders(filtered.map((owa) => owa.order));
        // Build driver names map from embedded driverName field
        const driverDnMap: Record<string, string> = {};
        for (const owa of filtered) {
          if (owa.driverName) {
            driverDnMap[String(owa.order.id)] = owa.driverName;
          }
        }
        setDriverNamesMap(driverDnMap);
        // Build vehicle numbers map
        const driverVnMap: Record<string, string> = {};
        for (const owa of filtered) {
          if (owa.vehicleNumber) {
            driverVnMap[String(owa.order.id)] = owa.vehicleNumber;
          }
        }
        setVehicleNamesMap(driverVnMap);
      } catch {
        setError("Failed to load orders. Please try again.");
        setAllOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [actor],
  );

  // Derived filtered orders — no useEffect needed
  const orders = allOrders.filter((o) => {
    return (
      o.status === OrderStatus.approved ||
      o.status === OrderStatus.accepted ||
      o.status === OrderStatus.billDone ||
      o.status === OrderStatus.delivered
    );
  });

  const handleAcceptClick = (orderId: bigint) => {
    setPendingAcceptId(orderId);
    setDriverNameInput("");
    setDriverNameError("");
  };

  const handleDriverNameConfirm = async (orderId: bigint) => {
    if (!driverNameInput.trim()) {
      setDriverNameError("Driver name is required.");
      return;
    }
    if (!actor) return;
    setActioningId(orderId);
    try {
      await actor.acceptOrderWithDriver(orderId, driverNameInput.trim());
      toast.success("Order accepted.");
      setPendingAcceptId(null);
      setDriverNameInput("");
      await fetchOrders(filterDate);
    } catch {
      toast.error("Failed to accept order.");
    } finally {
      setActioningId(null);
    }
  };

  const handleDelivered = async (orderId: bigint) => {
    if (!actor) return;
    setActioningId(orderId);
    try {
      await actor.updateOrderStatus(orderId, OrderStatus.delivered);
      toast.success("Order marked as delivered.");
      await fetchOrders(filterDate);
    } catch {
      toast.error("Failed to update order.");
    } finally {
      setActioningId(null);
    }
  };

  const handleFilter = () => {
    if (!filterDate) {
      setError("Please select a date to filter orders.");
      return;
    }
    setError("");
    fetchOrders(filterDate);
  };

  // Show connecting spinner only while actorFetching and not yet timed out
  if (!actor) {
    return (
      <div className="screen">
        <h2 className="screen-title">Driver Orders</h2>
        <div
          className="order-card text-center mt-4"
          data-ocid="driver.loading_state"
        >
          <Loader2
            className="h-8 w-8 animate-spin mx-auto mb-3"
            style={{ color: "oklch(var(--navy))" }}
          />
          <p
            className="text-sm"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Connecting to network...
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-secondary mt-4 flex items-center justify-center gap-2"
          onClick={() => navigate("home")}
          data-ocid="driver.cancel_button"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2 className="screen-title">Driver Orders</h2>

      <div className="flex gap-2 items-center">
        <input
          className="form-input flex-1"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          data-ocid="driver.date_input"
        />
        <button
          type="button"
          className="btn-primary btn-sm"
          style={{ width: "auto", whiteSpace: "nowrap" }}
          onClick={handleFilter}
          disabled={loading}
          data-ocid="driver.secondary_button"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin inline" />
          ) : (
            <Filter className="h-3 w-3 inline" />
          )}{" "}
          Filter
        </button>
      </div>

      {error && (
        <div className="error-msg mt-2" data-ocid="driver.error_state">
          {error}
        </div>
      )}

      {loading && (
        <div data-ocid="driver.loading_state">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && allOrders.length === 0 && !error && filterDate && (
        <div className="empty-state" data-ocid="driver.empty_state">
          <div className="empty-state-icon">🚛</div>
          <p>No approved orders for this date.</p>
        </div>
      )}

      {!loading && !filterDate && allOrders.length === 0 && (
        <div className="empty-state" data-ocid="driver.empty_state">
          <div className="empty-state-icon">📅</div>
          <p>Select a date and press Filter to view orders.</p>
        </div>
      )}

      {!loading &&
        orders.map((order, idx) => (
          <OrderCard
            key={String(order.id)}
            order={order}
            index={idx + 1}
            viewerRole="driver"
            isActioning={actioningId === order.id}
            driverNamesMap={driverNamesMap}
            vehicleNamesMap={vehicleNamesMap}
            showDriverNameInput={pendingAcceptId === order.id}
            driverNameValue={
              pendingAcceptId === order.id ? driverNameInput : ""
            }
            onDriverNameChange={(v) => setDriverNameInput(v)}
            onDriverNameConfirm={() => handleDriverNameConfirm(order.id)}
            driverNameError={
              pendingAcceptId === order.id ? driverNameError : ""
            }
            onAccept={() => handleAcceptClick(order.id)}
            onDelivered={() => handleDelivered(order.id)}
          />
        ))}

      <button
        type="button"
        className="btn-primary btn-secondary mt-4 flex items-center justify-center gap-2"
        onClick={() => navigate("home")}
        data-ocid="driver.cancel_button"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );
}

// ─── Manager Login Screen ─────────────────────────────────────────────────────

function ManagerLoginScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (password === MANAGER_PASSWORD) {
      navigate("managerView");
    } else {
      setError("Wrong Password");
    }
  };

  return (
    <div className="screen">
      <h2 className="screen-title">Manager Login</h2>

      <div className="order-card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck
            className="h-5 w-5"
            style={{ color: "oklch(var(--navy))" }}
          />
          <span
            className="font-bold text-sm"
            style={{
              fontFamily: "Cabinet Grotesk, sans-serif",
              color: "oklch(var(--navy))",
            }}
          >
            Manager Authentication
          </span>
        </div>

        <input
          className="form-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          data-ocid="manager.input"
        />

        {error && (
          <div className="error-msg" data-ocid="manager.error_state">
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-primary mt-3"
        onClick={handleLogin}
        data-ocid="manager.primary_button"
      >
        Login
      </button>
      <button
        type="button"
        className="btn-primary btn-secondary"
        onClick={() => navigate("home")}
        data-ocid="manager.cancel_button"
      >
        <span className="flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </span>
      </button>
    </div>
  );
}

// ─── Manager View Screen ──────────────────────────────────────────────────────

function ManagerViewScreen({ navigate, actor }: ActorProps) {
  const [filterDate, setFilterDate] = useState("");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<bigint | null>(null);
  const [editableItems, setEditableItems] = useState<
    Record<string, Record<string, EditableItemState>>
  >({});
  const [error, setError] = useState("");
  const [driverNamesMap, setDriverNamesMap] = useState<Record<string, string>>(
    {},
  );
  const [vehicleNamesMap, setVehicleNamesMap] = useState<
    Record<string, string>
  >({});
  const [pendingApproveId, setPendingApproveId] = useState<bigint | null>(null);
  const [vehicleInput, setVehicleInput] = useState("");
  const [vehicleError, setVehicleError] = useState("");

  const fetchOrders = useCallback(
    async (date: string) => {
      if (!actor) {
        setError("Network not ready. Please refresh and try again.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const all = await actor.getAllOrdersWithAmounts();
        const filtered = all.filter((owa) => owa.order.date === date);
        setAllOrders(filtered.map((owa) => owa.order));

        // Initialize editable items for all orders (with amounts from separate map)
        const initial: Record<string, Record<string, EditableItemState>> = {};
        for (const owa of filtered) {
          const o = owa.order;
          const amountsMap: Record<string, string> = {};
          for (const ia of owa.amounts) {
            amountsMap[ia.name] = ia.amount;
          }
          const itemMap: Record<string, EditableItemState> = {};
          for (const item of o.items) {
            itemMap[item.name] = {
              qty: item.qty,
              name: item.name,
              amount: amountsMap[item.name] ?? "",
            };
          }
          initial[String(o.id)] = itemMap;
        }
        setEditableItems(initial);
        // Build driver names map from order data (driverName included in response)
        const dnMap: Record<string, string> = {};
        for (const owa of filtered) {
          if (owa.driverName) {
            dnMap[String(owa.order.id)] = owa.driverName;
          }
        }
        setDriverNamesMap(dnMap);
        // Build vehicle numbers map
        const managerVnMap: Record<string, string> = {};
        for (const owa of filtered) {
          if (owa.vehicleNumber) {
            managerVnMap[String(owa.order.id)] = owa.vehicleNumber;
          }
        }
        setVehicleNamesMap(managerVnMap);
      } catch {
        setError("Failed to load orders. Please try again.");
        setAllOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [actor],
  );

  // Derived orders — already filtered by date in fetchOrders
  const orders = allOrders;

  const handleItemChange = (
    orderId: string,
    originalName: string,
    field: "name" | "qty" | "amount",
    value: string,
  ) => {
    setEditableItems((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] ?? {}),
        [originalName]: {
          ...(prev[orderId]?.[originalName] ?? { name: originalName, qty: "" }),
          [field]: value,
        },
      },
    }));
  };

  const handleApproveClick = (order: Order) => {
    setPendingApproveId(order.id);
    setVehicleInput("");
    setVehicleError("");
  };

  const handleVehicleConfirm = async (order: Order) => {
    if (!vehicleInput.trim()) {
      setVehicleError("Vehicle number is required.");
      return;
    }
    if (!actor) return;
    const oid = String(order.id);
    setActioningId(order.id);
    try {
      const updatedItems: OrderItem[] = order.items.map((item) => ({
        name: editableItems[oid]?.[item.name]?.name ?? item.name,
        qty: editableItems[oid]?.[item.name]?.qty ?? item.qty,
      }));
      const updatedAmounts: ItemAmount[] = order.items.map((item) => ({
        name: editableItems[oid]?.[item.name]?.name ?? item.name,
        amount: editableItems[oid]?.[item.name]?.amount ?? "",
      }));
      await actor.updateOrderItems(order.id, updatedItems);
      await actor.updateItemAmounts(order.id, updatedAmounts);
      await actor.approveOrderWithVehicle(order.id, vehicleInput.trim());
      toast.success("Order approved.");
      setPendingApproveId(null);
      setVehicleInput("");
      await fetchOrders(filterDate);
    } catch {
      toast.error("Failed to approve order.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (orderId: bigint) => {
    if (!actor) return;
    setActioningId(orderId);
    try {
      await actor.updateOrderStatus(orderId, OrderStatus.rejected);
      toast.success("Order rejected.");
      await fetchOrders(filterDate);
    } catch {
      toast.error("Failed to reject order.");
    } finally {
      setActioningId(null);
    }
  };

  const handleSaveItems = async (order: Order) => {
    if (!actor) return;
    const oid = String(order.id);
    setActioningId(order.id);
    try {
      const updatedItems: OrderItem[] = order.items.map((item) => ({
        name: editableItems[oid]?.[item.name]?.name ?? item.name,
        qty: editableItems[oid]?.[item.name]?.qty ?? item.qty,
      }));
      const updatedAmounts: ItemAmount[] = order.items.map((item) => ({
        name: editableItems[oid]?.[item.name]?.name ?? item.name,
        amount: editableItems[oid]?.[item.name]?.amount ?? "",
      }));
      await actor.updateOrderItems(order.id, updatedItems);
      await actor.updateItemAmounts(order.id, updatedAmounts);
      toast.success("Items updated.");
      await fetchOrders(filterDate);
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setActioningId(null);
    }
  };

  const handleFilter = () => {
    if (!filterDate) {
      setError("Please select a date to filter orders.");
      return;
    }
    setError("");
    fetchOrders(filterDate);
  };

  // Show connecting spinner while actor is loading
  if (!actor) {
    return (
      <div className="screen">
        <h2 className="screen-title">Manager Approval</h2>
        <div
          className="order-card text-center mt-4"
          data-ocid="manager.loading_state"
        >
          <Loader2
            className="h-8 w-8 animate-spin mx-auto mb-3"
            style={{ color: "oklch(var(--navy))" }}
          />
          <p
            className="text-sm"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Connecting to network...
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-secondary mt-4 flex items-center justify-center gap-2"
          onClick={() => navigate("home")}
          data-ocid="manager.cancel_button"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2 className="screen-title">Manager Approval</h2>

      <div className="flex gap-2 items-center">
        <input
          className="form-input flex-1"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          data-ocid="manager.date_input"
        />
        <button
          type="button"
          className="btn-primary btn-sm"
          style={{ width: "auto", whiteSpace: "nowrap" }}
          onClick={handleFilter}
          disabled={loading}
          data-ocid="manager.secondary_button"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin inline" />
          ) : (
            <Filter className="h-3 w-3 inline" />
          )}{" "}
          Filter
        </button>
      </div>

      {error && (
        <div className="error-msg mt-2" data-ocid="manager.error_state">
          {error}
        </div>
      )}

      {loading && (
        <div data-ocid="manager.loading_state">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && allOrders.length === 0 && !error && filterDate && (
        <div className="empty-state" data-ocid="manager.empty_state">
          <div className="empty-state-icon">📊</div>
          <p>No orders for this date.</p>
        </div>
      )}

      {!loading && !filterDate && allOrders.length === 0 && (
        <div className="empty-state" data-ocid="manager.empty_state">
          <div className="empty-state-icon">📅</div>
          <p>Select a date and press Filter to view orders.</p>
        </div>
      )}

      {!loading &&
        orders.map((order, idx) => (
          <OrderCard
            key={String(order.id)}
            order={order}
            index={idx + 1}
            viewerRole="manager"
            editableItems={editableItems[String(order.id)]}
            onItemChange={(originalName, field, value) =>
              handleItemChange(String(order.id), originalName, field, value)
            }
            isActioning={actioningId === order.id}
            onApprove={() => handleApproveClick(order)}
            onReject={() => handleReject(order.id)}
            onSaveItems={() => handleSaveItems(order)}
            driverNamesMap={driverNamesMap}
            vehicleNamesMap={vehicleNamesMap}
            showVehicleInput={pendingApproveId === order.id}
            vehicleValue={pendingApproveId === order.id ? vehicleInput : ""}
            onVehicleChange={(v) => {
              setVehicleInput(v);
              setVehicleError("");
            }}
            onVehicleConfirm={() => handleVehicleConfirm(order)}
            vehicleError={pendingApproveId === order.id ? vehicleError : ""}
          />
        ))}

      <button
        type="button"
        className="btn-primary btn-secondary mt-4 flex items-center justify-center gap-2"
        onClick={() => navigate("home")}
        data-ocid="manager.cancel_button"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );
}

// ─── Office Login Screen ──────────────────────────────────────────────────────

function OfficeLoginScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (password === OFFICE_PASSWORD) {
      navigate("officeView");
    } else {
      setError("Wrong Password");
    }
  };

  return (
    <div className="screen">
      <h2 className="screen-title">Office Login</h2>

      <div className="order-card">
        <div className="flex items-center gap-2 mb-4">
          <Building2
            className="h-5 w-5"
            style={{ color: "oklch(var(--navy))" }}
          />
          <span
            className="font-bold text-sm"
            style={{
              fontFamily: "Cabinet Grotesk, sans-serif",
              color: "oklch(var(--navy))",
            }}
          >
            Office Authentication
          </span>
        </div>

        <input
          className="form-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          data-ocid="office.input"
        />

        {error && (
          <div className="error-msg" data-ocid="office.error_state">
            {error}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-primary mt-3"
        onClick={handleLogin}
        data-ocid="office.primary_button"
      >
        Login
      </button>
      <button
        type="button"
        className="btn-primary btn-secondary"
        onClick={() => navigate("home")}
        data-ocid="office.cancel_button"
      >
        <span className="flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </span>
      </button>
    </div>
  );
}

// ─── Office View Screen ───────────────────────────────────────────────────────

function OfficeViewScreen({ navigate, actor }: ActorProps) {
  const [filterDate, setFilterDate] = useState("");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [officeAmounts, setOfficeAmounts] = useState<
    Record<string, Record<string, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<bigint | null>(null);
  const [error, setError] = useState("");
  const [driverNamesMap, setDriverNamesMap] = useState<Record<string, string>>(
    {},
  );
  const [vehicleNamesMap, setVehicleNamesMap] = useState<
    Record<string, string>
  >({});

  const fetchOrders = useCallback(
    async (date: string) => {
      if (!actor) {
        setError("Network not ready. Please refresh and try again.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const all = await actor.getAllOrdersWithAmounts();
        const filtered = all.filter((owa) => owa.order.date === date);
        setAllOrders(filtered.map((owa) => owa.order));
        // Store amounts for display in office panel
        const amts: Record<string, Record<string, string>> = {};
        for (const owa of filtered) {
          const m: Record<string, string> = {};
          for (const ia of owa.amounts) {
            m[ia.name] = ia.amount;
          }
          amts[String(owa.order.id)] = m;
        }
        setOfficeAmounts(amts);
        // Build driver names map from order data (driverName included in response)
        const officeDnMap: Record<string, string> = {};
        const officeVnMap: Record<string, string> = {};
        for (const owa of filtered) {
          if (owa.driverName) {
            officeDnMap[String(owa.order.id)] = owa.driverName;
          }
          if (owa.vehicleNumber) {
            officeVnMap[String(owa.order.id)] = owa.vehicleNumber;
          }
        }
        setDriverNamesMap(officeDnMap);
        setVehicleNamesMap(officeVnMap);
      } catch {
        setError("Failed to load orders. Please try again.");
        setAllOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [actor],
  );

  // Show only orders that the manager has touched (approved and beyond), plus billDone
  const orders = allOrders.filter(
    (o) =>
      o.status === OrderStatus.approved ||
      o.status === OrderStatus.accepted ||
      o.status === OrderStatus.delivered ||
      o.status === OrderStatus.billDone,
  );

  const handleBillDone = async (orderId: bigint) => {
    if (!actor) return;
    setActioningId(orderId);
    try {
      await actor.updateOrderStatus(orderId, OrderStatus.billDone);
      toast.success("Bill marked as done.");
      await fetchOrders(filterDate);
    } catch {
      toast.error("Failed to update bill status.");
    } finally {
      setActioningId(null);
    }
  };

  const handleFilter = () => {
    if (!filterDate) {
      setError("Please select a date to filter orders.");
      return;
    }
    setError("");
    fetchOrders(filterDate);
  };

  // Show connecting spinner while actor is loading
  if (!actor) {
    return (
      <div className="screen">
        <h2 className="screen-title">Office Panel</h2>
        <div
          className="order-card text-center mt-4"
          data-ocid="office.loading_state"
        >
          <Loader2
            className="h-8 w-8 animate-spin mx-auto mb-3"
            style={{ color: "oklch(var(--navy))" }}
          />
          <p
            className="text-sm"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Connecting to network...
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-secondary mt-4 flex items-center justify-center gap-2"
          onClick={() => navigate("home")}
          data-ocid="office.cancel_button"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <h2 className="screen-title">Office Panel</h2>

      <div className="flex gap-2 items-center">
        <input
          className="form-input flex-1"
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          data-ocid="office.date_input"
        />
        <button
          type="button"
          className="btn-primary btn-sm"
          style={{ width: "auto", whiteSpace: "nowrap" }}
          onClick={handleFilter}
          disabled={loading}
          data-ocid="office.secondary_button"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin inline" />
          ) : (
            <Filter className="h-3 w-3 inline" />
          )}{" "}
          Filter
        </button>
      </div>

      {error && (
        <div className="error-msg mt-2" data-ocid="office.error_state">
          {error}
        </div>
      )}

      {loading && (
        <div data-ocid="office.loading_state">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && allOrders.length === 0 && !error && filterDate && (
        <div className="empty-state" data-ocid="office.empty_state">
          <div className="empty-state-icon">🏢</div>
          <p>No manager-approved orders for this date.</p>
        </div>
      )}

      {!loading && !filterDate && allOrders.length === 0 && (
        <div className="empty-state" data-ocid="office.empty_state">
          <div className="empty-state-icon">📅</div>
          <p>Select a date and press Filter to view orders.</p>
        </div>
      )}

      {!loading &&
        orders.map((order, idx) => (
          <OrderCard
            key={String(order.id)}
            order={order}
            index={idx + 1}
            viewerRole="office"
            orderAmountsMap={officeAmounts[String(order.id)] ?? {}}
            isActioning={actioningId === order.id}
            onBillDone={() => handleBillDone(order.id)}
            driverNamesMap={driverNamesMap}
            vehicleNamesMap={vehicleNamesMap}
          />
        ))}

      <button
        type="button"
        className="btn-primary btn-secondary mt-4 flex items-center justify-center gap-2"
        onClick={() => navigate("home")}
        data-ocid="office.cancel_button"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </div>
  );
}
