import { Toaster } from "@/components/ui/sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Filter,
  Loader2,
  LogIn,
  LogOut,
  Package2,
  Search,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { OrderStatus } from "./backend";
import type { Order, OrderItem } from "./backend.d";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

// ─── Constants ────────────────────────────────────────────────────────────────

const DRIVER_PASSWORD = "driver123";
const MANAGER_PASSWORD = "manager123";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "home"
  | "indent"
  | "confirm"
  | "blasterView"
  | "driverLogin"
  | "driverView"
  | "managerLogin"
  | "managerView";

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
  const cls = `badge-${status.toLowerCase()}`;
  return (
    <span
      className={`${cls} inline-block px-3 py-0.5 rounded-full text-xs font-bold my-1`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
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

interface OrderCardProps {
  order: Order;
  index: number;
  viewerRole?: "manager" | "driver" | "blaster";
  editableItems?: Record<string, string>;
  onItemChange?: (name: string, qty: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onAccept?: () => void;
  onDelivered?: () => void;
  isActioning?: boolean;
}

function OrderCard({
  order,
  index,
  viewerRole,
  editableItems,
  onItemChange,
  onApprove,
  onReject,
  onAccept,
  onDelivered,
  isActioning,
}: OrderCardProps) {
  const cardOcid = `${viewerRole ?? "blaster"}.item.${index}`;

  return (
    <div className="order-card" data-ocid={cardOcid}>
      <div className="order-card-field">
        <span className="order-card-label">Quarry:</span>
        <span className="order-card-value">{order.quarry}</span>
      </div>
      <div className="order-card-field">
        <span className="order-card-label">Address:</span>
        <span className="order-card-value">{order.address}</span>
      </div>
      <div className="order-card-field">
        <span className="order-card-label">Blaster:</span>
        <span className="order-card-value">{order.blaster}</span>
      </div>
      <div className="order-card-field">
        <span className="order-card-label">Lease No:</span>
        <span className="order-card-value">{order.lease}</span>
      </div>
      <div className="order-card-field">
        <span className="order-card-label">DGMS:</span>
        <span className="order-card-value">{order.dgms}</span>
      </div>
      <div className="order-card-field">
        <span className="order-card-label">Date:</span>
        <span className="order-card-value">{order.date}</span>
      </div>
      <StatusBadge status={order.status} />

      <table className="indent-table mt-2">
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingLeft: 6 }}>Item</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.name}>
              <td style={{ textAlign: "left", paddingLeft: 6 }}>{item.name}</td>
              <td>
                {viewerRole === "manager" &&
                order.status === OrderStatus.pending &&
                editableItems &&
                onItemChange ? (
                  <input
                    value={editableItems[item.name] ?? item.qty}
                    onChange={(e) => onItemChange(item.name, e.target.value)}
                    style={{ width: 60 }}
                  />
                ) : (
                  item.qty || "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Manager actions for Pending */}
      {viewerRole === "manager" && order.status === OrderStatus.pending && (
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
      )}

      {/* Driver actions */}
      {viewerRole === "driver" && order.status === OrderStatus.approved && (
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
      )}
      {viewerRole === "driver" && order.status === OrderStatus.accepted && (
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

function IndentScreen({
  navigate,
  actor,
  actorFetching,
  identity,
  login,
  isLoggingIn,
}: IndentScreenProps) {
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

    if (!actor || actorFetching) {
      setError("Connecting to network. Please wait...");
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
        msg.toLowerCase().includes("per blaster")
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

  // Not logged in — show login prompt
  if (!identity) {
    return (
      <div className="screen">
        <h2 className="screen-title">Explosive Indent</h2>

        <div className="order-card text-center mt-4">
          <LogIn
            className="h-10 w-10 mx-auto mb-3"
            style={{ color: "oklch(var(--navy))" }}
          />
          <p
            className="text-sm mb-1 font-semibold"
            style={{ color: "oklch(var(--navy-deep))" }}
          >
            Login required to submit
          </p>
          <p
            className="text-xs mb-4"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Please login to submit an explosive indent order.
          </p>
          <button
            type="button"
            className="btn-primary flex items-center justify-center gap-2"
            onClick={login}
            disabled={isLoggingIn}
            data-ocid="indent.primary_button"
          >
            {isLoggingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>
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

  // Logged in — show full form
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
        disabled={loading || actorFetching}
        data-ocid="indent.submit_button"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
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
  identity,
  login,
  isLoggingIn,
}: BlasterViewScreenProps) {
  const [blasterName, setBlasterName] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);

  const handleSearch = async () => {
    setError("");
    setLoginRequired(false);

    if (!blasterName.trim()) {
      setError("Blaster name is required.");
      return;
    }

    // If not logged in, show login prompt
    if (!identity) {
      setLoginRequired(true);
      return;
    }

    if (!actor || actorFetching) {
      setError("Connecting to network. Please wait...");
      return;
    }

    setLoading(true);
    setSearched(false);
    try {
      const results = await actor.getOrdersByBlaster(
        blasterName.trim(),
        searchDate,
      );
      setOrders(results);
      setSearched(true);
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

      {loginRequired && (
        <div className="order-card mt-3">
          <p
            className="text-sm font-semibold mb-2"
            style={{ color: "oklch(var(--navy-deep))" }}
          >
            Please login first
          </p>
          <p
            className="text-xs mb-3"
            style={{ color: "oklch(var(--muted-foreground))" }}
          >
            Login is required to search orders.
          </p>
          <button
            type="button"
            className="btn-primary flex items-center justify-center gap-2"
            onClick={login}
            disabled={isLoggingIn}
            data-ocid="blaster.primary_button"
          >
            {isLoggingIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {isLoggingIn ? "Logging in..." : "Login"}
          </button>
        </div>
      )}

      {!loginRequired && (
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
      )}

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
        orders.map((order, idx) => (
          <OrderCard
            key={String(order.id)}
            order={order}
            index={idx + 1}
            viewerRole="blaster"
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

function DriverViewScreen({ navigate, actor, actorFetching }: ActorProps) {
  const [filterDate, setFilterDate] = useState("");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<bigint | null>(null);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    if (!actor || actorFetching) return;
    setLoading(true);
    setError("");
    try {
      const all = await actor.getAllOrders();
      setAllOrders(all);
    } catch {
      setError("Failed to load orders. Please try again.");
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [actor, actorFetching]);

  // Load whenever actor becomes available
  useEffect(() => {
    if (actor && !actorFetching) {
      fetchOrders();
    }
  }, [actor, actorFetching, fetchOrders]);

  // Derived filtered orders — no useEffect needed
  const orders = allOrders.filter((o) => {
    const statusOk =
      o.status === OrderStatus.approved ||
      o.status === OrderStatus.accepted ||
      o.status === OrderStatus.delivered;
    const dateOk = filterDate ? o.date === filterDate : true;
    return statusOk && dateOk;
  });

  const handleAccept = async (orderId: bigint) => {
    if (!actor) return;
    setActioningId(orderId);
    try {
      await actor.updateOrderStatus(orderId, OrderStatus.accepted);
      toast.success("Order accepted.");
      await fetchOrders();
    } catch {
      toast.error("Failed to update order.");
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
      await fetchOrders();
    } catch {
      toast.error("Failed to update order.");
    } finally {
      setActioningId(null);
    }
  };

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
          onClick={fetchOrders}
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

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state" data-ocid="driver.empty_state">
          <div className="empty-state-icon">🚛</div>
          <p>No approved orders to display.</p>
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
            onAccept={() => handleAccept(order.id)}
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

function ManagerViewScreen({ navigate, actor, actorFetching }: ActorProps) {
  const [filterDate, setFilterDate] = useState("");
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<bigint | null>(null);
  const [editableItems, setEditableItems] = useState<
    Record<string, Record<string, string>>
  >({});
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    if (!actor || actorFetching) return;
    setLoading(true);
    setError("");
    try {
      const all = await actor.getAllOrders();
      setAllOrders(all);

      // Initialize editable items for pending orders
      const initial: Record<string, Record<string, string>> = {};
      for (const o of all) {
        if (o.status === OrderStatus.pending) {
          const itemMap: Record<string, string> = {};
          for (const item of o.items) {
            itemMap[item.name] = item.qty;
          }
          initial[String(o.id)] = itemMap;
        }
      }
      setEditableItems(initial);
    } catch {
      setError("Failed to load orders. Please try again.");
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }, [actor, actorFetching]);

  // Load whenever actor becomes available
  useEffect(() => {
    if (actor && !actorFetching) {
      fetchOrders();
    }
  }, [actor, actorFetching, fetchOrders]);

  // Derived filtered orders — no useEffect needed
  const orders = filterDate
    ? allOrders.filter((o) => o.date === filterDate)
    : allOrders;

  const handleItemChange = (orderId: string, name: string, qty: string) => {
    setEditableItems((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] ?? {}), [name]: qty },
    }));
  };

  const handleApprove = async (order: Order) => {
    if (!actor) return;
    const oid = String(order.id);
    setActioningId(order.id);
    try {
      const updatedItems: OrderItem[] = order.items.map((item) => ({
        name: item.name,
        qty: editableItems[oid]?.[item.name] ?? item.qty,
      }));
      await actor.updateOrderItems(order.id, updatedItems);
      await actor.updateOrderStatus(order.id, OrderStatus.approved);
      toast.success("Order approved.");
      await fetchOrders();
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
      await fetchOrders();
    } catch {
      toast.error("Failed to reject order.");
    } finally {
      setActioningId(null);
    }
  };

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
          onClick={fetchOrders}
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

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state" data-ocid="manager.empty_state">
          <div className="empty-state-icon">📊</div>
          <p>No orders to display.</p>
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
            onItemChange={(name, qty) =>
              handleItemChange(String(order.id), name, qty)
            }
            isActioning={actioningId === order.id}
            onApprove={() => handleApprove(order)}
            onReject={() => handleReject(order.id)}
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
